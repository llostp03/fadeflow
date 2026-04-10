"use strict";

const fs = require("fs");
const path = require("path");

const bcrypt = require("bcryptjs");
const cors = require("cors");
const Database = require("better-sqlite3");
const dotenv = require("dotenv");
const express = require("express");
const Stripe = require("stripe");

dotenv.config();

// Confirms runtime sees Render’s env (RENDER=true) and PORT; helps debug missing secrets.
console.log(
  "[startup] RENDER=%s PORT=%s",
  process.env.RENDER ?? "(unset)",
  process.env.PORT ?? "(unset)"
);

function resolvePort() {
  const raw = process.env.PORT;
  if (raw === undefined || raw === "") {
    return 4242;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    console.error("Invalid PORT environment variable:", raw);
    process.exit(1);
  }
  return n;
}

const PORT = resolvePort();
const stripeSecretKey =
  typeof process.env.STRIPE_SECRET_KEY === "string"
    ? process.env.STRIPE_SECRET_KEY.trim()
    : "";

if (!stripeSecretKey.startsWith("sk_")) {
  const stripeEnvNames = Object.keys(process.env).filter((k) => /stripe/i.test(k));
  console.error(
    "STRIPE_SECRET_KEY is missing, empty, or not a Stripe secret key (must start with sk_test_ or sk_live_)."
  );
  if (stripeEnvNames.length) {
    console.error("Found env var names containing 'stripe' (values hidden):", stripeEnvNames.join(", "));
  } else {
    console.error("No environment variable name contains 'stripe' — STRIPE_SECRET_KEY is not set in Render.");
  }
  console.error(
    "Render: open THIS web service → Environment → Add STRIPE_SECRET_KEY = full Secret key from Stripe (Developers → API keys). Save, then Manual Deploy."
  );
  console.error("If STRIPE_SECRET_KEY is already listed but the value box is empty, paste the key and save.");
  console.error("Local: stripe-backend/.env with STRIPE_SECRET_KEY=sk_test_...");
  process.exit(1);
}

let stripe;
try {
  stripe = new Stripe(stripeSecretKey);
} catch (err) {
  console.error("Stripe client failed to initialize:", err instanceof Error ? err.message : err);
  process.exit(1);
}

/** Monorepo root (fadeflow/) — same layout as Python `main.py` + `templates/`. */
const REPO_ROOT = path.join(__dirname, "..", "..");
const DB_PATH = path.join(REPO_ROOT, "bookings.db");
const INDEX_HTML_PATH = path.join(REPO_ROOT, "templates", "index.html");
/** Static signup page shipped with stripe-backend (see `public/index.html`). */
const SIGNUP_HTML_PATH = path.join(__dirname, "..", "public", "index.html");

const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    service TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    payment_intent_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
`);

let cachedIndexHtml = null;
function loadIndexTemplate() {
  if (cachedIndexHtml === null) {
    cachedIndexHtml = fs.readFileSync(INDEX_HTML_PATH, "utf8");
  }
  return cachedIndexHtml;
}

/**
 * Serve the marketing page (Jinja placeholders replaced). Optionally scroll to #book
 * (used when the user opens /book, /login, etc.).
 */
function sendMarketingPage(res, { scrollToBook = false } = {}) {
  let html = loadIndexTemplate().replace(/\{\{\s*title\s*\}\}/g, "ClipFlow");
  if (scrollToBook) {
    html = html.replace(
      "</body>",
      '<script>document.addEventListener("DOMContentLoaded",function(){location.hash="book";});</script></body>'
    );
  }
  res.type("html").send(html);
}

const app = express();

// Mobile apps and web clients sending JSON
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health check for deploy platforms
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// --- Marketing HTML (Render runs this Node app, not Python FastAPI) ---
app.get("/", (_req, res) => {
  sendMarketingPage(res, { scrollToBook: false });
});

app.get("/signup", (_req, res) => {
  res.sendFile(SIGNUP_HTML_PATH);
});

app.get("/signup/", (_req, res) => {
  res.sendFile(SIGNUP_HTML_PATH);
});

/**
 * POST /signup
 * Body: { email: string, password: string, name?: string }
 * Creates a user with a bcrypt password hash (never store plain text).
 */
app.post("/signup", (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName = typeof body.name === "string" ? body.name.trim() : "";

  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return res.status(422).json({ detail: "A valid email is required." });
  }
  if (password.length < 8) {
    return res.status(422).json({ detail: "Password must be at least 8 characters." });
  }

  const email = emailRaw.toLowerCase();

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const createdAt = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO users (email, password_hash, name, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(email, passwordHash, displayName, createdAt);

    const id = Number(result.lastInsertRowid);
    return res.status(201).json({
      user: {
        id,
        email,
        name: displayName,
        created_at: createdAt,
      },
    });
  } catch (err) {
    const code = err && typeof err === "object" ? err.code : undefined;
    const msg = err instanceof Error ? err.message : String(err);
    if (code === "SQLITE_CONSTRAINT_UNIQUE" || msg.includes("UNIQUE constraint failed")) {
      return res.status(409).json({ detail: "An account with this email already exists." });
    }
    return res.status(500).json({ detail: msg || "Could not create account." });
  }
});

/**
 * POST /login
 * Body: { email: string, password: string }
 * Looks up `users` (SQLite) and verifies bcrypt hash. Returns a placeholder token (replace with JWT for production).
 */
app.post("/login", (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const cleanEmail = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const cleanPassword = String(body.password ?? "");

    if (!cleanEmail || !cleanPassword) {
      return res.status(422).json({ detail: "Email and password are required." });
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(422).json({ detail: "Enter a valid email address." });
    }

    const user = db
      .prepare(
        `SELECT id, email, name, password_hash, created_at
         FROM users WHERE email = ? LIMIT 1`
      )
      .get(cleanEmail);

    if (!user) {
      return res.status(401).json({ detail: "Invalid email or password." });
    }

    const passwordMatches = bcrypt.compareSync(cleanPassword, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ detail: "Invalid email or password." });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
      },
      token: `demo-token-${user.id}`,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ detail: "Unable to log in right now." });
  }
});

const BOOK_PATHS = [
  "/book",
  "/book/",
  "/booking",
  "/booking/",
  "/bookappointment",
  "/bookappointment/",
  "/login",
  "/login/",
];

app.get(BOOK_PATHS, (_req, res) => {
  sendMarketingPage(res, { scrollToBook: true });
});

/**
 * POST /create-payment-intent
 *
 * Flowfade (legacy): { amount, currency, customerName, metadata? }
 * ClipFlow app (matches Python API): { name, service?, date?, time? } — fixed $25.00 USD
 */
app.post("/create-payment-intent", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};

  try {
    // ClipFlow mobile — same contract as fadeflow/main.py
    if (
      typeof body.name === "string" &&
      body.name.trim().length > 0 &&
      typeof body.amount !== "number"
    ) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 2500,
        currency: "usd",
        payment_method_types: ["card"],
        metadata: {
          customer_name: body.name.trim(),
          service: typeof body.service === "string" ? body.service : "",
          date: typeof body.date === "string" ? body.date : "",
          time: typeof body.time === "string" ? body.time : "",
        },
      });
      const clientSecret = paymentIntent.client_secret;
      if (!clientSecret) {
        return res.status(500).json({ detail: "Stripe did not return a client secret." });
      }
      return res.json({ clientSecret });
    }

    // Flowfade legacy
    const { amount, currency, customerName, metadata } = body;
    const currencyNorm =
      typeof currency === "string" ? currency.trim().toLowerCase() : "";

    if (!currencyNorm || !/^[a-z]{3}$/.test(currencyNorm)) {
      return res.status(400).json({
        error: "currency must be a 3-letter ISO code (e.g. usd).",
      });
    }

    if (typeof amount !== "number" || !Number.isInteger(amount)) {
      return res.status(400).json({
        error: "amount must be an integer (smallest currency unit, e.g. cents for USD).",
      });
    }

    if (amount < 50) {
      return res.status(400).json({
        error: "amount must be at least 50 (e.g. 50 cents for USD).",
      });
    }

    if (typeof customerName !== "string" || !customerName.trim()) {
      return res.status(400).json({
        error: "customerName is required (non-empty string).",
      });
    }

    const extraMetadata =
      metadata && typeof metadata === "object" && !Array.isArray(metadata)
        ? metadata
        : {};

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currencyNorm,
      automatic_payment_methods: { enabled: true },
      description: `Flowfade — ${customerName.trim()}`,
      metadata: {
        customer_name: customerName.trim(),
        ...extraMetadata,
      },
    });

    const clientSecret = paymentIntent.client_secret;
    if (!clientSecret) {
      return res.status(500).json({ error: "PaymentIntent missing client secret." });
    }

    return res.json({ clientSecret });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (typeof body.name === "string" && body.name.trim() && typeof body.amount !== "number") {
      return res.status(400).json({ detail: message });
    }
    return res.status(500).json({ error: message });
  }
});

function confirmationPayload(bookingId, name, service, date, time, paymentStatus) {
  return {
    confirmation: {
      booking_id: bookingId,
      name,
      service,
      date,
      time,
      payment_status: paymentStatus,
      message: "Your ClipFlow booking is confirmed. We'll see you soon.",
    },
  };
}

/**
 * POST /bookings — ClipFlow app finalizes after PaymentSheet (matches Python API).
 */
app.post("/bookings", async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const service = typeof body.service === "string" ? body.service : "";
  const date = typeof body.date === "string" ? body.date : "";
  const time = typeof body.time === "string" ? body.time : "";
  const paymentIntentId =
    typeof body.payment_intent_id === "string" ? body.payment_intent_id.trim() : "";

  if (!name || !paymentIntentId) {
    return res.status(422).json({ detail: "name and payment_intent_id are required." });
  }

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== "succeeded") {
      return res.status(400).json({
        detail: `Payment is not complete (status: ${intent.status}).`,
      });
    }

    const paymentStatus = intent.status;

    const existing = db
      .prepare(
        `SELECT id, name, service, date, time, payment_status
         FROM bookings WHERE payment_intent_id = ?`
      )
      .get(paymentIntentId);

    if (existing) {
      return res.json(
        confirmationPayload(
          existing.id,
          existing.name,
          existing.service,
          existing.date,
          existing.time,
          existing.payment_status
        )
      );
    }

    const createdAt = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO bookings
          (name, service, date, time, payment_status, payment_intent_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(name, service, date, time, paymentStatus, paymentIntentId, createdAt);

    const bookingId = Number(result.lastInsertRowid);
    return res.json(confirmationPayload(bookingId, name, service, date, time, paymentStatus));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(400).json({ detail: message });
  }
});

app.use((_req, res) => {
  res.status(404).json({ detail: "Not found" });
});

// Render sets PORT (e.g. 10000). Must bind 0.0.0.0 or the port scan will time out.
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `ClipFlow / Stripe API listening on http://0.0.0.0:${PORT} (PORT from env: ${process.env.PORT ?? "unset, using 4242"})`
  );
});

server.on("error", (err) => {
  console.error("Failed to bind HTTP server:", err.message);
  process.exit(1);
});

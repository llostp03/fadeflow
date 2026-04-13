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
const BARBER_LOGIN_HTML_PATH = path.join(REPO_ROOT, "templates", "barber-login.html");
/** Static signup page shipped with stripe-backend (see `public/index.html`). */
const SIGNUP_HTML_PATH = path.join(__dirname, "..", "public", "index.html");

const db = new Database(DB_PATH);

function ensureUserSubscriptionColumns() {
  const cols = db.prepare("PRAGMA table_info(users)").all();
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("subscription_status")) {
    db.exec("ALTER TABLE users ADD COLUMN subscription_status TEXT NOT NULL DEFAULT ''");
  }
  if (!names.has("stripe_customer_id")) {
    db.exec("ALTER TABLE users ADD COLUMN stripe_customer_id TEXT");
  }
  if (!names.has("stripe_subscription_id")) {
    db.exec("ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT");
  }
}

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

ensureUserSubscriptionColumns();

let cachedIndexHtml = null;
function loadIndexTemplate() {
  if (cachedIndexHtml === null) {
    cachedIndexHtml = fs.readFileSync(INDEX_HTML_PATH, "utf8");
  }
  return cachedIndexHtml;
}

/**
 * Serve the marketing page (Jinja placeholders replaced). Optionally scroll to #book
 * (used when the user opens /book, /login, etc.). GET /barber-login serves barber-login.html.
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

/**
 * Resolves user id from `Authorization: Bearer demo-token-<id>` (same token shape as POST /login).
 */
function userIdFromDemoBearer(req) {
  const raw = req.headers.authorization;
  if (typeof raw !== "string") {
    return null;
  }
  const parts = raw.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }
  const m = /^demo-token-(\d+)$/.exec(parts[1]);
  if (!m) {
    return null;
  }
  const id = Number.parseInt(m[1], 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function customerIdFromStripeObject(customerField) {
  if (typeof customerField === "string") {
    return customerField;
  }
  if (
    customerField &&
    typeof customerField === "object" &&
    typeof customerField.id === "string"
  ) {
    return customerField.id;
  }
  return null;
}

/** Trim and strip wrapping quotes from Render / .env pastes so `price_...` validates correctly. */
function normalizeStripePriceId(raw) {
  if (typeof raw !== "string") {
    return "";
  }
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * Map Stripe Subscription.status to our users.subscription_status (paywall unlocks only on "active").
 */
function stripeSubscriptionStatusToAppStatus(stripeStatus) {
  if (stripeStatus === "active" || stripeStatus === "trialing") {
    return "active";
  }
  if (stripeStatus === "past_due" || stripeStatus === "unpaid") {
    return "past_due";
  }
  if (stripeStatus === "canceled" || stripeStatus === "incomplete_expired") {
    return "canceled";
  }
  if (stripeStatus === "incomplete") {
    return "incomplete";
  }
  if (stripeStatus === "paused") {
    return "paused";
  }
  return "canceled";
}

/**
 * @returns {number} rows updated
 */
function updateUsersSubscriptionByStripeCustomerId(customerId, status) {
  if (!customerId || typeof customerId !== "string") {
    return 0;
  }
  try {
    return db
      .prepare(`UPDATE users SET subscription_status = ? WHERE stripe_customer_id = ?`)
      .run(status, customerId).changes;
  } catch (e) {
    console.error("[stripe-webhook] update by customer:", e instanceof Error ? e.message : e);
    return 0;
  }
}

/**
 * @returns {number} rows updated
 */
function updateUsersSubscriptionByStripeSubscriptionId(subscriptionId, status) {
  if (!subscriptionId || typeof subscriptionId !== "string") {
    return 0;
  }
  try {
    return db
      .prepare(`UPDATE users SET subscription_status = ? WHERE stripe_subscription_id = ?`)
      .run(status, subscriptionId).changes;
  } catch (e) {
    console.error("[stripe-webhook] update by subscription:", e instanceof Error ? e.message : e);
    return 0;
  }
}

/**
 * Stripe sends metadata values as strings; test fixtures (e.g. `stripe trigger`) often omit metadata.
 * We also set client_reference_id on session create so the id is still on the session object.
 */
function userIdFromCheckoutSession(session) {
  const meta =
    session.metadata && typeof session.metadata.userId === "string"
      ? session.metadata.userId.trim()
      : "";
  const ref =
    typeof session.client_reference_id === "string" ? session.client_reference_id.trim() : "";
  const raw = meta || ref;
  return raw === "" ? Number.NaN : Number(raw);
}

/**
 * Shared by webhook and POST /confirm-paid-checkout. Idempotent: safe to call again.
 * @returns {{ ok: boolean, reason: string, userId: number, changes: number }}
 */
function applyCheckoutSessionUnlock(session) {
  if (session.mode === "payment") {
    const ps = session.payment_status;
    if (ps !== "paid" && ps !== "no_payment_required") {
      return { ok: false, reason: "payment_not_complete", userId: Number.NaN, changes: 0 };
    }
  }

  const userId = userIdFromCheckoutSession(session);
  console.log("RESOLVED USER ID (numeric from metadata/ref):", userId);

  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false, reason: "bad_metadata", userId, changes: 0 };
  }

  let user = null;
  try {
    user = db
      .prepare(
        `SELECT id, email, COALESCE(subscription_status, '') AS subscription_status FROM users WHERE id = ?`
      )
      .get(userId);
    console.log("USER LOOKUP RESULT:", user);
  } catch (e) {
    console.error("[checkout-unlock] user lookup error:", e instanceof Error ? e.message : e);
  }

  try {
    const result = db
      .prepare(`UPDATE users SET subscription_status = 'active' WHERE id = ?`)
      .run(userId);
    const changes = result.changes;
    return {
      ok: changes > 0,
      reason: changes > 0 ? "ok" : "no_row",
      userId,
      changes,
    };
  } catch (e) {
    console.error("[checkout-unlock] DB update failed:", e instanceof Error ? e.message : e);
    return { ok: false, reason: "db_error", userId, changes: 0 };
  }
}

function handleCheckoutSessionCompleted(session) {
  console.log("WEBHOOK CHECKOUT SESSION ID:", session.id);
  console.log("WEBHOOK SESSION METADATA:", session.metadata);
  console.log("WEBHOOK RESOLVED USER ID:", session.metadata?.userId);

  const result = applyCheckoutSessionUnlock(session);
  if (result.reason === "payment_not_complete") {
    return;
  }
  if (result.reason === "bad_metadata" || !Number.isInteger(result.userId) || result.userId < 1) {
    console.warn(
      "[stripe-webhook] checkout.session.completed: skip — need metadata.userId or client_reference_id (session id:",
      session.id,
      "metadata:",
      session.metadata,
      "client_reference_id:",
      session.client_reference_id,
      ")"
    );
    return;
  }
  if (result.ok) {
    console.log("[stripe-webhook] checkout.session.completed → active user id", result.userId);
  } else if (result.reason === "no_row") {
    console.warn(
      "[stripe-webhook] checkout.session.completed: no users row updated for id",
      result.userId,
      "(wrong id or different DB than login)"
    );
  }
}

function handleInvoicePaid(invoice) {
  if (!invoice.subscription) {
    return;
  }
  const customerId = customerIdFromStripeObject(invoice.customer);
  const n = updateUsersSubscriptionByStripeCustomerId(customerId, "active");
  if (n > 0) {
    console.log("[stripe-webhook] invoice.paid → active customer", customerId);
  }
}

function handleInvoicePaymentFailed(invoice) {
  if (!invoice.subscription) {
    return;
  }
  const customerId = customerIdFromStripeObject(invoice.customer);
  const n = updateUsersSubscriptionByStripeCustomerId(customerId, "past_due");
  if (n > 0) {
    console.log("[stripe-webhook] invoice.payment_failed → past_due customer", customerId);
  }
}

function handleSubscriptionUpdated(subscription) {
  const customerId = customerIdFromStripeObject(subscription.customer);
  const appStatus = stripeSubscriptionStatusToAppStatus(subscription.status);
  const subscriptionId = typeof subscription.id === "string" ? subscription.id : null;

  let changes = updateUsersSubscriptionByStripeCustomerId(customerId, appStatus);
  if (changes === 0 && subscriptionId) {
    changes = updateUsersSubscriptionByStripeSubscriptionId(subscriptionId, appStatus);
  }
  if (changes > 0) {
    console.log(
      "[stripe-webhook] customer.subscription.updated",
      subscription.status,
      "→",
      appStatus,
      "customer",
      customerId || "(unknown)"
    );
  }
}

function handleSubscriptionDeleted(subscription) {
  const customerId = customerIdFromStripeObject(subscription.customer);
  const subscriptionId = typeof subscription.id === "string" ? subscription.id : null;

  let changes = updateUsersSubscriptionByStripeCustomerId(customerId, "canceled");
  if (changes === 0 && subscriptionId) {
    changes = updateUsersSubscriptionByStripeSubscriptionId(subscriptionId, "canceled");
  }
  if (changes > 0) {
    console.log("[stripe-webhook] customer.subscription.deleted → canceled", customerId || subscriptionId);
  }
}

const app = express();

app.use(cors());

/**
 * POST /stripe-webhook
 * ClipFlow Pro access (`users.*` Stripe columns + subscription_status). Does not handle
 * PaymentIntent success for one-time bookings — those are confirmed via `/bookings` + PI retrieve.
 *
 * Raw body + signature verification. Register these events in Stripe Dashboard:
 *   checkout.session.completed     — sets subscription_status active from session.metadata.userId (payment mode checks payment_status)
 *   invoice.paid                   — subscription renewals → active (ignored for payment-only Checkout)
 *   invoice.payment_failed         — failed renewal → past_due (subscriptions only)
 *   customer.subscription.updated  — subscription status changes
 *   customer.subscription.deleted  — subscription removed → canceled
 */
app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const webhookSecret =
      typeof process.env.STRIPE_WEBHOOK_SECRET === "string"
        ? process.env.STRIPE_WEBHOOK_SECRET.trim()
        : "";
    if (!webhookSecret) {
      console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set — refusing webhook");
      return res.status(503).send("Webhook not configured");
    }

    const sig = req.headers["stripe-signature"];
    if (typeof sig !== "string") {
      return res.status(400).send("Missing stripe-signature header");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[stripe-webhook] Signature verification failed:", msg);
      return res.status(400).send(`Webhook Error: ${msg}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
          handleCheckoutSessionCompleted(event.data.object);
          break;
        case "invoice.paid":
          handleInvoicePaid(event.data.object);
          break;
        case "invoice.payment_failed":
          handleInvoicePaymentFailed(event.data.object);
          break;
        case "customer.subscription.updated":
          handleSubscriptionUpdated(event.data.object);
          break;
        case "customer.subscription.deleted":
          handleSubscriptionDeleted(event.data.object);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error("[stripe-webhook] handler error:", e instanceof Error ? e.message : e);
    }

    return res.json({ received: true });
  }
);

// Mobile apps and web clients sending JSON (must be after webhook raw body route)
app.use(express.json({ limit: "1mb" }));

/**
 * Map `/api/me` → `/me`, `/api/login` → `/login`, etc. Some clients set API base to `https://host/api`.
 * Must run before route definitions below.
 */
app.use((req, res, next) => {
  const u = req.url || "/";
  if (u === "/api") {
    req.url = "/";
  } else if (u.startsWith("/api?")) {
    req.url = `/${u.slice(4)}`;
  } else if (u.startsWith("/api/")) {
    req.url = `/${u.slice(5)}`;
  }
  next();
});

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

app.get("/barber-login", (_req, res) => {
  res.sendFile(BARBER_LOGIN_HTML_PATH);
});

app.get("/barber-login/", (_req, res) => {
  res.sendFile(BARBER_LOGIN_HTML_PATH);
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
    console.log("[POST /login] hit", {
      contentType: req.headers["content-type"],
      hasEmail: typeof body.email === "string" && body.email.length > 0,
      hasPassword: typeof body.password === "string" && body.password.length > 0,
    });

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
        `SELECT id, email, name, password_hash, created_at,
                COALESCE(subscription_status, '') AS subscription_status
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
        subscription_status: user.subscription_status || "",
      },
      token: `demo-token-${user.id}`,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ detail: "Unable to log in right now." });
  }
});

/**
 * GET /me — full current user (refresh after Stripe Checkout / webhook).
 * Authorization: Bearer demo-token-<userId> (token from POST /login).
 */
app.get("/me", (req, res) => {
  const userId = userIdFromDemoBearer(req);
  if (userId == null) {
    return res.status(401).json({
      detail:
        "Missing or invalid Authorization. Send: Authorization: Bearer demo-token-<userId> (from POST /login).",
    });
  }
  const row = db
    .prepare(
      `SELECT id, email, name, created_at,
              COALESCE(subscription_status, '') AS subscription_status
       FROM users WHERE id = ?`
    )
    .get(userId);
  if (!row) {
    return res.status(404).json({ detail: "User not found." });
  }
  return res.json({
    user: {
      id: row.id,
      email: row.email,
      name: row.name,
      created_at: row.created_at,
      subscription_status: row.subscription_status || "",
    },
  });
});

/**
 * GET /subscription-status — subscription flag only (same Authorization as GET /me).
 */
app.get("/subscription-status", (req, res) => {
  const userId = userIdFromDemoBearer(req);
  if (userId == null) {
    return res.status(401).json({
      detail:
        "Missing or invalid Authorization. Send: Authorization: Bearer demo-token-<userId> (from POST /login).",
    });
  }
  const row = db
    .prepare(`SELECT COALESCE(subscription_status, '') AS subscription_status FROM users WHERE id = ?`)
    .get(userId);
  if (!row) {
    return res.status(404).json({ detail: "User not found." });
  }
  return res.json({ subscription_status: row.subscription_status || "" });
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
 * One-time client booking payments (mobile Payment Sheet). Separate product from subscription:
 * do not mix this flow with ClipFlow Pro / Checkout / users.subscription_status.
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
 * Writes the `bookings` table only; unrelated to subscription billing or `users.subscription_status`.
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

/**
 * POST /create-checkout-session
 *
 * ClipFlow Pro (barber app access): Stripe Checkout in **payment** mode (one-time charge) +
 * `/stripe-webhook` `checkout.session.completed` sets `users.subscription_status` to active.
 * Keep this separate from one-time booking PaymentIntents + `/bookings`.
 *
 * Stripe Checkout (hosted page) — not the mobile Payment Sheet (`/create-payment-intent`).
 *
 * Body (optional): { userId?: string } — legacy mobile client. Prefer
 * `Authorization: Bearer demo-token-<userId>` (same as GET /me); user id is stored on session metadata.
 *
 * Env:
 *   STRIPE_PRICE_ID — required: a **one-time** Price ID (price_xxx)
 *   CHECKOUT_SUCCESS_URL — base URL (no trailing slash); we append `?session_id={CHECKOUT_SESSION_ID}` (or `&` if it already has `?`)
 *   CHECKOUT_CANCEL_URL — default http://localhost:3000/cancel if unset
 *
 * If CHECKOUT_SUCCESS_URL already contains `{CHECKOUT_SESSION_ID}`, it is used as-is.
 */
app.post("/create-checkout-session", async (req, res) => {
  const priceId = normalizeStripePriceId(process.env.STRIPE_PRICE_ID);

  if (!priceId || !priceId.startsWith("price_")) {
    return res.status(500).json({
      detail:
        "CHECKOUT DEBUG: STRIPE_PRICE_ID missing or not a price id after trim (paste from Stripe with no spaces/quotes; must start with price_).",
    });
  }

  const baseSuccess =
    (typeof process.env.CHECKOUT_SUCCESS_URL === "string" && process.env.CHECKOUT_SUCCESS_URL.trim()) ||
    "http://localhost:3000/success";
  const successUrl = baseSuccess.includes("{CHECKOUT_SESSION_ID}")
    ? baseSuccess
    : `${baseSuccess}${baseSuccess.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl =
    (typeof process.env.CHECKOUT_CANCEL_URL === "string" && process.env.CHECKOUT_CANCEL_URL.trim()) ||
    "http://localhost:3000/cancel";

  const body = req.body && typeof req.body === "object" ? req.body : {};
  let userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const uidFromAuth = userIdFromDemoBearer(req);
  if (uidFromAuth != null) {
    userId = String(uidFromAuth);
  }
  const user = { id: userId };

  if (!userId || String(userId).trim() === "") {
    return res.status(400).json({
      detail:
        "Missing user id for checkout. Send Authorization: Bearer demo-token-<yourUserId> (same as after login) or JSON body { userId: \"<id>\" }.",
    });
  }

  console.log("CHECKOUT USER ID:", user?.id);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: String(user.id),
      metadata: {
        // Webhook reads this to set users.subscription_status (must match logged-in user).
        userId: String(user.id),
      },
    });

    console.log("CHECKOUT SESSION ID:", session.id);
    console.log("CHECKOUT SESSION METADATA SENT:", session.metadata);

    if (!session.url) {
      return res.status(500).json({ detail: "Stripe did not return a checkout URL." });
    }
    return res.status(200).json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[create-checkout-session]", err);
    return res.status(400).json({ detail: message });
  }
});

/**
 * POST /confirm-paid-checkout
 * Fallback when Stripe webhooks are missing or failing: retrieves the Checkout Session from Stripe,
 * verifies payment + metadata.userId matches the logged-in user, then runs the same DB unlock as the webhook.
 * Body: { sessionId: "cs_..." } — `session_id` query param from success redirect.
 */
app.post("/confirm-paid-checkout", async (req, res) => {
  const uid = userIdFromDemoBearer(req);
  if (uid == null) {
    return res.status(401).json({
      detail: "Missing or invalid Authorization. Send: Bearer demo-token-<userId> (from POST /login).",
    });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  if (!sessionId.startsWith("cs_")) {
    return res.status(400).json({
      detail: "Invalid sessionId (expected Stripe Checkout Session id starting with cs_).",
    });
  }

  try {
    console.log("CONFIRM SESSION ID:", sessionId);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("STRIPE SESSION METADATA:", session.metadata);
    console.log("RESOLVED USER ID:", session.metadata?.userId);

    const checkoutUserId = userIdFromCheckoutSession(session);
    if (!Number.isInteger(checkoutUserId) || checkoutUserId < 1) {
      return res.status(400).json({
        detail: "Checkout session has no user id (metadata.userId / client_reference_id).",
      });
    }
    if (checkoutUserId !== uid) {
      return res.status(403).json({
        detail:
          "This payment is tied to a different account. Sign in as the same user who started checkout.",
      });
    }

    const result = applyCheckoutSessionUnlock(session);
    if (result.reason === "payment_not_complete") {
      return res.status(400).json({
        detail: "Payment is not complete yet.",
        payment_status: session.payment_status,
      });
    }
    if (result.reason === "bad_metadata") {
      return res.status(400).json({ detail: "Checkout session is missing user metadata." });
    }
    if (result.reason === "no_row") {
      return res.status(400).json({
        detail: "No user row matches this account id. Your API database may differ from where you signed up.",
      });
    }
    if (!result.ok && result.reason === "db_error") {
      return res.status(500).json({ detail: "Database error while unlocking account." });
    }

    console.log("[confirm-paid-checkout] unlocked user id", uid, "session", sessionId);
    return res.json({ ok: true, subscription_status: "active" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[confirm-paid-checkout]", err);
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

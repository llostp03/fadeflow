"use strict";

const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const Stripe = require("stripe");

dotenv.config();

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

const app = express();

// Mobile apps and web clients sending JSON
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health check for deploy platforms
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/**
 * POST /create-payment-intent
 * Body: { amount: number (cents), currency: string, customerName: string, metadata?: object }
 * Response: { clientSecret: string }
 */
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency, customerName, metadata } = req.body;
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

    // Stripe minimum is typically US$0.50 for USD; keep a conservative floor
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
    return res.status(500).json({ error: message });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Render sets PORT (e.g. 10000). Must bind 0.0.0.0 or the port scan will time out.
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Stripe API listening on http://0.0.0.0:${PORT} (PORT from env: ${process.env.PORT ?? "unset, using 4242"})`);
});

server.on("error", (err) => {
  console.error("Failed to bind HTTP server:", err.message);
  process.exit(1);
});

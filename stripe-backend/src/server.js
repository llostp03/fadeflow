"use strict";

const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const Stripe = require("stripe");

dotenv.config();

const PORT = Number(process.env.PORT) || 4242;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey || !stripeSecretKey.startsWith("sk_")) {
  console.error(
    "Missing or invalid STRIPE_SECRET_KEY. Copy .env.example to .env and add your Stripe secret key."
  );
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);

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

// Render and other hosts route traffic to the container; bind all interfaces.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Stripe API listening on port ${PORT}`);
});

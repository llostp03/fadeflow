import { API_BASE_URL } from "../constants/config";

/**
 * Calls your backend to create a Stripe PaymentIntent and returns the
 * client secret for PaymentSheet. Expected server contract:
 *
 * POST /create-payment-intent
 * Body: { amount, currency, customerName, metadata? }
 * Response: { clientSecret: string } or { client_secret: string }
 */
export async function fetchPaymentIntentClientSecret({
  amountCents,
  currency = "usd",
  customerName,
  metadata = {},
}) {
  const url = `${API_BASE_URL.replace(/\/$/, "")}/create-payment-intent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountCents,
      currency,
      customerName,
      metadata,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data.message ||
      data.error?.message ||
      (typeof data.error === "string" ? data.error : null) ||
      `Could not start payment (${res.status})`;
    throw new Error(msg);
  }

  const secret = data.clientSecret || data.client_secret;
  if (!secret || typeof secret !== "string") {
    throw new Error("Server response missing client secret.");
  }

  return secret;
}

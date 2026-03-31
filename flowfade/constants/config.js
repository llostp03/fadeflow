/** Replace with your live URLs and contact info before production. */
export const WEBSITE_URL = "https://YOURSITE.com";
export const BOOKING_URL = "https://YOURSITE.com/book";

/**
 * API base URL (no trailing slash). Must implement POST /create-payment-intent
 * returning { clientSecret } or { client_secret } for a PaymentIntent.
 * Use EXPO_PUBLIC_API_BASE_URL in a .env file for local/dev overrides.
 */
export const API_BASE_URL =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_BASE_URL) || "https://YOURAPI.com";

export const SHOP_PHONE = "+15555551234";
export const SHOP_EMAIL = "book@flowfade.com";

/**
 * Stripe publishable key (pk_test_… or pk_live_…).
 * Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in a root `.env` file (gitignored).
 */
export const STRIPE_PUBLISHABLE_KEY =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY) ||
  "pk_test_your_key_here";

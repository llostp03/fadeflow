/** Same normalization as clipflow-app `App.js` paywall check. */
function normalizedSubscription(status: unknown): string {
  return String(status ?? "").trim().toLowerCase();
}

/** `subscription_status === "active"` after trim + lowercase. */
export function isActiveSubscription(status: unknown): boolean {
  return normalizedSubscription(status) === "active";
}

/**
 * `subscription_status !== "active"` after trim + lowercase — show upgrade / paywall.
 * Pass `user.subscription_status` or `needsPaywall(me?.subscription_status)` for `/me` (AuthUser).
 */
export function needsPaywall(subscriptionStatus: unknown): boolean {
  const sub = String(subscriptionStatus ?? "").trim().toLowerCase();
  return sub !== "active";
}

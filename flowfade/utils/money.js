/** Format integer cents as USD for display (e.g. 4500 → $45.00). */
export function formatUsdFromCents(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

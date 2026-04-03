/**
 * Stripe publishable key (safe to ship in the app — it only identifies your Stripe account).
 *
 * Add a `.env` file next to `package.json`:
 *   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxx
 *
 * Restart Expo (`npx expo start`) after changing `.env`.
 */
export const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

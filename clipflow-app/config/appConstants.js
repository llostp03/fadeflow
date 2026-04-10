/**
 * Edit these values for your business and app store listing.
 * Optional: set EXPO_PUBLIC_API_BASE, EXPO_PUBLIC_PUBLIC_WEB_URL, EXPO_PUBLIC_PRIVACY_POLICY_URL in .env
 */

/**
 * Backend API (no trailing slash).
 * Replace tutorial placeholders like https://your-api-url with your real host, e.g.
 * https://fadeflow.onrender.com — paths such as /signup and /book serve the marketing site.
 */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://fadeflow.onrender.com';

/** Marketing site shown in the Home tab WebView */
export const PUBLIC_WEB_URL =
  process.env.EXPO_PUBLIC_PUBLIC_WEB_URL || 'https://fadeflow.onrender.com';

/**
 * Contact & social — use real values before App Store / Play submission.
 * PHONE_E164: international format with country code, e.g. +12125551234 (for tel: links)
 */
export const CONTACT = {
  BUSINESS_NAME: 'ClipFlow',
  PHONE_E164: '+14439746847',
  PHONE_DISPLAY: '(443) 974-6847',
  EMAIL: 'llostp03@icloud.com',
  INSTAGRAM_URL: 'https://instagram.com/lloyd.staple4',
  INSTAGRAM_SUBTITLE: 'Follow for cuts & updates',
};

/**
 * Privacy policy (REQUIRED for app store). If set, Privacy Policy screen shows
 * "Open in browser" to this URL (e.g. full policy on your site).
 */
export const PRIVACY_POLICY_WEB_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? null;

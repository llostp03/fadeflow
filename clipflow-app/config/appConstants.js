/**
 * Edit these values for your business and app store listing.
 * Optional: set EXPO_PUBLIC_API_BASE, EXPO_PUBLIC_PUBLIC_WEB_URL, EXPO_PUBLIC_PRIVACY_POLICY_URL in .env
 */

/** Backend API (no trailing slash) */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ?? 'https://fadeflow.onrender.com';

/** Marketing site shown in the Home tab WebView */
export const PUBLIC_WEB_URL =
  process.env.EXPO_PUBLIC_PUBLIC_WEB_URL ?? 'https://fadeflow.onrender.com';

/**
 * Contact & social — use real values before App Store / Play submission.
 * PHONE_E164: international format with country code, e.g. +12125551234 (for tel: links)
 */
export const CONTACT = {
  BUSINESS_NAME: 'ClipFlow',
  PHONE_E164: '+10000000000',
  PHONE_DISPLAY: '(000) 000-0000',
  EMAIL: 'hello@example.com',
  INSTAGRAM_URL: 'https://www.instagram.com/',
  INSTAGRAM_SUBTITLE: 'Follow for cuts & updates',
};

/**
 * If set, Privacy Policy screen shows an "Open in browser" button to this URL
 * (e.g. full policy hosted on your site).
 */
export const PRIVACY_POLICY_WEB_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? null;

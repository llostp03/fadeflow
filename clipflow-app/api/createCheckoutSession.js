import { API_BASE } from '../config/appConstants';

/**
 * POST /create-checkout-session — ClipFlow Pro (one-time Stripe Checkout payment). Requires a real
 * account id so Stripe metadata and webhooks can update the correct `users` row.
 *
 * @param {string | number} userId — must be the logged-in user's id (`String(user.id)` at call sites)
 * @returns {Promise<string>} checkout URL
 */
export async function createSubscriptionCheckoutSession(userId) {
  const idStr = userId != null ? String(userId).trim() : '';
  if (!idStr) {
    throw new Error('userId is required for ClipFlow Pro checkout.');
  }

  const res = await fetch(`${API_BASE}/create-checkout-session`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId: idStr }),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg =
      typeof data.detail === 'string' ? data.detail : `Request failed (${res.status}).`;
    throw new Error(msg);
  }

  if (typeof data.url !== 'string' || !data.url.startsWith('http')) {
    throw new Error('No checkout URL returned.');
  }

  return data.url;
}

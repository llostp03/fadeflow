import { API_BASE } from '../config/appConstants';

/** Same prefix the API returns from POST /login. */
export function demoBearerToken(userId) {
  return `Bearer demo-token-${userId}`;
}

/**
 * GET /me — refresh full user after Checkout (webhook updates DB; app polls or focuses).
 * @param {number} userId
 * @returns {Promise<{ id: number, email: string, name: string, created_at: string, subscription_status: string }>}
 */
export async function fetchCurrentUser(userId) {
  const res = await fetch(`${API_BASE}/me`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: demoBearerToken(userId),
    },
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
  if (!data.user || typeof data.user.id !== 'number') {
    throw new Error('Invalid response from server.');
  }
  return data.user;
}

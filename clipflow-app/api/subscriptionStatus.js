import { API_BASE } from '../config/appConstants';
import { demoBearerToken } from './me';

/**
 * GET /subscription-status — same auth as GET /me.
 * @returns {Promise<string>}
 */
export async function fetchSubscriptionStatus(userId) {
  const res = await fetch(`${API_BASE}/subscription-status`, {
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
  return typeof data.subscription_status === 'string' ? data.subscription_status : '';
}

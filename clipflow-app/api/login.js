import { API_BASE } from '../config/appConstants';

/**
 * POST /login — returns { user, token } (see stripe-backend/src/server.js).
 */
export async function login({ email, password }) {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: String(email || '').trim(),
      password: String(password || ''),
    }),
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text?.slice(0, 200) || `Request failed (${response.status})` };
  }

  if (!response.ok) {
    const msg =
      (typeof data.detail === 'string' && data.detail) ||
      (typeof data.error === 'string' && data.error) ||
      `Login failed (${response.status})`;
    throw new Error(msg);
  }

  return data;
}

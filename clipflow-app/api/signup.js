import { API_BASE } from '../config/appConstants';

/**
 * POST /signup — creates a user on the fadeflow API (see stripe-backend/src/server.js).
 */
export async function signUp({ email, password, name = '' }) {
  const response = await fetch(`${API_BASE}/signup`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
      name: typeof name === 'string' ? name.trim() : '',
    }),
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      detail: text?.slice(0, 200) || `Request failed (${response.status})`,
    };
  }

  if (!response.ok) {
    const msg =
      (typeof data.detail === 'string' && data.detail) ||
      (typeof data.error === 'string' && data.error) ||
      `Signup failed (${response.status})`;
    const err = new Error(msg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

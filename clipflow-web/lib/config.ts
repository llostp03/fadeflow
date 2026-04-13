/**
 * Same host as clipflow-app `API_BASE` / `EXPO_PUBLIC_API_BASE` — no trailing slash.
 * The Render API serves `/me`, `/login` at the **root**, not under `/api`. If Vercel has
 * `NEXT_PUBLIC_API_BASE=https://….onrender.com/api`, requests would hit `/api/me` (404) unless we strip `/api` here
 * or the server aliases `/api/*` (stripe-backend does both).
 */
function normalizeApiBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed.replace(/\/api$/i, "");
}

export const API_BASE = normalizeApiBase(
  process.env.NEXT_PUBLIC_API_BASE || "https://fadeflow.onrender.com"
);

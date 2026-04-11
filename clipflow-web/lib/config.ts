/** Same host as clipflow-app `API_BASE` / `EXPO_PUBLIC_API_BASE` — no trailing slash. */
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE || "https://fadeflow.onrender.com"
).replace(/\/$/, "");

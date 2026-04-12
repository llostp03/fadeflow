import { API_BASE } from "./config";

/** Web + marketing site session key (see ClipFlowWebsite load on open). */
export const AUTH_TOKEN_STORAGE_KEY = "clipflow_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export type SignupPayload = {
  email: string;
  password: string;
  name?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: number | string;
  email: string;
  name?: string;
  subscription_status?: string;
  created_at?: string;
};

async function parseJsonSafe(res: Response) {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      detail: text || "Unexpected response from server.",
    };
  }
}

/** Prefer `detail` (Express), then `message` / `error`; include status when unknown. */
function detailFromApiResponse(data: unknown, res: Response, fallback: string): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (typeof o.detail === "string") return o.detail;
    if (typeof o.detail === "number") return String(o.detail);
    if (typeof o.message === "string") return o.message;
    if (typeof o.error === "string") return o.error;
  }
  return `${fallback} (HTTP ${res.status})`;
}

export async function signup(payload: SignupPayload) {
  const res = await fetch(`${API_BASE}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
      name: payload.name?.trim() || "",
    }),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : "Unable to create account."
    );
  }

  return data;
}

export async function login(payload: LoginPayload) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : "Unable to sign in."
    );
  }

  return data as {
    token: string;
    user: AuthUser;
  };
}

export async function getMe(token: string) {
  const res = await fetch(`${API_BASE}/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : "Unable to load account."
    );
  }

  // Backend returns `{ user: AuthUser }` (see stripe-backend GET /me).
  if (
    data &&
    typeof data === "object" &&
    "user" in data &&
    data.user &&
    typeof (data as { user: unknown }).user === "object"
  ) {
    return (data as { user: AuthUser }).user;
  }

  return data as AuthUser;
}

/**
 * POST /create-checkout-session — opens Stripe Checkout (one-time payment).
 * Sends the same Bearer token as GET /me; API resolves `userId` for Stripe metadata.
 */
export async function createCheckoutSession(token: string) {
  const res = await fetch(`${API_BASE}/create-checkout-session`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(detailFromApiResponse(data, res, "Unable to start checkout."));
  }

  return data as { url?: string };
}

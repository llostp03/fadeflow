import { API_BASE } from "./config";

/** Web + marketing site session key (see ClipFlowWebsite load on open). */
export const AUTH_TOKEN_STORAGE_KEY = "clipflow_token";

/** Last Stripe Checkout Session id (`cs_...`) — set from success URL for Refresh account / confirm-paid-checkout. */
export const CHECKOUT_SESSION_STORAGE_KEY = "clipflow_checkout_session_id";

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

/**
 * POST /confirm-paid-checkout — unlocks Pro using Stripe session id (fallback if webhooks did not run).
 * Requires the same Bearer token as checkout; session metadata must match this user.
 */
export type StudioPricingRow = {
  id: string;
  name: string;
  price: number;
  durationMins?: number;
};

export type StudioAiSettings = {
  answerClientCalls: boolean;
  manageBookings: boolean;
  clientCallHours: string;
  smsReminder: boolean;
};

/** Shop identity, Twilio number, public iCal link — saved with PATCH /studio. */
export type StudioIntegrations = {
  /** Public-facing barbershop name (AI + Twilio use this when set). */
  barbershopName: string;
  /** Up to four client-facing lines (E.164 or formatted); used in AI copy and Twilio prompts. */
  shopPhones: string[];
  twilioVoiceNumberE164: string;
  calendarIcsUrl: string;
};

export type StudioPayload = {
  pricing: StudioPricingRow[];
  ai: StudioAiSettings;
  publishedBlurb: string;
  integrations: StudioIntegrations;
  updatedAt: string | null;
};

export async function getStudio(token: string): Promise<StudioPayload> {
  const res = await fetch(`${API_BASE}/studio`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(detailFromApiResponse(data, res, "Unable to load studio."));
  }
  return data as StudioPayload;
}

export async function patchStudio(
  token: string,
  body: {
    pricing?: StudioPricingRow[];
    ai?: Partial<StudioAiSettings>;
    integrations?: Partial<StudioIntegrations>;
  }
): Promise<StudioPayload & { ok?: boolean }> {
  const res = await fetch(`${API_BASE}/studio`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(detailFromApiResponse(data, res, "Unable to save studio."));
  }
  return data as StudioPayload & { ok?: boolean };
}

export async function publishStudioAi(token: string): Promise<{
  ok?: boolean;
  publishedBlurb: string;
  updatedAt: string;
  usedOpenAI?: boolean;
}> {
  const res = await fetch(`${API_BASE}/studio/publish-ai`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(detailFromApiResponse(data, res, "Unable to publish AI copy."));
  }
  return data as { ok?: boolean; publishedBlurb: string; updatedAt: string; usedOpenAI?: boolean };
}

export type CalendarPreviewEvent = { summary: string; rawStart: string };

export async function getStudioCalendarPreview(token: string): Promise<{
  ok: boolean;
  detail?: string;
  events: CalendarPreviewEvent[];
}> {
  const res = await fetch(`${API_BASE}/studio/calendar-preview`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(detailFromApiResponse(data, res, "Unable to load calendar events."));
  }
  return data as { ok: boolean; detail?: string; events: CalendarPreviewEvent[] };
}

export async function postStudioSmsTest(
  token: string,
  payload: { toE164: string; body?: string }
): Promise<{ ok: boolean; sid?: string }> {
  const res = await fetch(`${API_BASE}/studio/sms-test`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(detailFromApiResponse(data, res, "Unable to send SMS."));
  }
  return data as { ok: boolean; sid?: string };
}

export async function confirmPaidCheckout(token: string, sessionId: string) {
  const res = await fetch(`${API_BASE}/confirm-paid-checkout`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId }),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(detailFromApiResponse(data, res, "Unable to confirm payment."));
  }

  return data as { ok?: boolean; subscription_status?: string };
}

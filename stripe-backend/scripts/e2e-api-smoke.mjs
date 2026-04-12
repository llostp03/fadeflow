/**
 * API smoke test against ClipFlow Stripe backend (no browser).
 * Usage: API_BASE=https://fadeflow.onrender.com node scripts/e2e-api-smoke.mjs
 *
 * Steps: GET /health → POST /signup → POST /login → GET /me → POST /create-checkout-session
 * Optional: POST /confirm-paid-checkout with session id from checkout URL (expects "unpaid" before paying).
 */

const API_BASE = (process.env.API_BASE || "https://fadeflow.onrender.com").replace(/\/$/, "");

function randEmail() {
  return `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function jfetch(path, { method = "GET", headers = {}, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(typeof data.detail === "string" ? data.detail : `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function sessionIdFromStripeCheckoutUrl(url) {
  const m = /\/(cs_(?:test|live)_[a-zA-Z0-9]+)/.exec(url);
  return m ? m[1] : null;
}

async function main() {
  console.log("[e2e] API_BASE =", API_BASE);

  const health = await jfetch("/health");
  console.log("[e2e] GET /health →", health);

  const email = randEmail();
  const password = "E2eSmoke2026!Test";
  await jfetch("/signup", {
    method: "POST",
    body: { email, password, name: "E2E Smoke" },
  });
  console.log("[e2e] POST /signup → ok", email);

  const { token, user: loginUser } = await jfetch("/login", {
    method: "POST",
    body: { email, password },
  });
  console.log("[e2e] POST /login → token", String(token).slice(0, 16) + "…", "user id", loginUser?.id);

  const meWrap = await jfetch("/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const me = meWrap.user ?? meWrap;
  console.log("[e2e] GET /me → subscription_status =", JSON.stringify(me.subscription_status ?? ""));

  const checkout = await jfetch("/create-checkout-session", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!checkout.url) {
    throw new Error("create-checkout-session did not return url");
  }
  console.log("[e2e] POST /create-checkout-session → Stripe Checkout URL (open in browser to pay)");

  const cs = sessionIdFromStripeCheckoutUrl(checkout.url);
  if (cs) {
    try {
      await jfetch("/confirm-paid-checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: { sessionId: cs },
      });
      console.log("[e2e] POST /confirm-paid-checkout → unexpected success (session already paid?)");
    } catch (e) {
      const d = e.data || {};
      if (e.status === 400 && /not complete|Payment is not complete/i.test(String(d.detail || ""))) {
        console.log("[e2e] POST /confirm-paid-checkout → expected before payment:", d.detail, d.payment_status ?? "");
      } else {
        throw e;
      }
    }
  }

  console.log("[e2e] Done. Complete checkout in a browser with Stripe test card 4242424242424242, then GET /me should show subscription_status active.");
}

main().catch((err) => {
  console.error("[e2e] FAIL:", err.message);
  if (err.data) console.error(JSON.stringify(err.data, null, 2));
  process.exit(1);
});

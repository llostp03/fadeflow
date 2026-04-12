/**
 * API smoke test against ClipFlow Stripe backend (no browser for card entry).
 * Usage: API_BASE=https://fadeflow.onrender.com node scripts/e2e-api-smoke.mjs
 *        node scripts/e2e-api-smoke.mjs --no-wait
 *
 * Steps: GET /health → POST /signup → POST /login → GET /me → POST /create-checkout-session
 * Then prints Checkout URL; you pay with test card 4242… in a browser.
 * By default polls GET /me until subscription_status is active (or timeout).
 *
 * Env:
 *   WAIT_FOR_ACTIVE_MS — max wait in ms (default 180000 = 3 min)
 *   POLL_INTERVAL_MS   — delay between GET /me (default 2500)
 */

const API_BASE = (process.env.API_BASE || "https://fadeflow.onrender.com").replace(/\/$/, "");
const NO_WAIT = process.argv.includes("--no-wait");
const WAIT_FOR_ACTIVE_MS = Number(process.env.WAIT_FOR_ACTIVE_MS || 180000);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 2500);

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

function isActiveStatus(status) {
  return String(status ?? "")
    .trim()
    .toLowerCase() === "active";
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

/** Poll GET /me until subscription is active or timeout. */
async function waitForSubscriptionActive(token, { maxMs, intervalMs }) {
  const start = Date.now();
  let n = 0;
  while (Date.now() - start < maxMs) {
    n += 1;
    const meWrap = await jfetch("/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = meWrap.user ?? meWrap;
    const sub = me.subscription_status ?? "";
    console.log(`[e2e] GET /me (poll ${n}) → subscription_status = ${JSON.stringify(sub)}`);
    if (isActiveStatus(sub)) {
      return { me, polls: n };
    }
    await sleep(intervalMs);
  }
  return null;
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
  console.log("[e2e] POST /create-checkout-session → ok");

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

  console.log("");
  console.log("[e2e] >>> Open this Stripe Checkout URL in a browser (test card 4242 4242 4242 4242) <<<");
  console.log(checkout.url);
  console.log("");

  if (NO_WAIT) {
    console.log("[e2e] --no-wait: not polling GET /me. Run again with credentials or use default wait.");
    console.log("[e2e] Done.");
    return;
  }

  console.log(
    `[e2e] Waiting up to ${Math.round(WAIT_FOR_ACTIVE_MS / 1000)}s for GET /me → subscription_status "active"...`
  );

  const result = await waitForSubscriptionActive(token, {
    maxMs: WAIT_FOR_ACTIVE_MS,
    intervalMs: POLL_INTERVAL_MS,
  });

  if (!result) {
    console.error("[e2e] TIMEOUT: account still not active. Check webhooks, STRIPE_WEBHOOK_SECRET, and confirm-paid-checkout.");
    process.exit(1);
  }

  console.log(`[e2e] PASS: website account is active after checkout (${result.polls} poll(s)).`);
  console.log("[e2e] user:", JSON.stringify(result.me, null, 2));
}

main().catch((err) => {
  console.error("[e2e] FAIL:", err.message);
  if (err.data) console.error(JSON.stringify(err.data, null, 2));
  process.exit(1);
});

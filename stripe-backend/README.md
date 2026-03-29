# Flowfade Stripe backend (Express)

Small Node.js API that creates Stripe **PaymentIntents** for the Flowfade mobile app (`POST /create-payment-intent`).

## Prerequisites

- Node.js 18+
- A [Stripe](https://dashboard.stripe.com) account (test mode for local dev)

## Local setup

1. **Install dependencies**

   ```bash
   cd stripe-backend
   npm install
   ```

2. **Configure environment**

   ```bash
   copy .env.example .env
   ```

   On macOS/Linux:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:

   - `STRIPE_SECRET_KEY` — from **Stripe Dashboard → Developers → API keys → Secret key** (use `sk_test_...` for testing).
   - `PORT` — optional; default `4242` if omitted.

3. **Run the server**

   ```bash
   npm start
   ```

   Or with auto-restart on file changes (Node 18+):

   ```bash
   npm run dev
   ```

   You should see: `Stripe API listening on http://localhost:4242`.

## Test the endpoint

Replace `YOUR_SECRET` only if you paste a curl that uses a header (this example uses your env on the server only — no secret in curl).

**Request**

```bash
curl -s -X POST http://localhost:4242/create-payment-intent ^
  -H "Content-Type: application/json" ^
  -d "{\"amount\":4500,\"currency\":\"usd\",\"customerName\":\"Alex Rivera\"}"
```

**Expected response**

```json
{ "clientSecret": "pi_...._secret_...." }
```

Use that `clientSecret` in the Stripe PaymentSheet on the client.

### Request body

| Field         | Type   | Required | Notes |
|---------------|--------|----------|--------|
| `amount`      | number | Yes      | Integer in **smallest currency unit** (e.g. `4500` = $45.00 USD). Minimum `50` for USD. |
| `currency`    | string | Yes      | Lowercase ISO code, e.g. `usd`. |
| `customerName`| string | Yes      | Non-empty; stored in Stripe metadata and description. |
| `metadata`    | object | No       | Extra key/value strings merged into PaymentIntent `metadata`. |

## Point the Expo app at this API

In the Flowfade app, set **`EXPO_PUBLIC_API_BASE_URL`** to your machine’s URL (no trailing slash):

- **Android emulator:** `http://10.0.2.2:4242` (host machine’s localhost).
- **iOS simulator:** `http://localhost:4242`.
- **Physical device:** use your computer’s LAN IP, e.g. `http://192.168.1.10:4242`.

Example `.env` in the Expo app root:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:4242
```

Restart Expo after changing env vars.

**Important:** The mobile app must send **`customerName`** in the JSON body to match this API (update `api/createPaymentIntent.js` if it currently omits it).

## Deploy on Render

### Option A — Blueprint (`render.yaml` at repo root)

1. Push this repo (including **`render.yaml`**) to GitHub/GitLab.
2. In [Render](https://dashboard.render.com): **New** → **Blueprint** → connect the repo.
3. Render will create a **Web Service** with **`rootDir: stripe-backend`**.
4. In the service **Environment** tab, add **`STRIPE_SECRET_KEY`** (your `sk_test_…` or `sk_live_…`). Do not commit it.
5. After deploy, copy the service URL (e.g. `https://flowfade-stripe-api.onrender.com`).

**Health check:** Render pings **`GET /health`** — already implemented.

**Port:** Render sets **`PORT`** automatically; the server reads it.

### Option B — Manual Web Service

1. **New** → **Web Service** → connect the repo.
2. **Root Directory:** `stripe-backend`
3. **Runtime:** Node
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. **Health Check Path:** `/health`
7. **Environment:** add **`STRIPE_SECRET_KEY`**.

### Point the Expo app at Render

In **`flowfade/.env`** (no trailing slash):

```env
EXPO_PUBLIC_API_BASE_URL=https://YOUR-SERVICE-NAME.onrender.com
```

Rebuild or restart Expo so **`EXPO_PUBLIC_`** vars are picked up.

**Note:** Free web services **spin down** after idle; the first request can take ~30–60s. For production, use a **paid** instance or another host if you need always-on latency.

## Render deploy failed? Check these

1. **`STRIPE_SECRET_KEY` in the Render dashboard**  
   The server **exits on startup** if this is missing or not `sk_…`. Open your Web Service → **Environment** → add **`STRIPE_SECRET_KEY`**, then **Manual Deploy** → **Clear build cache & deploy**.

2. **Root directory (fixes `ENOENT .../src/package.json`)**  
   The error **`/opt/render/project/src/package.json`** means Render’s **Root Directory** is **`src`**.  
   - **Preferred:** set **Root Directory** to **empty** or **`stripe-backend`** (see **`render.yaml`**).  
   - **Compatibility:** the repo includes **`src/package.json`**, which forwards **`npm install`** / **`npm start`** to **`../stripe-backend`**, so deploys can succeed even if Root Directory stays **`src`**.

3. **Build / start commands**  
   **Build:** `npm install` · **Start:** `npm start`

4. **Logs**  
   In Render → **Logs** tab: look for `Missing or invalid STRIPE_SECRET_KEY` or npm errors.

5. **Health check**  
   Path **`/health`** must return 200 after the app starts (not before env is loaded).

## Production notes

- Run behind HTTPS (e.g. a reverse proxy or a host like Render, Railway, Fly.io).
- Restrict CORS to your app origins if you add a web client.
- Use a secrets manager or host env vars for `STRIPE_SECRET_KEY`; never commit `.env`.
- Use Stripe **live** keys only in production and rotate keys if leaked.

/**
 * Monorepo root postinstall: install stripe-backend deps for local dev.
 * Skip on Vercel — web builds should use Vercel Root Directory `clipflow-web` only.
 */
if (process.env.VERCEL === "1") {
  process.exit(0);
}

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const backend = path.join(__dirname, "..", "stripe-backend");
const r = spawnSync("npm", ["install"], { cwd: backend, stdio: "inherit", shell: true });
process.exit(r.status ?? 1);

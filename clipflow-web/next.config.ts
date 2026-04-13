import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Monorepo root (`fadeflow/`) — matches root `package-lock.json` so Turbopack does not warn about `clipflow-web/package-lock.json`. */
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;

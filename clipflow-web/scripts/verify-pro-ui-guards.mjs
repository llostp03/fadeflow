/**
 * Ensures we do not attach dimming (opacity-40/45) to subscriptionActive in the same cn() line.
 * Run: node scripts/verify-pro-ui-guards.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "..", "components", "ClipFlowWebsite.tsx");
const src = fs.readFileSync(file, "utf8");

const lines = src.split(/\r?\n/);
const bad = [];
lines.forEach((line, i) => {
  if (/subscriptionActive.*opacity-4[05]/.test(line) && !/!subscriptionActive/.test(line)) {
    bad.push(`Line ${i + 1}: ${line.trim()}`);
  }
  if (/subscriptionActive.*pointer-events-none/.test(line) && !/!subscriptionActive/.test(line)) {
    bad.push(`Line ${i + 1}: ${line.trim()}`);
  }
});

if (bad.length) {
  console.error("[verify-pro-ui-guards] FAIL:\n", bad.join("\n"));
  process.exit(1);
}
console.log("[verify-pro-ui-guards] OK — no active+dim on same line");

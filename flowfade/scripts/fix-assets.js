const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const assets = path.join(__dirname, "..", "assets");

async function squareIcon(file, size) {
  const p = path.join(assets, file);
  const meta = await sharp(p).metadata();
  const w = meta.width;
  const h = meta.height;
  const s = Math.min(w, h);
  const left = Math.floor((w - s) / 2);
  const top = Math.floor((h - s) / 2);
  await sharp(p).extract({ left, top, width: s, height: s }).resize(size, size).png().toFile(p + ".tmp");
  fs.renameSync(p + ".tmp", p);
  console.log(file, "->", size, "square");
}

async function splash() {
  const p = path.join(assets, "splash-icon.png");
  const W = 1242;
  const H = 2688;
  const bg = sharp({
    create: { width: W, height: H, channels: 4, background: { r: 5, g: 5, b: 8, alpha: 1 } },
  }).png();
  const inner = await sharp(p)
    .resize({ width: Math.round(W * 0.88), height: Math.round(H * 0.45), fit: "inside" })
    .toBuffer();
  const img = sharp(inner);
  const m = await img.metadata();
  const x = Math.floor((W - m.width) / 2);
  const y = Math.floor((H - m.height) / 2);
  await bg
    .composite([{ input: inner, left: x, top: y }])
    .png()
    .toFile(p + ".tmp");
  fs.renameSync(p + ".tmp", p);
  console.log("splash-icon.png ->", W, H);
}

(async () => {
  await squareIcon("icon.png", 1024);
  await squareIcon("adaptive-icon.png", 1024);
  await squareIcon("favicon.png", 64);
  await splash();
})();

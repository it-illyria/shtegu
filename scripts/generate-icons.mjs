// Rasterize public/icon.svg into the PNG app icons a PWA needs.
//   node scripts/generate-icons.mjs   (requires `sharp`)
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const svg = await readFile("public/icon.svg");

const outputs = [
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
  { file: "public/apple-touch-icon.png", size: 180 },
  { file: "public/favicon-32.png", size: 32 },
];

for (const { file, size } of outputs) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(file);
  console.log("wrote", file, `${size}x${size}`);
}

// Maskable icon: pad the artwork into the inner ~80% safe zone on a green field
// so platform circular/squircle masks don't clip the mountain.
const inner = Math.round(512 * 0.8);
const art = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#16a34a" },
})
  .composite([{ input: art, gravity: "center" }])
  .png()
  .toFile("public/icon-maskable-512.png");
console.log("wrote public/icon-maskable-512.png 512x512 (maskable)");

// favicon.ico (32px) — many browsers still request /favicon.ico
await writeFile("public/favicon.ico", await sharp(svg, { density: 384 }).resize(32, 32).png().toBuffer());
console.log("wrote public/favicon.ico");

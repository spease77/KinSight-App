import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = process.cwd();
const publicDir = join(root, "public");
const source = readFileSync(join(publicDir, "icon-source.svg"));

const pngTargets = [
  ["apple-touch-icon.png", 180],
  ["icon-192x192.png", 192],
  ["icon-512x512.png", 512],
  ["favicon-16x16.png", 16],
  ["favicon-32x32.png", 32],
];

for (const [filename, size] of pngTargets) {
  await sharp(source)
    .resize(size, size, { fit: "cover" })
    .png()
    .toFile(join(publicDir, filename));
  console.log(`Wrote ${filename} (${size}x${size})`);
}

const favicon16 = await sharp(source).resize(16, 16).png().toBuffer();
const favicon32 = await sharp(source).resize(32, 32).png().toBuffer();
const favicon48 = await sharp(source).resize(48, 48).png().toBuffer();
const ico = await pngToIco([favicon16, favicon32, favicon48]);
writeFileSync(join(publicDir, "favicon.ico"), ico);
console.log("Wrote favicon.ico");

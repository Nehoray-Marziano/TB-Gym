// Generate native Apple startup PNGs from the existing trusted studio artwork.
// Android's native launch screen uses the manifest and existing PWA icons.
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { APPLE_STARTUP_IMAGES, PWA_BACKGROUND, PWA_INK, STARTUP_LOGO_SIZE } from "../src/lib/pwa-startup.mjs";

const source = (await readFile(new URL("../public/initials_logo.svg", import.meta.url), "utf8"))
  .replaceAll('fill="#000000"', `fill="${PWA_INK}"`);
await mkdir(new URL("../public/pwa-startup/", import.meta.url), { recursive: true });
const logos = new Map();
for (const { href, width, height, scale } of APPLE_STARTUP_IMAGES) {
  const size = STARTUP_LOGO_SIZE * scale;
  if (!logos.has(scale)) {
    logos.set(scale, await sharp(Buffer.from(source)).resize(size, size).png().toBuffer());
  }
  await sharp({ create: { width, height, channels: 3, background: PWA_BACKGROUND } })
    .composite([{ input: logos.get(scale), left: Math.floor((width - size) / 2), top: Math.floor((height - size) / 2) }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(fileURLToPath(new URL(`../public${href}`, import.meta.url)));
}
console.log(`Generated ${APPLE_STARTUP_IMAGES.length} opaque native startup images: centered studio mark on cream.`);

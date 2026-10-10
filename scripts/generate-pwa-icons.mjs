import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PWA_BACKGROUND, PWA_INK } from '../src/lib/pwa-startup.mjs';

// Adapt the existing palette rather than maintaining another brand color.
const css = await readFile(new URL('../src/app/globals.css', import.meta.url), 'utf8');
const brand = css.match(/--studio-brand:\s*(#[\da-f]{6})\s*;/i)?.[1];
if (!brand) throw new Error('Missing canonical --studio-brand color');

// Reuse the existing tightly framed TB paths without altering their geometry.
const tightSource = await readFile(new URL('../public/tb_logo.svg', import.meta.url), 'utf8');
const artwork = tightSource.slice(tightSource.indexOf('>') + 1, tightSource.lastIndexOf('</svg>'))
  .replaceAll('fill="#000000"', `fill="${PWA_BACKGROUND}"`);

// An opaque olive field keeps the identity green when the launcher adds glass.
// Leave clipping and any reflective treatment to the operating system.
const logoWidth = 1024 * 0.68;
const logoHeight = logoWidth * 544 / 690;
const canvas = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${brand}"/>
  <svg x="${(1024 - logoWidth) / 2}" y="${(1024 - logoHeight) / 2}" width="${logoWidth}" height="${logoHeight}" viewBox="205 241 690 544">${artwork}</svg>
</svg>`;

// Preserve the pre-v5 splash mark exactly: no colored rectangular backing.
// Chrome's primary icon targets 48dp; its separate splash targets 128dp.
// The manifest pairs the green 192px primary with this transparent 512px mark.
const source = await readFile(new URL('../public/initials_logo.svg', import.meta.url), 'utf8');
const splashArtwork = source.slice(source.indexOf('>') + 1, source.lastIndexOf('</svg>'))
  .replaceAll('fill="#000000"', `fill="${PWA_INK}"`);
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(512 512) scale(0.72) translate(-512 -512)">${splashArtwork}</g>
</svg>`;

const outputs = [
  ['pwa-icon-v6-192.png', 192],
  ['pwa-icon-v6-512.png', 512],
  ['apple-touch-icon-v6.png', 180],
];

for (const [name, size] of outputs) {
  const icon = sharp(Buffer.from(canvas))
    .resize(size, size, { kernel: 'lanczos3' })
    .removeAlpha();
  await icon.png()
    .toFile(fileURLToPath(new URL(`../public/${name}`, import.meta.url)));
  console.log(`Generated ${name} (${size}x${size})`);
}

await sharp(Buffer.from(splash)).resize(512, 512, { kernel: 'lanczos3' }).png()
  .toFile(fileURLToPath(new URL('../public/pwa-splash-v6-512.png', import.meta.url)));
console.log('Generated pwa-splash-v6-512.png (512x512, transparent dark mark)');

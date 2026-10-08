import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PWA_BACKGROUND } from '../src/lib/pwa-startup.mjs';

// Adapt the existing palette rather than maintaining another brand color.
const css = await readFile(new URL('../src/app/globals.css', import.meta.url), 'utf8');
const brand = css.match(/--studio-brand:\s*(#[\da-f]{6})\s*;/i)?.[1];
if (!brand) throw new Error('Missing canonical --studio-brand color');

// Source artwork: studio initials logo with barbell and leaves
const source = await readFile(new URL('../public/initials_logo.svg', import.meta.url), 'utf8');
const artwork = source.slice(source.indexOf('>') + 1, source.lastIndexOf('</svg>'))
  .replaceAll('fill="#000000"', `fill="${PWA_BACKGROUND}"`);

// An opaque olive field keeps the identity green when the launcher adds glass.
// Leave clipping and any reflective treatment to the operating system.
const canvas = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${brand}"/>
  <g transform="translate(512 512) scale(0.72) translate(-512 -512)">${artwork}</g>
</svg>`;

const outputs = [
  ['pwa-icon-v5-192.png', 192],
  ['pwa-icon-v5-512.png', 512],
  ['apple-touch-icon-v5.png', 180],
];

for (const [name, size] of outputs) {
  const icon = sharp(Buffer.from(canvas))
    .resize(size, size, { kernel: 'lanczos3' })
    .removeAlpha();
  await icon.png()
    .toFile(fileURLToPath(new URL(`../public/${name}`, import.meta.url)));
  console.log(`Generated ${name} (${size}x${size})`);
}

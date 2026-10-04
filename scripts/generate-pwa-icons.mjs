import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PWA_BACKGROUND, PWA_INK } from '../src/lib/pwa-startup.mjs';

// Source artwork: studio initials logo with barbell and leaves
const source = await readFile(new URL('../public/initials_logo.svg', import.meta.url), 'utf8');
const artwork = source.slice(source.indexOf('>') + 1, source.lastIndexOf('</svg>'))
  .replaceAll('fill="#000000"', `fill="${PWA_INK}"`);

// A normal icon can be drawn directly over Android's splash canvas. Keep its
// surround transparent so scaling/color conversion cannot expose a square tile.
// Apple home-screen icons need their own opaque background. Do not publish
// maskable entries: Chromium prefers them for its splash over the normal mark.
const canvas = (opaque) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${opaque ? `<rect width="1024" height="1024" fill="${PWA_BACKGROUND}"/>` : ''}
  <g transform="translate(512 512) scale(0.72) translate(-512 -512)">${artwork}</g>
</svg>`;

const outputs = [
  ['pwa-icon-v4-192.png', 192, false],
  ['pwa-icon-v4-512.png', 512, false],
  ['apple-touch-icon-v4.png', 180, true],
];

for (const [name, size, opaque] of outputs) {
  const icon = sharp(Buffer.from(canvas(opaque)))
    .resize(size, size, { kernel: 'lanczos3' });
  // Export opaque icons as RGB, normal icons as RGBA.
  if (opaque) icon.removeAlpha();
  await icon.png()
    .toFile(fileURLToPath(new URL(`../public/${name}`, import.meta.url)));
  console.log(`Generated ${name} (${size}x${size})`);
}

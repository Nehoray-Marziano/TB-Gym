import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = await readFile(new URL('../public/initials_logo.svg', import.meta.url), 'utf8');
const artwork = source.slice(source.indexOf('>') + 1, source.lastIndexOf('</svg>'))
  .replaceAll('fill="#000000"', 'fill="#f6f6ed"');

// Using uniform scale(0.8) for all icons ensures that Android native launcher splash,
// WebAPK splash, and browser PWA splash screens have identical geometry, bounding box,
// and vertical centering with zero layout shift / jump.
const canvas = () => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#162218"/>
  <g transform="translate(512 512) scale(0.8) translate(-512 -512)">${artwork}</g>
</svg>`;

const outputs = [
  ['pwa-icon-v3-192.png', 192],
  ['pwa-icon-v3-512.png', 512],
  ['pwa-icon-v3-maskable-512.png', 512],
  ['apple-touch-icon-v3.png', 180],
  // Also regenerate v2 files to ensure backwards compatibility with identical geometry
  ['pwa-icon-v2-192.png', 192],
  ['pwa-icon-v2-512.png', 512],
  ['pwa-icon-v2-maskable-512.png', 512],
  ['apple-touch-icon-v2.png', 180],
];

const svgBuffer = Buffer.from(canvas());

for (const [name, size] of outputs) {
  await sharp(svgBuffer)
    .resize(size, size, { kernel: 'lanczos3' })
    .png()
    .toFile(fileURLToPath(new URL(`../public/${name}`, import.meta.url)));
  console.log(`Generated ${name} (${size}x${size})`);
}

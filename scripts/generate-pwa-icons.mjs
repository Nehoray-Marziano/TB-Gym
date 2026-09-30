import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = await readFile(new URL('../public/initials_logo.svg', import.meta.url), 'utf8');
const artwork = source.slice(source.indexOf('>') + 1, source.lastIndexOf('</svg>'))
  .replaceAll('fill="#000000"', 'fill="#f6f6ed"');

const canvas = (maskable = false) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#162218"/>
  <g transform="translate(512 512) scale(${maskable ? '0.8' : '1'}) translate(-512 -512)">${artwork}</g>
</svg>`;

const outputs = [
  ['pwa-icon-v2-192.png', 192, false],
  ['pwa-icon-v2-512.png', 512, false],
  ['pwa-icon-v2-maskable-512.png', 512, true],
  ['apple-touch-icon-v2.png', 180, false],
];

for (const [name, size, maskable] of outputs) {
  await sharp(Buffer.from(canvas(maskable)))
    .resize(size, size, { kernel: 'lanczos3' })
    .png()
    .toFile(fileURLToPath(new URL(`../public/${name}`, import.meta.url)));
}

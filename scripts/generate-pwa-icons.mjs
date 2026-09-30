import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = await readFile(new URL('../public/initials_logo.svg', import.meta.url), 'utf8');
const artwork = source.slice(source.indexOf('>') + 1, source.lastIndexOf('</svg>'))
  .replaceAll('fill="#000000"', 'fill="#ffffff"');

// A padded mark keeps the weight and leaf inside Android's maskable safe area.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="-128 -128 1280 1280"><rect x="-128" y="-128" width="1280" height="1280" fill="#8b8e6f"/>${artwork}</svg>`;
await sharp(Buffer.from(maskable)).png().toFile(fileURLToPath(new URL('../public/pwa-icon-maskable-512.png', import.meta.url)));

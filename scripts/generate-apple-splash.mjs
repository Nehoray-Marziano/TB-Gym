import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

async function main() {
  const source = await readFile(new URL('../public/initials_logo.svg', import.meta.url), 'utf8');
  const artwork = source.slice(source.indexOf('>') + 1, source.lastIndexOf('</svg>'))
    .replaceAll('fill="#000000"', 'fill="#162218"');

  const sizes = [
    { w: 1170, h: 2532, name: 'apple-splash-1170-2532.png' },
    { w: 1179, h: 2556, name: 'apple-splash-1179-2556.png' },
    { w: 1290, h: 2796, name: 'apple-splash-1290-2796.png' },
    { w: 1284, h: 2778, name: 'apple-splash-1284-2778.png' },
    { w: 1125, h: 2436, name: 'apple-splash-1125-2436.png' },
    { w: 828, h: 1792, name: 'apple-splash-828-1792.png' },
    { w: 750, h: 1334, name: 'apple-splash-750-1334.png' },
  ];

  for (const item of sizes) {
    const markSize = Math.round(Math.min(item.w, item.h) * 0.32);
    const canvas = `<svg xmlns="http://www.w3.org/2000/svg" width="${item.w}" height="${item.h}" viewBox="0 0 ${item.w} ${item.h}">
      <rect width="${item.w}" height="${item.h}" fill="#e9eadc"/>
      <g transform="translate(${item.w / 2} ${item.h * 0.45}) scale(${markSize / 1024}) translate(-512 -512)">
        ${artwork}
      </g>
    </svg>`;

    const dest = fileURLToPath(new URL(`../public/${item.name}`, import.meta.url));
    await sharp(Buffer.from(canvas)).png().toFile(dest);
    console.log(`Generated public/${item.name} (${item.w}x${item.h})`);
  }
}

main();

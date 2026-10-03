import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { APPLE_LAUNCH_SCREENS, LAUNCH_BACKGROUND, LAUNCH_INK, LAUNCH_MARK_RATIO, LAUNCH_MARK_TOP } from '../src/lib/pwa-launch.mjs';

async function main() {
  const source = await readFile(new URL('../public/initials_logo.svg', import.meta.url), 'utf8');
  const artwork = source.slice(source.indexOf('>') + 1, source.lastIndexOf('</svg>'))
    .replaceAll('fill="#000000"', `fill="${LAUNCH_INK}"`);

  const sizes = APPLE_LAUNCH_SCREENS.flatMap(({ width, height, scale }) => [
    { w: width * scale, h: height * scale },
    { w: height * scale, h: width * scale },
  ]);

  for (const item of sizes) {
    const markSize = Math.min(item.w, item.h) * LAUNCH_MARK_RATIO;
    const canvas = `<svg xmlns="http://www.w3.org/2000/svg" width="${item.w}" height="${item.h}" viewBox="0 0 ${item.w} ${item.h}">
      <rect width="${item.w}" height="${item.h}" fill="${LAUNCH_BACKGROUND}"/>
      <g transform="translate(${item.w / 2} ${item.h * LAUNCH_MARK_TOP}) scale(${markSize / 1024}) translate(-512 -512)">
        ${artwork}
      </g>
    </svg>`;

    const name = `apple-splash-v4-${item.w}-${item.h}.png`;
    const dest = fileURLToPath(new URL(`../public/${name}`, import.meta.url));
    await sharp(Buffer.from(canvas)).png().toFile(dest);
    console.log(`Generated public/${name} (${item.w}x${item.h})`);
  }
}

main();

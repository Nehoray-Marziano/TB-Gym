// Validate a production build, not a dev server. Native OS animation still
// requires an installed app on a physical phone.
// Usage: node scripts/check-native-startup.mjs http://127.0.0.1:3116
import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import sharp from "sharp";
import { APPLE_STARTUP_IMAGES, PWA_BACKGROUND, STARTUP_LOGO_SIZE } from "../src/lib/pwa-startup.mjs";

const baseUrl = process.argv[2] || "http://127.0.0.1:3116";
assert(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname), "Use a local production server");
for (const path of ["src/app/loading.tsx", "src/components/LaunchScreen.tsx", "src/components/AppSplash.tsx", "src/lib/pwa-launch.mjs"]) {
  await assert.rejects(access(new URL(`../${path}`, import.meta.url)), { code: "ENOENT" }, `Old splash removed: ${path}`);
}
assert(!(await readdir(new URL("../public/", import.meta.url))).some(name => name.startsWith("apple-splash")), "No old native assets");
const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
assert(css.includes(`--studio-canvas: ${PWA_BACKGROUND}`), "Native canvas matches the runtime palette");
const sw = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
assert.doesNotMatch(sw, /apple-splash|pwa-startup\/|cacheName:["']start-url/, "No obsolete splash URLs, all-device startup precache, or launch HTML cache");

for (const path of ["/dashboard", "/book", "/my-bookings", "/profile"]) {
  const response = await fetch(new URL(path, baseUrl), { redirect: "manual" });
  assert.equal(response.status, 307, `${path}: auth redirects before any document paints`);
  assert.equal(new URL(response.headers.get("location"), baseUrl).pathname, "/auth/login");
}
for (const path of ["/", "/auth/login"]) {
  const response = await fetch(new URL(path, baseUrl), { redirect: "manual" });
  assert.equal(response.status, 200);
  const html = await response.text();
  const head = html.match(/<head[^>]*>([^]*?)<\/head>/)?.[1] || "";
  assert.match(head, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(head, /name="apple-mobile-web-app-status-bar-style" content="default"/);
  assert.equal((html.match(/name="apple-mobile-web-app-status-bar-style"/g) || []).length, 1);
  assert.equal((html.match(/rel="apple-touch-startup-image"/g) || []).length, APPLE_STARTUP_IMAGES.length);
  for (const image of APPLE_STARTUP_IMAGES) assert(head.includes(image.href), `${path}: startup asset arrives before the body`);
  assert.match(html, /<html[^>]*background-color:#e9eadc/);
  assert.match(html, /<body[^>]*background-color:#e9eadc/);
  assert.match(html, /class="studio-welcome /, "Login is in the initial document");
  assert.match(html, /style="position:relative;width:100%;height:100dvh;background-color:#eceee0"/, "Login canvas is opaque and sized before hydration");
  assert.doesNotMatch(html, /data-studio-launch|data-app-splash|studio-document-ready|http-equiv="refresh"/i, "No extra splash stage or client document redirect");
}
const manifest = await (await fetch(`${baseUrl}/manifest.webmanifest`)).json();
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.equal(manifest.id, "/");
assert.equal(manifest.background_color, PWA_BACKGROUND);
assert.equal(manifest.theme_color, PWA_BACKGROUND);
for (const size of [192, 512]) {
  assert(manifest.icons.some(icon => icon.sizes === `${size}x${size}` && icon.purpose === "any"));
}
// Chromium's UpdateBestSplashIcon prefers MASKABLE before ANY. Every eligible
// entry must preserve the transparent mark, not just the first/512px ANY icon.
assert(manifest.icons.every(icon => icon.purpose === "any"), "No higher-priority opaque splash candidate");
for (const icon of manifest.icons) {
  const response = await fetch(new URL(icon.src, baseUrl));
  assert.equal(response.status, 200);
  const bytes = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(bytes).metadata();
  assert.equal(`${metadata.width}x${metadata.height}`, icon.sizes);
  const { data, info } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  let artwork = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const offset = (y * info.width + x) * info.channels;
    if (x < info.width * 0.1 || x >= info.width * 0.9 || y < info.height * 0.1 || y >= info.height * 0.9) {
      assert.equal(data[offset + 3], 0, "Every splash candidate has no rectangular backing outside its mark");
    }
    if (data[offset + 3]) artwork++;
  }
  assert(artwork > 0);
}
const canvas = [233, 234, 220];
for (const image of APPLE_STARTUP_IMAGES) {
  const response = await fetch(new URL(image.href, baseUrl));
  assert.equal(response.status, 200, image.href);
  assert.match(response.headers.get("content-type"), /image\/png/);
  const { data, info } = await sharp(Buffer.from(await response.arrayBuffer())).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, image.width);
  assert.equal(info.height, image.height);
  assert.equal(info.channels, 3, "Startup is opaque RGB");
  const size = STARTUP_LOGO_SIZE * image.scale;
  const left = Math.floor((image.width - size) / 2), top = Math.floor((image.height - size) / 2);
  let artwork = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const offset = (y * info.width + x) * 3;
    const differs = data[offset] !== canvas[0] || data[offset + 1] !== canvas[1] || data[offset + 2] !== canvas[2];
    if (!differs) continue;
    artwork++;
    assert(x >= left && x < left + size && y >= top && y < top + size, `${image.href}: only the centered mark may differ from the canvas`);
  }
  assert(artwork > 0, "Startup mark exists");
}
console.log(`PASS cleanup, early native metadata, pre-paint auth redirects, Android manifest/icons, and ${APPLE_STARTUP_IMAGES.length} opaque centered Apple images`);

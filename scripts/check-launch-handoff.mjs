// Production browser regression for the OS-splash -> HTML -> login handoff.
// Chromium checks the web document. It cannot reproduce SpringBoard/WebKit's
// native iOS launch animation; cold/warm launches still need a physical iPhone.
// Usage: node scripts/check-launch-handoff.mjs http://127.0.0.1:3113
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { APPLE_LAUNCH_SCREENS, APPLE_STARTUP_IMAGES, LAUNCH_BACKGROUND } from "../src/lib/pwa-launch.mjs";

const baseUrl = process.argv[2] || "http://127.0.0.1:3113";
assert(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname), "Use a local production server");
const output = join(process.cwd(), "scratch", "launch-handoff");
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), "talia-launch-handoff-"));
const initialResponse = await fetch(baseUrl);
const html = await initialResponse.text();
const head = html.match(/<head[^>]*>([^]*?)<\/head>/)?.[1];
assert(head, "The initial document includes the launch metadata in its head");
assert.match(head, /<meta name="apple-mobile-web-app-capable" content="yes"\s*\/>/, "Apple's capability tag must be present before the first body frame, alongside the generic tag Next emits");
assert.equal((html.match(/name="apple-mobile-web-app-capable"/g) || []).length, 1, "Exactly one Apple capability declaration");
assert.match(head, /name="mobile-web-app-capable" content="yes"/, "Keep the generic capability declaration for other browsers");
assert.match(head, /name="apple-mobile-web-app-status-bar-style" content="black-translucent"/, "The initial status-bar mode already matches the full-screen splash geometry");
for (const path of ["/auth/login", "/dashboard"]) {
  const response = await fetch(new URL(path, baseUrl));
  assert.equal(response.status, 200);
  const routeHead = (await response.text()).match(/<head[^>]*>([^]*?)<\/head>/)?.[1] || "";
  for (const name of ["mobile-web-app-capable", "apple-mobile-web-app-capable"]) {
    assert(routeHead.includes(`name="${name}" content="yes"`), `${path}: ${name} precedes the body`);
  }
  assert(routeHead.includes('name="apple-mobile-web-app-status-bar-style" content="black-translucent"'), `${path}: status-bar mode precedes the body, including old installed start URLs`);
}
assert.match(head, /<link rel="expect" href="#studio-document-ready" blocking="render"/, "Hold supported browsers until the destination markup is parsed");
assert(html.indexOf('id="studio-document-ready"') > html.indexOf('studio-welcome-reassurance'), "The paint marker follows the complete login content");
assert.match(initialResponse.headers.get('link') || '', /<\/studio_emblem_dark.png>; rel=preload; as="image"; fetchpriority="high"/, "Login emblem is discovered in response headers before body parsing");
assert.match(html, /id="studio-launch-critical"/, "Critical launch CSS is server-rendered");
assert.match(html, /<html[^>]*style="[^"]*background-color:#e9eadc/, "The HTML canvas does not wait for CSS");
assert.match(html, /<body[^>]*style="[^"]*background-color:#e9eadc/, "The body is opaque before hydration");
assert.match(html, /name="color-scheme" content="light"/, "The light app declares its appearance even with a dark OS");
assert.match(html, /class="studio-welcome /, "Login is in the initial HTML");
assert.doesNotMatch(html, /<div data-studio-launch/, "No intermediate in-app splash before login");
const manifest = await (await fetch(`${baseUrl}/manifest.webmanifest`)).json();
assert.equal(manifest.start_url, "/");
assert.equal(manifest.background_color, LAUNCH_BACKGROUND);
assert.equal(manifest.theme_color, LAUNCH_BACKGROUND);
const css = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
assert.match(css, new RegExp(`--studio-canvas: ${LAUNCH_BACKGROUND}`), "Launch colors match the runtime token owner");
for (const image of APPLE_STARTUP_IMAGES) {
  assert(head.includes(image.url), `Startup image is in the initial head before the splash can paint: ${image.url}`);
  const pixels = await sharp(fileURLToPath(new URL(`../public${image.url}`, import.meta.url))).metadata();
  const [, width, height] = image.url.match(/v4-(\d+)-(\d+)\.png$/);
  assert.equal(pixels.width, Number(width));
  assert.equal(pixels.height, Number(height));
}
console.log(`PASS initial HTML, opaque canvas, direct login, and ${APPLE_STARTUP_IMAGES.length} native startup images`);

const chrome = spawn(process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless=new", "--no-sandbox", `--user-data-dir=${profile}`, "--remote-debugging-port=0",
  "--remote-allow-origins=*", "--no-first-run", "--no-default-browser-check", "about:blank",
], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
let ws;
const results = [];
try {
  const wsUrl = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Chrome startup timed out")), 15000);
    chrome.on("error", reject);
    chrome.stderr.on("data", (data) => {
      const match = data.toString().match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) { clearTimeout(timeout); resolve(match[1]); }
    });
  });
  ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  const paused = new Map();
  const errors = [];
  const committedDocuments = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Page.frameNavigated" && !message.params.frame.parentId) {
      const commits = committedDocuments.get(message.sessionId) || [];
      commits.push(message.params.frame.url);
      committedDocuments.set(message.sessionId, commits);
    }
    if (message.method === "Fetch.requestPaused") {
      const requests = paused.get(message.sessionId) || [];
      requests.push(message.params);
      paused.set(message.sessionId, requests);
    }
    if (message.method === "Runtime.exceptionThrown") {
      const detail = message.params.exceptionDetails;
      errors.push({ message: detail.exception?.description || detail.text, url: detail.url, line: detail.lineNumber });
    }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timeout);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 30000);
    pending.set(id, { resolve, reject, timeout });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const open = async (width, height, scale = 3) => {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const call = (method, params) => send(method, params, sessionId);
    const evaluate = async (expression) => {
      const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const waitFor = async (expression) => {
      for (let attempt = 0; attempt < 120; attempt++) {
        if (await evaluate(expression)) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error(`Timed out: ${expression}`);
    };
    await call("Page.enable");
    await call("Runtime.enable");
    await call("Network.enable");
    await call("Network.setBlockedURLs", { urls: ["*onesignal.com*"] });
    await call("Network.setCacheDisabled", { cacheDisabled: true });
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: true });
    return { targetId, sessionId, call, evaluate, waitFor };
  };
  const snapshot = `(() => {
    const rect = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const { x, y, width, height, bottom } = element.getBoundingClientRect();
      return { x, y, width, height, bottom };
    };
    return { path: location.pathname, background: getComputedStyle(document.documentElement).backgroundColor,
      colorScheme: getComputedStyle(document.documentElement).colorScheme, scrollHeight: document.documentElement.scrollHeight,
      emblem: rect('.studio-welcome-emblem'), actions: rect('.studio-welcome-actions'), footer: rect('.studio-welcome-reassurance') };
  })()`;

  // With every stylesheet and client script withheld, the initial document must
  // still have the correct opaque canvas. This isolates the pre-hydration gap.
  const slow = await open(393, 852);
  await slow.call("Fetch.enable", { patterns: [
    { urlPattern: "*", resourceType: "Stylesheet", requestStage: "Request" },
    { urlPattern: "*", resourceType: "Script", requestStage: "Request" },
  ] });
  await slow.call("Page.navigate", { url: baseUrl });
  await slow.waitFor("Boolean(document.querySelector('#studio-launch-critical'))");
  const early = await slow.evaluate(`({html:getComputedStyle(document.documentElement).backgroundColor, body:document.body && getComputedStyle(document.body).backgroundColor, scheme:getComputedStyle(document.documentElement).colorScheme})`);
  assert.equal(early.html, "rgb(233, 234, 220)");
  assert.equal(early.scheme, "light");
  if (early.body) assert.equal(early.body, early.html);
  assert(paused.get(slow.sessionId)?.some(request => request.resourceType === "Stylesheet"), "Stylesheet download really was withheld");
  // Chromium defers paint (including captureScreenshot) while a blocking
  // stylesheet is outstanding. Inspect the initial document's styles here,
  // then inspect pixels after releasing downloads. Do not call this a proof
  // of the OS-owned pre-paint frame.
  for (const request of paused.get(slow.sessionId) || []) await slow.call("Fetch.continueRequest", { requestId: request.requestId });
  await slow.call("Fetch.disable");
  await slow.waitFor("Boolean(document.querySelector('.studio-welcome')?.style.height)");
  await slow.evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
  await writeFile(join(output, "after-delayed-downloads.png"), Buffer.from((await slow.call("Page.captureScreenshot", { format: "png" })).data, "base64"));
  assert.equal(await slow.evaluate("Boolean(document.querySelector('[data-studio-launch]'))"), false, "Login never inserts a second splash");
  results.push({ case: "styles-and-scripts-withheld", early });
  await send("Target.closeTarget", { targetId: slow.targetId });
  console.log("PASS opaque initial document while CSS and JavaScript downloads are withheld");

  for (const screen of APPLE_LAUNCH_SCREENS) {
    const browser = await open(screen.width, screen.height, screen.scale);
    // Chromium cannot expose iOS installed-app media/support queries. Apply the
    // actual server CSS with just those two platform gates removed, preserving
    // its real device, orientation, pixel-ratio rules and safe-area expressions.
    await browser.call("Emulation.setSafeAreaInsetsOverride", { insets: { top: 0, bottom: 0, left: 0, right: 0 } });
    await browser.call("Emulation.setEmulatedMedia", { features: [
      { name: "prefers-color-scheme", value: "dark" },
      { name: "prefers-reduced-motion", value: "reduce" },
    ] });
    await browser.call("Page.navigate", { url: `${baseUrl}/auth/login` });
    await browser.waitFor("Boolean(document.querySelector('.studio-welcome')?.style.height)");
    // Leave React's server-rendered style untouched. Changing it before
    // hydration would introduce an artificial mismatch into the test itself.
    await browser.evaluate(`(() => {
      const style = document.createElement('style');
      style.textContent = document.querySelector('#studio-launch-critical').textContent.replace('@supports (-webkit-touch-callout:none)', '@supports (display:grid)').replaceAll('(display-mode:standalone) and ', '');
      document.head.appendChild(style);
    })()`);
    await browser.evaluate("document.fonts.ready");
    await browser.waitFor("document.querySelector('.studio-welcome-emblem').complete && document.querySelector('.studio-welcome-emblem').naturalWidth > 0");
    // Enabling an iOS-only stylesheet after hydration invalidates Chromium's
    // size queries. Wait for that test setup to settle before changing insets.
    await browser.evaluate(`new Promise((resolve, reject) => {
      let previous = '', stable = 0, frames = 0;
      const sample = () => {
        const geometry = JSON.stringify([...document.querySelectorAll('.studio-welcome-main, .studio-welcome-emblem, .studio-welcome-actions, .studio-welcome-reassurance')].map(element => {
          const { x, y, width, height } = element.getBoundingClientRect(); return { x, y, width, height };
        }));
        stable = geometry === previous ? stable + 1 : 0;
        previous = geometry;
        if (stable >= 5) resolve();
        else if (++frames > 180) reject(new Error('Initial layout never settled'));
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    })`);
    assert.equal(await browser.evaluate("getComputedStyle(document.querySelector('.studio-welcome')).getPropertyValue('--studio-launch-safe-top').trim()"), `${screen.top}px`, "The emulated platform query matches the device");
    const before = await browser.evaluate(snapshot);
    await browser.call("Emulation.setSafeAreaInsetsOverride", { insets: { top: screen.top, bottom: screen.bottom, left: 0, right: 0 } });
    await browser.evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
    const after = await browser.evaluate(snapshot);
    results.push({ case: `${screen.width}x${screen.height}`, before, after });
    await writeFile(join(output, "results.json"), JSON.stringify({ platform: "Chromium; iOS CSS gates simulated explicitly", results, errors }, null, 2));
    for (const part of ["emblem", "actions", "footer"]) {
      for (const dimension of ["x", "y", "width", "height"]) {
        assert(Math.abs(before[part][dimension] - after[part][dimension]) <= 1, `${screen.width}x${screen.height}: ${part}.${dimension} shifted when safe areas arrived`);
      }
    }
    assert(after.footer.bottom <= screen.height - screen.bottom + 1, "Login footer clears the home indicator");
    assert(after.scrollHeight <= screen.height + 1, "No launch scrolling");
    assert.equal(after.colorScheme, "light", "Dark OS does not override the app appearance");
    await writeFile(join(output, `${screen.width}x${screen.height}.png`), Buffer.from((await browser.call("Page.captureScreenshot", { format: "png" })).data, "base64"));

    await send("Target.closeTarget", { targetId: browser.targetId });
    console.log(`PASS ${screen.width}x${screen.height}: login controls remain stationary while safe areas settle`);
  }
  const legacy = await open(390, 844);
  await legacy.call("Page.navigate", { url: `${baseUrl}/dashboard` });
  await legacy.waitFor("location.pathname === '/auth/login' && Boolean(document.querySelector('.studio-welcome')?.style.height)");
  assert.equal(await legacy.evaluate("Boolean(document.querySelector('[data-studio-launch]'))"), false);
  assert.deepEqual(committedDocuments.get(legacy.sessionId)?.filter(url => url.startsWith(baseUrl)).map(url => new URL(url).pathname), ["/auth/login"], "Old installed start URL must commit only the login document");
  results.push({ case: "legacy-dashboard-start", after: await legacy.evaluate(snapshot) });
  await send("Target.closeTarget", { targetId: legacy.targetId });
  console.log("PASS older installed /dashboard start commits only the login document");
  const warm = await open(390, 844);
  await warm.call("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
    const observer = new MutationObserver(() => {
      if (document.getElementById('studio-document-ready')) {
        performance.mark('studio-markup-parsed');
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  })()` });
  for (let visit = 0; visit < 2; visit++) {
    await warm.call("Page.navigate", { url: baseUrl + "/auth/login" });
    await warm.waitFor("Boolean(document.querySelector('.studio-welcome')?.style.height) && performance.getEntriesByName('first-paint').length > 0");
    const paint = await warm.evaluate(`({
      ready: performance.getEntriesByName('studio-markup-parsed')[0]?.startTime,
      first: performance.getEntriesByName('first-paint')[0]?.startTime
    })`);
    assert(Number.isFinite(paint.ready), 'The complete-markup timestamp was recorded');
    assert(paint.first >= paint.ready, 'First paint must follow the complete page markup, including on warm cache');
    results.push({ case: visit ? "warm-first-paint" : "cold-first-paint", ...paint });
  }
  await send("Target.closeTarget", { targetId: warm.targetId });
  console.log("PASS cold/warm first paint follows complete login markup");
  await writeFile(join(output, "results.json"), JSON.stringify({ platform: "Chromium; iOS CSS gates simulated explicitly", results, errors }, null, 2));
  assert.deepEqual(errors, [], "No runtime exceptions during launch");
  console.log(`Evidence: ${output}`);
} finally {
  ws?.close();
  chrome.kill();
}

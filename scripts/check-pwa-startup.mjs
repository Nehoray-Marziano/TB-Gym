// Local browser regression: logged-out PWA start URL, cold logo load, and relaunch.
// Usage: node scripts/check-pwa-startup.mjs http://127.0.0.1:3112
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.argv[2] || "http://127.0.0.1:3112";
assert(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname), "Use a local server");
const output = await mkdtemp(join(tmpdir(), "talia-pwa-startup-"));
const chrome = spawn(process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless=new", "--no-sandbox", `--user-data-dir=${join(output, "chrome")}`,
  "--remote-debugging-port=0", "--remote-allow-origins=*", "--no-first-run", "--no-default-browser-check", "about:blank",
], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
let ws;
const results = [];
const failures = [];
try {
  const wsUrl = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Chrome startup timed out")), 15000);
    chrome.on("error", reject);
    chrome.stderr.on("data", data => {
      const match = data.toString().match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) { clearTimeout(timeout); resolve(match[1]); }
    });
  });
  ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  const pausedImages = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === "Fetch.requestPaused") {
      pausedImages.set(message.sessionId, message.params.requestId);
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
  const measurement = `(() => {
    const rect = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const { x, y, width, height, bottom } = element.getBoundingClientRect();
      return { x, y, width, height, bottom };
    };
    const image = document.querySelector('.studio-welcome-emblem');
    return {
      pathname: location.pathname, viewport: { width: innerWidth, height: innerHeight },
      visibleHeight: window.visualViewport?.height, shellHeight: document.querySelector('.studio-welcome')?.style.height,
      main: rect('.studio-welcome-main'), header: rect('.studio-welcome-header'),
      emblem: rect('.studio-welcome-emblem'), hero: rect('.studio-welcome-hero'),
      actions: rect('.studio-welcome-actions'), disclaimer: rect('.studio-welcome-reassurance'),
      decoded: image?.complete && image?.naturalWidth > 0,
      scrollHeight: document.documentElement.scrollHeight, scrollY,
    };
  })()`;
  for (const [width, height, top, bottom] of [[320, 568, 0, 0], [360, 640, 24, 24], [390, 844, 47, 34], [430, 932, 47, 34], [844, 390, 0, 21]]) {
    // Fresh target reproduces closing and reopening the logged-out app.
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const call = (method, params) => send(method, params, sessionId);
    const evaluate = async expression => {
      const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const waitFor = async expression => {
      for (let attempt = 0; attempt < 150; attempt++) {
        if (await evaluate(expression)) return;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      throw new Error(`Timed out: ${expression}`);
    };
    await call("Page.enable");
    await call("Page.addScriptToEvaluateOnNewDocument", { source: "window.__pwaStartupDocument = crypto.randomUUID();" });
    await call("Runtime.enable");
    await call("Network.enable");
    await call("Network.setCacheDisabled", { cacheDisabled: true });
    await call("Network.setBlockedURLs", { urls: ["*onesignal.com*"] });
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
    await call("Emulation.setSafeAreaInsetsOverride", { insets: { top, bottom, left: 0, right: 0 } });
    await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: width === 320 ? "reduce" : "no-preference" }] });
    await call("Fetch.enable", { patterns: [{ urlPattern: "*studio_emblem_dark.png*", requestStage: "Request" }] });
    await call("Page.navigate", { url: `${baseUrl}/dashboard` });
    await waitFor("Boolean(document.querySelector('.studio-welcome-reassurance'))");
    await waitFor("getComputedStyle(document.querySelector('.studio-welcome-main')).display === 'grid'");
    await waitFor("Boolean(document.querySelector('.studio-welcome')?.style.height) && location.pathname === '/auth/login'");
    await evaluate("Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 3000))])");
    const before = await evaluate(measurement);
    assert.equal(before.decoded, false, "Measure the logo before its cold request completes");
    await waitFor("Boolean(document.querySelector('.studio-welcome-emblem'))");
    assert(pausedImages.has(sessionId), "Cold logo request was intercepted");
    await call("Fetch.continueRequest", { requestId: pausedImages.get(sessionId) });
    pausedImages.delete(sessionId);
    await call("Fetch.disable");
    await waitFor("document.querySelector('.studio-welcome-emblem').complete && document.querySelector('.studio-welcome-emblem').naturalWidth > 0");
    await evaluate("new Promise(resolve => setTimeout(resolve, 150))");
    const after = await evaluate(measurement);
    const issues = [];
    if (after.pathname !== "/auth/login") issues.push("logged-out start URL did not reach login");
    for (const key of ["header", "emblem", "actions", "disclaimer"]) {
      for (const dimension of ["x", "y", "width", "height"]) {
        if (Math.abs(before[key][dimension] - after[key][dimension]) > 1) issues.push(`${key}.${dimension} shifted after logo load`);
      }
    }
    if (after.disclaimer.bottom > height - bottom + 1) issues.push("disclaimer cropped by viewport or safe area");
    const sharedWidth = Math.min(after.actions.x + after.actions.width, after.hero.x + after.hero.width) - Math.max(after.actions.x, after.hero.x);
    if (sharedWidth > 1 && after.actions.y < after.hero.bottom - 1) issues.push("actions overlap hero");
    if (after.scrollHeight > height + 1 || after.scrollY !== 0) issues.push("document moved or overflowed");
    const screenshot = await call("Page.captureScreenshot", { format: "png" });
    await writeFile(join(output, `${width}x${height}.png`), Buffer.from(screenshot.data, "base64"));
    // Resize after startup as standalone browser chrome settles, then reopen warm.
    await call("Emulation.setDeviceMetricsOverride", { width, height: height - 48, deviceScaleFactor: 1, mobile: true });
    await evaluate("new Promise(resolve => setTimeout(resolve, 150))");
    const resized = await evaluate(measurement);
    if (resized.disclaimer.bottom > height - 48 - bottom + 1) issues.push("disclaimer cropped after viewport resize");
    const previousDocument = await evaluate("window.__pwaStartupDocument");
    await call("Page.reload");
    await waitFor(`window.__pwaStartupDocument !== ${JSON.stringify(previousDocument)} && Boolean(document.querySelector('.studio-welcome-reassurance')) && Boolean(document.querySelector('.studio-welcome')?.style.height)`);
    await evaluate("Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 3000))])");
    const reopened = await evaluate(measurement);
    if (reopened.disclaimer.bottom > height - 48 - bottom + 1) issues.push("disclaimer cropped on warm relaunch");
    // Model a standalone launch where visible height settles before CSS viewport units.
    const visibleHeight = height - 96;
    await evaluate(`Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: ${visibleHeight} }); window.visualViewport.dispatchEvent(new Event('resize'));`);
    await evaluate("new Promise(resolve => setTimeout(resolve, 150))");
    const settled = await evaluate(measurement);
    if (settled.disclaimer.bottom > visibleHeight - bottom + 1) issues.push("disclaimer cropped when visual viewport is shorter than CSS viewport");
    await evaluate("delete window.visualViewport.height; window.dispatchEvent(new Event('pageshow'));");
    await evaluate("new Promise(resolve => setTimeout(resolve, 150))");
    const resumed = await evaluate(measurement);
    if (Math.abs(resumed.main.height - (height - 48)) > 1) issues.push("welcome height did not restore on app resume");
    results.push({ case: `${width}x${height}`, issues, before, after, resized, reopened, settled, resumed });
    await writeFile(join(output, "results.json"), JSON.stringify(results, null, 2));
    if (issues.length) failures.push(results.at(-1));
    console.log(`${issues.length ? "FAIL" : "PASS"} ${width}x${height}: ${issues.join("; ") || "stable logo and reachable login actions"}`);
    await send("Target.closeTarget", { targetId });
  }
  await writeFile(join(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(`Evidence: ${output}`);
  assert.equal(failures.length, 0, `${failures.length} startup cases failed`);
} finally {
  ws?.close();
  chrome.kill();
}

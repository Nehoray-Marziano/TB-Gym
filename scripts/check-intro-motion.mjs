// Verifies actual intro movement and reduced motion without submitting sign-in.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.argv[2] || "http://127.0.0.1:3104";
assert(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname));
const output = join(process.cwd(), "scratch", "intro-gloss-v3");
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), "talia-intro-motion-"));
// Warm the local route before Chrome's navigation timeout starts.
assert((await fetch(`${baseUrl}/auth/login`, { signal: AbortSignal.timeout(120000) })).ok);
const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless=new", "--no-sandbox", `--user-data-dir=${profile}`,
  "--remote-debugging-port=0", "--remote-allow-origins=*", "--no-first-run",
  "--no-default-browser-check", "about:blank",
], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
let ws;
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
  ws.onmessage = event => {
    const message = JSON.parse(event.data), request = pending.get(message.id);
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
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params = {}) => send(method, params, sessionId);
  const evaluate = async expression => {
    const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  await call("Page.enable");
  await call("Page.bringToFront");
  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await call("Page.navigate", { url: `${baseUrl}/auth/login` });
  for (let attempt = 0; attempt < 150; attempt++) {
    if (await evaluate("Boolean(document.querySelector('.studio-welcome-branch'))")) break;
    await delay(200);
  }
  await evaluate("document.fonts.ready");
  const readMotion = `(() => Object.fromEntries(['branch','sun','sun-ring','sun-halo'].map(name => {
    const el = document.querySelector('.studio-welcome-' + name), css = getComputedStyle(el);
    return [name, { transform: css.transform, opacity: css.opacity, running: el.getAnimations().some(a => a.playState === 'running') }];
  })))()`;
  const before = await evaluate(readMotion);
  await delay(1600);
  const after = await evaluate(readMotion);
  for (const name of Object.keys(before)) {
    assert(before[name].running && after[name].running, `${name} animation runs`);
    assert.notEqual(before[name].transform, after[name].transform, `${name} visibly moves over time`);
    console.log(`PASS: ${name} moves over time`);
  }
  await evaluate("document.querySelector('nextjs-portal')?.setAttribute('hidden','')");
  for (const [width, height] of [[390, 844], [320, 568]]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
    await delay(200);
    const shot = await call("Page.captureScreenshot", { format: "png" });
    await writeFile(join(output, `intro-glass-${width}x${height}.png`), Buffer.from(shot.data, "base64"));
  }
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await delay(200);
  const reducedBefore = await evaluate(readMotion);
  await delay(700);
  const reducedAfter = await evaluate(readMotion);
  for (const name of Object.keys(before)) {
    assert(!reducedBefore[name].running && !reducedAfter[name].running, `${name} respects reduced motion`);
    assert.equal(reducedBefore[name].transform, reducedAfter[name].transform, `${name} stays still with reduced motion`);
  }
  console.log("PASS: All artwork stays still with reduced motion.");
  console.log(`Evidence: ${output}`);
} finally {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ id: 999999, method: "Browser.close" }));
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  ws?.close();
  chrome.kill();
}

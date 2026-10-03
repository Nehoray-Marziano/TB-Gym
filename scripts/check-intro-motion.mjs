// Verifies actual intro movement and reduced motion without submitting sign-in.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const baseUrl = process.argv[2] || "http://127.0.0.1:3104";
assert(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname));
const output = join(process.cwd(), "scratch", "intro-glass-clear");
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
  await evaluate("document.querySelector('.studio-welcome-branch').decode()");
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

  // Freeze the actual artwork to isolate how much of it the untouched glass
  // transmits. Comparing screenshots catches excessive frost/white overlays
  // that look translucent in CSS but erase the thin branch in the browser.
  await evaluate("document.querySelectorAll('.studio-welcome-branch,.studio-welcome-sun,.studio-welcome-sun-ring,.studio-welcome-sun-halo').forEach(e=>e.getAnimations().forEach(a=>{a.pause();a.currentTime=0;}))");
  const capture = async () => {
    await delay(250);
    const shot = await call("Page.captureScreenshot", { format: "png" });
    return Buffer.from(shot.data, "base64");
  };
  const transmittedPixels = async (visible, hidden, rect) => {
    const crop = { left: Math.ceil(rect.x) + 16, top: Math.ceil(rect.y) + 8,
      width: Math.floor(rect.width) - 32, height: Math.floor(rect.height) - 16 };
    const a = await sharp(visible).extract(crop).removeAlpha().raw().toBuffer();
    const b = await sharp(hidden).extract(crop).removeAlpha().raw().toBuffer();
    let count = 0;
    for (let i = 0; i < a.length; i += 3) {
      const difference = (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3;
      if (difference >= 8) count++;
    }
    return count;
  };
  for (const [width, height] of [[390, 844], [320, 568]]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
    await delay(350);
    const rects = await evaluate(`(() => [...document.querySelectorAll('.studio-welcome-auth-button')].map(e=>{
      const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,pressed:e.matches(':active,:hover')};
    }))()`);
    assert(rects.every(r => !r.pressed), "Transparency is checked before hover or press");
    const visible = await capture();
    await evaluate("document.querySelector('.studio-welcome-branch').style.visibility='hidden'");
    const hidden = await capture();
    await evaluate("document.querySelector('.studio-welcome-branch').style.visibility=''");
    for (const [index, rect] of rects.entries()) {
      const pixels = await transmittedPixels(visible, hidden, rect);
      assert(pixels >= 100, `${index === 0 ? 'Google' : 'Email'} glass must reveal the branch at rest (${pixels} pixels at ${width}px)`);
      console.log(`PASS: ${index === 0 ? 'Google' : 'Email'} reveals the branch before interaction at ${width}px (${pixels} pixels).`);
    }
    await evaluate("document.querySelector('.studio-welcome-branch').getAnimations()[0].currentTime=3500");
    const moved = await capture();
    for (const rect of rects) {
      assert(await transmittedPixels(visible, moved, rect) >= 100, "Branch movement remains visible through untouched glass");
    }
    await evaluate("document.querySelector('.studio-welcome-branch').getAnimations()[0].currentTime=0");
  }
  // A cancelled touch exercises the real pressed rendering without signing in.
  const readMaterial = `(() => [...document.querySelectorAll('.studio-welcome-auth-button')].map(e=>{
    const g=e.querySelector('.liqui-glass');return {
      background:getComputedStyle(g).backgroundColor,
      frost:getComputedStyle(g.querySelector('.liqui-glass__backdrop')).backdropFilter,
      tint:getComputedStyle(g.querySelector('.liqui-glass__tint')).opacity,
      shine:getComputedStyle(g.querySelector('.liqui-glass__shine')).backgroundImage
    };
  }))()`;
  const restingMaterial = await evaluate(readMaterial);
  await call("Emulation.setTouchEmulationEnabled", { enabled: true });
  const touch = await evaluate("(() => {const r=document.querySelector('.studio-welcome-email-button').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
  await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch] });
  await delay(200);
  assert.deepEqual(await evaluate(readMaterial), restingMaterial, "Pressing must not change the glass material");
  await call("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await delay(400);
  assert.deepEqual(await evaluate(readMaterial), restingMaterial, "Released glass keeps the same transparency");
  assert.equal(await evaluate("Boolean(document.querySelector('[role=dialog]'))"), false, "A cancelled touch does not open sign-in");
  console.log("PASS: Frost, tint, and reflection stay constant through a cancelled touch.");

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

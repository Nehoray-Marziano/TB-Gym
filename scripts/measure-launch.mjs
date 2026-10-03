// Launch-quality benchmark for the installed-app start path.
//
// Emulates a mid-range phone (4x CPU slowdown, Fast-4G network), opens the PWA
// start URL logged out exactly like an app launch, and records what the user
// actually sees: a screencast filmstrip plus redirects, layout shifts, long
// tasks and dropped frames.
//
// Usage: node scripts/measure-launch.mjs <baseUrl> <label> [--cold] [--path=/dashboard]
//   --cold   disables the HTTP cache (first ever launch). Default is a warm launch.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const baseUrl = args.find(a => a.startsWith("http")) || "http://127.0.0.1:3112";
const label = args.find(a => !a.startsWith("http") && !a.startsWith("--")) || "run";
const cold = args.includes("--cold");
const startPath = (args.find(a => a.startsWith("--path=")) || "--path=/dashboard").slice(7);
assert(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname), "Use a local server");

const SETTLE_MS = 3500; // observation window after navigation starts
const STATE_THRESHOLD = 6; // mean abs RGB delta that counts as a different screen
const outDir = join(process.cwd(), "scratch", "launch", label + (cold ? "-cold" : "-warm"));
await mkdir(outDir, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), "talia-launch-"));

const chrome = spawn(process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless=new", "--no-sandbox", `--user-data-dir=${profile}`, "--remote-debugging-port=0",
  "--remote-allow-origins=*", "--no-first-run", "--no-default-browser-check", "about:blank",
], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });

let ws;
try {
  const wsUrl = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Chrome startup timed out")), 15000);
    chrome.on("error", reject);
    chrome.stderr.on("data", d => {
      const m = d.toString().match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timeout); resolve(m[1]); }
    });
  });
  ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  let nextId = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method) listeners.forEach(fn => fn(message));
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 30000);
    pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  const evaluate = async expression => {
    const r = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };

  await call("Page.enable");
  await call("Runtime.enable");
  await call("Network.enable");
  await call("Network.setBlockedURLs", { urls: ["*onesignal.com*"] });
  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await call("Emulation.setSafeAreaInsetsOverride", { insets: { top: 47, bottom: 34, left: 0, right: 0 } });

  // Prime the HTTP cache with one visit so the measured launch is a normal relaunch.
  if (!cold) {
    await call("Page.navigate", { url: baseUrl + startPath });
    await new Promise(r => setTimeout(r, 4000));
    await call("Page.navigate", { url: "about:blank" });
    await new Promise(r => setTimeout(r, 300));
  } else {
    await call("Network.setCacheDisabled", { cacheDisabled: true });
  }

  await call("Emulation.setCPUThrottlingRate", { rate: 4 });
  await call("Network.emulateNetworkConditions", { offline: false, latency: 60, downloadThroughput: 1_100_000, uploadThroughput: 190_000 });

  await call("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      const m = window.__m = { cls: 0, longTasks: [], paints: {}, lcp: 0, droppedFrames: 0, frames: 0, fontSwaps: 0 };
      const obs = (type, fn) => { try { new PerformanceObserver(l => l.getEntries().forEach(fn)).observe({ type, buffered: true }); } catch {} };
      obs("layout-shift", e => { if (!e.hadRecentInput) m.cls += e.value; });
      obs("longtask", e => m.longTasks.push(Math.round(e.duration)));
      obs("paint", e => { m.paints[e.name] = Math.round(e.startTime); });
      obs("largest-contentful-paint", e => { m.lcp = Math.round(e.startTime); });
      let last = performance.now();
      const tick = now => { m.frames++; if (now - last > 50) m.droppedFrames++; last = now; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      document.fonts && document.fonts.addEventListener && document.fonts.addEventListener("loadingdone", () => m.fontSwaps++);
    })();`,
  });

  const documents = [];
  const frames = [];
  let navStart = 0;
  listeners.push(msg => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === "Network.requestWillBeSent" && msg.params.type === "Document") {
      const r = msg.params.redirectResponse;
      if (r) documents.push({ status: r.status, url: r.url.replace(baseUrl, "") });
    }
    if (msg.method === "Network.responseReceived" && msg.params.type === "Document") {
      documents.push({ status: msg.params.response.status, url: msg.params.response.url.replace(baseUrl, "") });
    }
    if (msg.method === "Page.screencastFrame") {
      frames.push({ t: msg.params.metadata.timestamp * 1000 - navStart, data: msg.params.data });
      call("Page.screencastFrameAck", { sessionId: msg.params.sessionId }).catch(() => {});
    }
  });

  await call("Page.startScreencast", { format: "jpeg", quality: 70, maxWidth: 390, maxHeight: 844, everyNthFrame: 1 });
  navStart = Date.now();
  await call("Page.navigate", { url: baseUrl + startPath });
  await new Promise(r => setTimeout(r, SETTLE_MS));
  await call("Page.stopScreencast");

  const metrics = await evaluate("JSON.parse(JSON.stringify(window.__m || {}))");
  const finalPath = await evaluate("location.pathname");
  const htmlBg = await evaluate("getComputedStyle(document.documentElement).backgroundColor");
  const themeColor = await evaluate("document.querySelector('meta[name=theme-color]')?.content || null");

  // Decode every frame into a small raw RGB thumbnail for analysis.
  const SMALL = 48;
  const analysed = [];
  for (const frame of frames) {
    const buffer = Buffer.from(frame.data, "base64");
    const { data } = await sharp(buffer).resize(SMALL, Math.round(SMALL * 844 / 390), { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const mean = [0, 0, 0];
    for (let i = 0; i < data.length; i += 3) { mean[0] += data[i]; mean[1] += data[i + 1]; mean[2] += data[i + 2]; }
    const pixels = data.length / 3;
    analysed.push({ t: Math.round(frame.t), buffer, data, mean: mean.map(v => Math.round(v / pixels)) });
  }
  const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };

  // A "state" is a screen that differs materially from the previously accepted one.
  const states = [];
  for (const f of analysed) {
    const prev = states.at(-1);
    if (!prev || diff(prev.data, f.data) > STATE_THRESHOLD) states.push({ ...f, delta: prev ? Math.round(diff(prev.data, f.data) * 10) / 10 : 0 });
  }
  const colorSwing = states.slice(1).reduce((max, s, i) => {
    const p = states[i].mean;
    return Math.max(max, Math.round(Math.hypot(s.mean[0] - p[0], s.mean[1] - p[1], s.mean[2] - p[2])));
  }, 0);
  // Ambient motion = small frame-to-frame changes after the last state change.
  const lastStateT = states.at(-1)?.t ?? 0;
  const ambientFrames = analysed.filter(f => f.t > lastStateT + 300).length;

  // Contact sheet of distinct states, for human inspection.
  const W = 195, H = 422, sheet = states.slice(0, 8);
  if (sheet.length) {
    const tiles = await Promise.all(sheet.map(async (s, i) => ({
      input: await sharp(s.buffer).resize(W, H, { fit: "fill" }).png().toBuffer(), left: i * (W + 6), top: 0,
    })));
    await sharp({ create: { width: sheet.length * (W + 6), height: H, channels: 3, background: "#888888" } })
      .composite(tiles).png().toFile(join(outDir, "filmstrip.png"));
  }

  const report = {
    label, mode: cold ? "cold" : "warm", startPath, finalPath, htmlBg, themeColor,
    documents,
    firstPaintMs: metrics.paints?.["first-paint"], fcpMs: metrics.paints?.["first-contentful-paint"], lcpMs: metrics.lcp,
    visualStates: states.length,
    stateTimeline: states.map(s => ({ t: s.t, rgb: s.mean.join(","), delta: s.delta })),
    settledAtMs: lastStateT,
    colorSwing,
    cls: Math.round(metrics.cls * 1000) / 1000,
    longTasks: metrics.longTasks, totalBlockingMs: (metrics.longTasks || []).reduce((s, d) => s + Math.max(0, d - 50), 0),
    droppedFrames: metrics.droppedFrames, rafFrames: metrics.frames,
    screencastFrames: frames.length, ambientFramesAfterSettle: ambientFrames,
  };
  await writeFile(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`Evidence: ${outDir}`);
} finally {
  ws?.close();
  chrome.kill();
}

// Run against `next dev`: node scripts/check-home-layout.mjs [http://127.0.0.1:3100]
// The temporary route renders the real home and dock with synthetic data only.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.argv[2] || "http://127.0.0.1:3100";
assert(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname), "Use a local development server");
const output = await mkdtemp(join(tmpdir(), "talia-home-layout-"));
const fixtureDir = new URL("../src/app/home-layout-check/", import.meta.url);
const fixtureFile = new URL("page.tsx", fixtureDir);
const viewports = [[320, 568], [360, 640], [375, 667], [390, 664], [390, 844], [412, 915], [430, 932], [768, 1024], [1366, 768], [1920, 1080], [667, 375], [844, 390], [915, 412]];
const states = ["welcome", "empty", "booked", "long", "admin", "loading", "error"];
const fixture = `"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TraineeDashboard from "@/components/home/TraineeDashboard";
import { MemberNavigation } from "@/components/BottomNav";
function Preview() {
  const state = useSearchParams().get("state");
  const live = state === "loading" || state === "error";
  const booked = state === "booked" || state === "long" || state === "admin";
  return <><TraineeDashboard userId="00000000-0000-0000-0000-000000000000"
    previewProfile={{ full_name: state === "long" ? "אלכסנדרהמשהישראלי בדיקה" : "נועה בדיקה", role: state === "admin" ? "administrator" : "trainee" }}
    previewTickets={state === "empty" ? 0 : 12}
    {...(live ? {} : { previewNextClass: booked ? { id: "layout-fixture", title: state === "long" ? "אימון כוח וחיטוב לכל הגוף בקבוצת הבוקר המתקדמת" : "אימון כוח וחיטוב", start_time: new Date(Date.now() + 5 * 86400000).toISOString() } : null })}
  /><MemberNavigation pathname="/dashboard" /></>;
}
export default function LayoutCheck() { return <Suspense><Preview /></Suspense>; }
`;

let chrome;
let ws;
let created = false;
const failures = [];
const results = [];
try {
  await mkdir(fixtureDir); // Refuse to overwrite an existing route.
  created = true;
  await writeFile(fixtureFile, fixture, { flag: "wx" });
  chrome = spawn(process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", ["--headless=new", "--disable-gpu", "--no-sandbox", `--user-data-dir=${join(output, "chrome")}`, "--remote-debugging-port=0", "--remote-allow-origins=*", "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
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
    const message = JSON.parse(event.data);
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
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  const evaluate = async expression => {
    const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  await call("Page.enable");
  await call("Runtime.enable");
  await call("Network.enable");
  await call("Network.setBlockedURLs", { urls: ["*onesignal.com*"] });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, options) => {
      const url = typeof input === "string" ? input : input.url || String(input);
      if (url.includes("supabase.co")) {
        if (location.search.includes("state=loading")) return new Promise(() => {});
        return Promise.resolve(new Response(JSON.stringify({ message: "Synthetic QA failure" }), { status: 500, headers: { "content-type": "application/json" } }));
      }
      return nativeFetch(input, options);
    };
  ` });
  const inspect = `(() => {
    const main = document.querySelector("main");
    const issues = [];
    const rect = element => element.getBoundingClientRect();
    const visible = element => !element.closest('[aria-hidden="true"], .sr-only') && getComputedStyle(element).visibility !== "hidden" && rect(element).height > 0;
    const label = element => (element.textContent || element.className).toString().trim().slice(0, 75);
    if (document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1) issues.push("document overflows viewport");
    const children = [...main.children].filter(visible);
    for (let i = 1; i < children.length; i++) {
      const a = rect(children[i - 1]), b = rect(children[i]);
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) issues.push("main sections overlap");
    }
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, parent = node.parentElement;
      if (!node.textContent.trim() || !visible(parent) || parent.closest("script, style")) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      const text = range.getBoundingClientRect();
      if (text.left < -1 || text.right > innerWidth + 1 || text.top < -1 || text.bottom > innerHeight + 1) issues.push("text outside viewport: " + label(parent));
      for (let ancestor = parent; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (["hidden", "clip", "auto", "scroll"].includes(style.overflowY)) {
          const box = rect(ancestor);
          if (text.top < box.top - 1 || text.bottom > box.bottom + 1) { issues.push("clipped text: " + label(parent)); break; }
        }
      }
    }
    const nav = document.querySelector('nav[aria-label="ניווט ראשי"]');
    const limit = nav ? rect(nav).top : innerHeight;
    for (const target of main.querySelectorAll("a, button")) {
      if (!visible(target)) continue;
      const box = rect(target);
      if (box.bottom > limit + 1) issues.push("control behind navigation: " + label(target));
      if (box.height < 44 - 1) issues.push("short touch target: " + label(target));
    }
    const workout = document.querySelector(".studio-home-workout");
    window.scrollTo(0, 9999);
    if (scrollY !== 0) issues.push("page can scroll");
    return { issues: [...new Set(issues)], width: innerWidth, height: innerHeight,
      bodyFont: getComputedStyle(document.querySelector(".studio-welcome-description, .studio-home-empty-description, .studio-home-workout-time") || main).fontSize,
      cardHeight: workout ? Math.round(rect(workout).height) : null };
  })()`;
  for (const [width, height] of viewports) {
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 1000 });
    await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: width === 375 ? "reduce" : "no-preference" }] });
    for (const state of states) {
      await call("Page.navigate", { url: `${baseUrl}${state === "welcome" ? "/auth/login" : `/home-layout-check?state=${state}`}` });
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        ready = await evaluate(`Boolean(document.querySelector("${state === "welcome" ? ".studio-welcome-features" : ".studio-home-balance"}"))`);
        if (ready) break;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      assert(ready, `Page did not render: ${state}`);
      await evaluate("document.fonts.ready.then(() => new Promise(resolve => setTimeout(resolve, 250)))");
      const measurement = await evaluate(inspect);
      const caseName = `${state}-${width}x${height}`;
      results.push({ case: caseName, ...measurement });
      if (measurement.issues.length) { failures.push({ case: caseName, issues: measurement.issues }); console.log(`FAIL ${caseName}: ${measurement.issues.join("; ")}`); }
      if (measurement.issues.length || (width === 390 && height === 844)) {
        const screenshot = await call("Page.captureScreenshot", { format: "png" });
        await writeFile(join(output, `${caseName}.png`), Buffer.from(screenshot.data, "base64"));
      }
    }
    console.log(`Checked ${width}x${height}`);
  }
  await writeFile(join(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(`Evidence: ${output}`);
  assert.equal(failures.length, 0, `${failures.length} layout cases failed`);
  console.log(`PASS: ${results.length} home layouts have no scrolling, clipped text, section overlap, or hidden controls.`);
} finally {
  ws?.close();
  chrome?.kill();
  if (created) { await unlink(fixtureFile).catch(() => {}); await rmdir(fixtureDir); }
}

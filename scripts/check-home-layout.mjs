// Run against `next dev`: node scripts/check-home-layout.mjs [http://127.0.0.1:3100]
// Add --safe-areas to check notch and home-indicator clearance.
// Add --pwa to check sign-in entry, viewport settling, app resume and pinch zoom.
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
const safeAreas = process.argv.includes("--safe-areas");
const pwa = process.argv.includes("--pwa");
const viewports = pwa ? [[360, 780], [390, 844], [412, 915]] : safeAreas ? [[320, 568], [390, 844]] : [[320, 568], [360, 640], [375, 667], [390, 664], [390, 844], [412, 915], [430, 932], [768, 1024], [1366, 768], [1920, 1080], [667, 375], [844, 390], [915, 412]];
const states = pwa ? ["empty", "booked", "long", "admin-empty", "loading", "error"] : ["welcome", "empty", "booked", "long", "admin", "admin-empty", "loading", "error"];
const fixture = `"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TraineeDashboard from "@/components/home/TraineeDashboard";
import { MemberNavigation } from "@/components/BottomNav";
import PageEntrance from "@/components/PageEntrance";
import TraineeShell from "@/components/TraineeShell";
function Preview() {
  const state = useSearchParams().get("state");
  const live = state === "loading" || state === "error";
  const booked = state === "booked" || state === "long" || state === "admin";
  return <TraineeShell><div className="relative min-h-0 flex-1 w-full overflow-hidden"><PageEntrance><TraineeDashboard userId="00000000-0000-0000-0000-000000000000"
    previewProfile={{ full_name: state === "long" ? "אלכסנדרהמשהישראלי בדיקה" : "נועה בדיקה", role: state?.startsWith("admin") ? "administrator" : "trainee" }}
    previewTickets={state === "empty" ? 0 : 12}
    {...(live ? {} : { previewNextClass: booked ? { id: "layout-fixture", title: state === "long" ? "אימון כוח וחיטוב לכל הגוף בקבוצת הבוקר המתקדמת" : "אימון כוח וחיטוב", start_time: ${JSON.stringify(new Date(Date.now() + 5 * 86400000).toISOString())} } : null })}
  /></PageEntrance></div><MemberNavigation pathname="/dashboard" /></TraineeShell>;
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
  if (safeAreas) {
    await call("Emulation.setSafeAreaInsetsOverride", { insets: { top: 47, bottom: 34, left: 0, right: 0 } });
  }
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `
    const visibleHeight = Number(new URLSearchParams(location.search).get("visibleHeight"));
    if (visibleHeight > 0) Object.defineProperty(window.visualViewport, "height", { configurable: true, value: visibleHeight });
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
    const viewportHeight = window.visualViewport?.scale === 1 ? Math.min(innerHeight, window.visualViewport.height) : innerHeight;
    const issues = [];
    const rect = element => element.getBoundingClientRect();
    const visible = element => {
      const screenReaderOnly = element.closest(".sr-only");
      return !element.closest('[aria-hidden="true"]') && !(screenReaderOnly && getComputedStyle(screenReaderOnly).position === "absolute") && getComputedStyle(element).visibility !== "hidden" && rect(element).height > 0;
    };
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
      if (text.left < -1 || text.right > innerWidth + 1 || text.top < -1 || text.bottom > viewportHeight + 1) issues.push("text outside viewport: " + label(parent));
      const section = parent.closest(".studio-home-heading, .studio-home-workout, .studio-home-balance");
      if (section && (text.top < rect(section).top - 1 || text.bottom > rect(section).bottom + 1)) issues.push("text outside section: " + label(parent));
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
    const shell = document.querySelector(".studio-app-shell");
    if (shell && Math.abs(rect(shell).height - viewportHeight) > 1) issues.push("shell does not fit visible viewport");
    if (shell && Math.abs(rect(main).height - rect(shell).height) > 1) issues.push("home does not inherit shell height");
    if (nav && rect(nav).bottom > viewportHeight + 1) issues.push("navigation outside visible viewport");
    for (const target of main.querySelectorAll("a, button")) {
      if (!visible(target)) continue;
      const box = rect(target);
      if (box.bottom > limit + 1) issues.push("control behind navigation: " + label(target));
      if (box.height < 44 - 1) issues.push("short touch target: " + label(target));
    }
    const workout = document.querySelector(".studio-home-workout");
    const heading = document.querySelector(".studio-home-heading");
    const mainStyle = getComputedStyle(main);
    const usableHeight = main.clientHeight - parseFloat(mainStyle.paddingTop) - parseFloat(mainStyle.paddingBottom);
    if (workout && innerWidth < 600 && usableHeight >= 700) {
      if (rect(workout).height > usableHeight * 0.46) issues.push("workout card dominates available height");
      if (rect(heading).height < rect(workout).height) issues.push("greeting is smaller than workout card");
    }
    window.scrollTo(0, 9999);
    if (scrollY !== 0) issues.push("page can scroll");
    return { issues: [...new Set(issues)], width: innerWidth, height: innerHeight, viewportHeight,
      shellHeight: shell ? rect(shell).height : null, topPadding: mainStyle.paddingTop,
      bodyFont: getComputedStyle(document.querySelector(".studio-welcome-description, .studio-home-empty-description, .studio-home-workout-time") || main).fontSize,
      cardHeight: workout ? Math.round(rect(workout).height) : null,
      headingHeight: heading ? Math.round(rect(heading).height) : null };
  })()`;
  for (const [width, height] of viewports) {
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 1000 });
    if (pwa) await call("Emulation.setSafeAreaInsetsOverride", { insets: { top: width === 390 ? 47 : 0, bottom: width === 390 ? 34 : 0, left: 0, right: 0 } });
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
      if (pwa) {
        const check = async phase => {
          await evaluate("new Promise(resolve => setTimeout(resolve, 150))");
          const result = await evaluate(inspect);
          const name = `${caseName}-${phase}`;
          results.push({ case: name, ...result });
          if (result.issues.length) {
            failures.push({ case: name, issues: result.issues });
            console.log(`FAIL ${name}: ${result.issues.join("; ")}`);
          }
          if (state === "admin-empty") {
            const screenshot = await call("Page.captureScreenshot", { format: "png" });
            await writeFile(join(output, `${name}.png`), Buffer.from(screenshot.data, "base64"));
          }
          return result;
        };
        await evaluate(`Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: ${height - 96} }); window.visualViewport.dispatchEvent(new Event('resize'));`);
        const settled = await check("settled");
        await evaluate(`Object.defineProperty(window.visualViewport, 'scale', { configurable: true, value: 2 }); window.visualViewport.dispatchEvent(new Event('resize'));`);
        const zoomedHeight = await evaluate("document.querySelector('.studio-app-shell').getBoundingClientRect().height");
        assert.equal(zoomedHeight, settled.shellHeight, "Pinch zoom preserves the shell's layout height");
        await evaluate("delete window.visualViewport.scale; delete window.visualViewport.height; window.dispatchEvent(new Event('pageshow'));");
        await check("resumed");
        await call("Page.navigate", { url: `${baseUrl}/home-layout-check?state=${state}&visibleHeight=${height - 96}` });
        let hydrated = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          hydrated = await evaluate("Boolean(document.querySelector('.studio-app-shell')?.style.getPropertyValue('--studio-viewport-bottom'))");
          if (hydrated) break;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert(hydrated, `Sign-in shell did not hydrate: ${caseName}`);
        await check("sign-in-entry");
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
  if (created) {
    await unlink(fixtureFile).catch(() => {});
    await rmdir(fixtureDir);
    // Webpack dev can leave a route checker after its source route is removed.
    for (const directory of [".next", ".next-qa"]) {
      const generatedType = new URL(`../${directory}/dev/types/app/home-layout-check/page.ts`, import.meta.url);
      await unlink(generatedType).catch(error => { if (error.code !== "ENOENT") throw error; });
    }
  }
}

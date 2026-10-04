// Local synthetic behavior/screenshot baseline. No database, email, or payment writes.
// node scripts/check-cleanup-smoke.mjs http://127.0.0.1:3120 scratch/cleanup/before
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile, unlink, rmdir, mkdtemp, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const baseUrl = process.argv[2] || "http://127.0.0.1:3120";
assert(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname));
const output = resolve(process.argv[3] || "scratch/cleanup/smoke");
const fixtureDir = resolve("src/app/cleanup-smoke-check");
const fixtureFile = join(fixtureDir, "page.tsx");
const userId = "00000000-0000-0000-0000-000000000000";
const profile = { id: userId, full_name: "בדיקת ניקוי", email: "cleanup@example.invalid", phone: "0500000000", role: "trainee" };
const session = { id: "cleanup-session", title: "אימון בדיקה", start_time: "2026-10-09T08:00:00.000Z", end_time: "2026-10-09T09:00:00.000Z", max_capacity: 8, current_bookings: 2 };
const fixture = `"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GymStoreProvider } from "@/providers/GymStoreProvider";
import { TraineeIdentity } from "@/components/TraineeIdentity";
import TraineeShell from "@/components/TraineeShell";
import { MemberNavigation } from "@/components/BottomNav";
import ProfilePage from "@/app/(trainee)/profile/page";
import MyBookingsPage from "@/app/(trainee)/my-bookings/page";
import AdminHome from "@/app/admin/page";
import AdminSchedule from "@/app/admin/schedule/page";
import AdminTrainees from "@/app/admin/trainees/page";
import AdminShell from "@/components/admin/AdminShell";
function Preview() {
  const view = useSearchParams().get("view") || "profile";
  const content = view === "profile" ? <ProfilePage /> : view === "bookings" ? <MyBookingsPage /> : view === "admin" ? <AdminHome /> : view === "schedule" ? <AdminSchedule /> : <AdminTrainees />;
  return <GymStoreProvider initialData={{userId: ${JSON.stringify(userId)}, profile: ${JSON.stringify(profile)}, tickets: 4, subscription: null}}><TraineeIdentity userId=${JSON.stringify(userId)}>
    {view === "profile" || view === "bookings" ? <TraineeShell><div className="min-h-0 flex-1 overflow-hidden">{content}</div><MemberNavigation pathname={view === "profile" ? "/profile" : "/my-bookings"}/></TraineeShell> : <AdminShell>{content}</AdminShell>}
  </TraineeIdentity></GymStoreProvider>;
}
export default function CleanupPreview() { return <Suspense><Preview /></Suspense>; }
`;
let created = false;
let chrome;
let ws;
const results = [];
try {
  await mkdir(output, { recursive: true });
  await mkdir(fixtureDir); // Never overwrite an existing route.
  created = true;
  await writeFile(fixtureFile, fixture, { flag: "wx" });
  // Warm compilation before Chrome's navigation deadline.
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if ((await fetch(`${baseUrl}/cleanup-smoke-check`, { signal: AbortSignal.timeout(180000) })).ok) { ready = true; break; }
    await new Promise(done => setTimeout(done, 500));
  }
  assert(ready, "Development server did not discover the fixture route");
  const browserProfile = await mkdtemp(join(tmpdir(), "talia-cleanup-smoke-"));
  chrome = spawn(process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", ["--headless=new", "--no-sandbox", `--user-data-dir=${browserProfile}`, "--remote-debugging-port=0", "--remote-allow-origins=*", "--no-first-run", "about:blank"], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const wsUrl = await new Promise((resolveUrl, reject) => {
    const timer = setTimeout(() => reject(new Error("Chrome startup timed out")), 15000);
    chrome.on("error", reject);
    chrome.stderr.on("data", data => {
      const match = String(data).match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) { clearTimeout(timer); resolveUrl(match[1]); }
    });
  });
  ws = new WebSocket(wsUrl);
  await new Promise((open, reject) => { ws.onopen = open; ws.onerror = reject; });
  const pending = new Map();
  let id = 0;
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolveCall, reject) => {
    const callId = ++id;
    const timer = setTimeout(() => { pending.delete(callId); reject(new Error(`${method} timed out`)); }, 120000);
    pending.set(callId, { resolve: resolveCall, reject, timer });
    ws.send(JSON.stringify({ id: callId, method, params, sessionId }));
  });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  const evaluate = async expression => {
    const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await call("Page.enable");
  await call("Runtime.enable");
  await call("Network.enable");
  await call("Network.setBypassServiceWorker", { bypass: true });
  await call("Network.setBlockedURLs", { urls: ["*onesignal.com*", "*supabase.co*"] });
  await call("Emulation.setTimezoneOverride", { timezoneId: "Asia/Jerusalem" });
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `
    const NativeDate = Date;
    window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : ["2026-10-04T08:00:00Z"])); } static now() { return +new NativeDate("2026-10-04T08:00:00Z"); } };
    window.__cleanupRequests = [];
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, options = {}) => {
      const url = new URL(typeof input === "string" ? input : input.url || String(input), location.href);
      if (!url.hostname.endsWith("supabase.co")) return nativeFetch(input, options);
      const method = options.method || input.method || "GET";
      window.__cleanupRequests.push({ path: url.pathname, method });
      const response = (body, status = 200) => Promise.resolve(new Response(JSON.stringify(body), {status, headers: {"content-type": "application/json", "content-range": "0-0/1"}}));
      if (url.pathname.endsWith("/auth/v1/otp")) return response({});
      if (url.pathname.endsWith("/auth/v1/verify")) return response({ message: "Synthetic invalid OTP", code: "otp_expired" }, 400);
      if (url.pathname.includes("/rpc/get_available_tickets")) return response(4);
      if (url.pathname.includes("/rpc/get_user_subscription")) return response([]);
      if (!["GET", "HEAD"].includes(method)) throw new Error("Cleanup smoke forbids database mutations");
      if (method === "HEAD") return response(null);
      const empty = new URLSearchParams(location.search).get("state") === "empty";
      if (url.pathname.endsWith("/profiles")) return response(location.search.includes("view=profile") ? ${JSON.stringify(profile)} : [${JSON.stringify(profile)}]);
      if (url.pathname.endsWith("/health_declarations")) return response({is_healthy: null, medical_conditions: ""});
      if (url.pathname.endsWith("/user_tickets")) return response([{id: "cleanup-ticket", user_id: ${JSON.stringify(userId)}}]);
      if (url.pathname.endsWith("/gym_sessions") || url.pathname.endsWith("/gym_sessions_with_counts")) return response(empty ? [] : [{...${JSON.stringify(session)}, bookings: [{count: 2}]}]);
      if (url.pathname.endsWith("/bookings")) return response(empty ? [] : [{id: "cleanup-booking", status: "confirmed", created_at: "2026-10-04T08:00:00Z", session: ${JSON.stringify(session)}}]);
      return response({message: "Unmocked cleanup request"}, 500);
    };
  ` });
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (await evaluate(expression)) return;
      await new Promise(done => setTimeout(done, 100));
    }
    throw new Error(`Did not become ready: ${expression}`);
  };
  const navigate = async (path, ready) => {
    await call("Page.navigate", { url: baseUrl + path });
    await waitFor(ready);
    await evaluate("document.fonts.ready");
    await new Promise(done => setTimeout(done, 600));
    await evaluate(`(() => { const style = document.createElement("style"); style.textContent = "*,*::before,*::after{caret-color:transparent!important;animation:none!important;transition:none!important}nextjs-portal{display:none!important}"; document.head.append(style); })()`);
  };
  const screenshot = async name => {
    await new Promise(done => setTimeout(done, 800));
    const { data } = await call("Page.captureScreenshot", { format: "png" });
    await writeFile(join(output, name + ".png"), Buffer.from(data, "base64"));
    results.push({ case: name, requests: await evaluate("window.__cleanupRequests") });
  };
  const clickText = text => evaluate(`(() => { const b = [...document.querySelectorAll("button")].find(b => (b.textContent + b.getAttribute("aria-label")).includes(${JSON.stringify(text)})); if (!b) throw new Error(${JSON.stringify(`Missing button: ${text}`)}); b.click(); })()`);
  const type = async (selector, value) => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
    await call("Input.insertText", { text: value });
  };
  for (const [width, height] of [[390, 844], [1366, 768]]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    const label = `${width}x${height}`;
    await navigate("/auth/login", "Boolean(document.querySelector('.studio-welcome-actions'))");
    await screenshot(`login-${label}`);
    await clickText("מייל");
    await waitFor("Boolean(document.querySelector('#login-email'))");
    await screenshot(`login-email-${label}`);
    await type("#login-email", "cleanup@example.invalid");
    await evaluate("document.querySelector('form').requestSubmit()");
    await waitFor("Boolean(document.querySelector('#login-code'))");
    await screenshot(`login-otp-${label}`);
    await type("#login-code", "123456");
    await evaluate("document.querySelector('form').requestSubmit()");
    await waitFor("document.body.textContent.includes('הקוד לא תקין')");
    await screenshot(`login-error-${label}`);
    await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
    await waitFor("!document.querySelector('[role=dialog]')");
    if (process.argv.includes("--login-only")) continue;
    await navigate("/onboarding", "Boolean(document.querySelector('#onboarding-name'))");
    assert(await evaluate("document.querySelector('footer button:last-child').disabled"));
    await screenshot(`onboarding-name-${label}`);
    await type("#onboarding-name", "בדיקת ניקוי");
    await clickText("המשך");
    await waitFor("Boolean(document.querySelector('#onboarding-age'))");
    await type("#onboarding-age", "25");
    await screenshot(`onboarding-age-${label}`);
    await clickText("המשך");
    await waitFor("Boolean(document.querySelector('#onboarding-phone'))");
    await type("#onboarding-phone", "0500000000");
    await screenshot(`onboarding-phone-${label}`);
    await clickText("המשך");
    await waitFor("document.body.textContent.includes('יש משהו שחשוב')");
    await clickText("יש משהו שחשוב");
    await waitFor("Boolean(document.querySelector('#onboarding-health'))");
    assert(await evaluate("document.querySelector('footer button:last-child').disabled"));
    await screenshot(`onboarding-health-${label}`);
    for (const view of ["profile", "bookings", "admin", "schedule", "trainees"]) {
      await navigate(`/cleanup-smoke-check?view=${view}`, "Boolean(document.querySelector('h1'))");
      await screenshot(`${view}-${label}`);
      if (view === "profile") {
        await clickText("עריכה");
        await waitFor("Boolean(document.querySelector('input'))");
        await screenshot(`profile-edit-${label}`);
      }
      if (view === "bookings") {
        await clickText("ביטול");
        await waitFor("Boolean(document.querySelector('[role=dialog]'))");
        await screenshot(`cancel-dialog-${label}`);
      }
      if (view === "schedule") {
        await clickText("חדש");
        await waitFor("Boolean(document.querySelector('input'))");
        await screenshot(`create-class-${label}`);
      }
    }
    await navigate("/cleanup-smoke-check?view=bookings&state=empty", "document.body.textContent.includes('אימונים')");
    await screenshot(`bookings-empty-${label}`);
    await navigate("/~offline", "Boolean(document.querySelector('h1'))");
    await screenshot(`offline-${label}`);
    await navigate("/auth/auth-code-error", "Boolean(document.querySelector('h1'))");
    await screenshot(`auth-error-${label}`);
    console.log(`Passed synthetic journeys at ${label}`);
  }
  await writeFile(join(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(`PASS: ${results.length} screenshots; ${process.argv.includes("--login-only") ? "login, OTP error and Escape" : "OTP error, Escape, onboarding validation, profile editing, cancellation and class dialogs"}. Evidence: ${output}`);
} finally {
  ws?.close();
  chrome?.kill();
  if (created) {
    await unlink(fixtureFile);
    await rmdir(fixtureDir);
    for (const directory of await readdir(process.cwd())) {
      if (!directory.startsWith(".next")) continue;
      await unlink(join(directory, "dev/types/app/cleanup-smoke-check/page.ts")).catch(error => {
        if (error.code !== "ENOENT") throw error;
      });
    }
  }
}

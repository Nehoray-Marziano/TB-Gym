// Local synthetic behavior/screenshot baseline. No database, email, or payment writes.
// node scripts/check-cleanup-smoke.mjs http://127.0.0.1:3120 scratch/cleanup/before
// --copy-check verifies value copying on four phones; --profile-only --viewport=320 isolates profile feedback.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, writeFile, unlink, rmdir, mkdtemp, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const baseUrl = process.argv[2] || "http://127.0.0.1:3120";
const copyCheck = process.argv.includes("--copy-check");
const profileOnly = process.argv.includes("--profile-only");
assert(!profileOnly || copyCheck);
const viewportFilter = process.argv.find(value => value.startsWith("--viewport="))?.split("=")[1];
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
import PaymentModal from "@/components/subscription/PaymentModal";
function Preview() {
  const view = useSearchParams().get("view") || "profile";
  const content = view === "profile" ? <ProfilePage /> : view === "bookings" ? <MyBookingsPage /> : view === "admin" ? <AdminHome /> : view === "schedule" ? <AdminSchedule /> : view === "payment" ? <PaymentModal isOpen onClose={() => {}} onConfirm={() => false} amount={450} userName="בדיקת ניקוי" tierDisplay="8 אימונים" tone="sage" /> : <AdminTrainees />;
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
const browserErrors = [];
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
    if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails);
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
    const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await call("Page.enable");
  await call("Runtime.enable");
  await call("Network.enable");
  await call("Network.setBypassServiceWorker", { bypass: true });
  await call("Network.setBlockedURLs", { urls: ["*onesignal.com*", "*supabase.co*"] });
  if (copyCheck) await send("Browser.grantPermissions", { origin: new URL(baseUrl).origin, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });
  await call("Emulation.setTimezoneOverride", { timezoneId: "Asia/Jerusalem" });
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `
    const NativeDate = Date;
    window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : ["2026-10-04T08:00:00Z"])); } static now() { return +new NativeDate("2026-10-04T08:00:00Z"); } };
    window.__cleanupRequests = [];
    window.__copyWrites = [];
    if (${copyCheck}) {
      const writeText = navigator.clipboard.writeText.bind(navigator.clipboard);
      Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: async value => {
        if (window.__copyFailure) throw new DOMException("Synthetic clipboard denial", "NotAllowedError");
        if (window.__copyDelay) await new Promise(resolve => setTimeout(resolve, 300));
        await writeText(value);
        window.__copyWrites.push(value);
      }});
    }
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
      if (url.pathname.endsWith("/profiles")) return response(location.search.includes("view=profile") ? ${JSON.stringify(profile)} : [${JSON.stringify(profile)}, ...(${copyCheck} ? [{...${JSON.stringify(profile)}, id: "00000000-0000-0000-0000-000000000001", full_name: "שם בדיקה ארוך מאוד לצורך בדיקת שבירת שורות", email: "very.long.synthetic.email.for.mobile.layout@example.invalid", phone: ""}] : [])]);
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
    await writeFile(join(output, "failure.json"), JSON.stringify({ expression, browserErrors, page: await evaluate("({url: location.href, text: document.body.textContent})") }, null, 2));
    const { data } = await call("Page.captureScreenshot", { format: "png" });
    await writeFile(join(output, "failure.png"), Buffer.from(data, "base64"));
    throw new Error(`Did not become ready: ${expression}; see ${join(output, "failure.json")}`);
  };
  const navigate = async (path, ready) => {
    await call("Page.navigate", { url: baseUrl + path });
    await waitFor(ready);
    // SSR text can render before the root client policy has hydrated.
    if (copyCheck) await waitFor("(() => { const event = new ClipboardEvent('copy', {bubbles: true, cancelable: true}); document.body.dispatchEvent(event); return event.defaultPrevented; })()");
    await evaluate("document.fonts.ready");
    await new Promise(done => setTimeout(done, 600));
    await evaluate(`(() => { const style = document.createElement("style"); style.textContent = "*,*::before,*::after{caret-color:transparent!important;animation:none!important;transition:none!important}nextjs-portal{display:none!important}"; document.head.append(style); })()`);
  };
  const screenshot = async name => {
    if (copyCheck) {
      const issues = await evaluate(`(() => {
        const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden";
        const issues = [];
        for (const field of [...document.querySelectorAll("input,textarea")].filter(visible)) {
          const wrapper = field.closest(".studio-copy-field");
          if (!wrapper) issues.push("Field lacks copy control: " + (field.id || field.type));
          else if (Boolean(wrapper.querySelector("button").disabled) !== Boolean(field.disabled || !field.value)) issues.push("Wrong empty/disabled copy state");
          if (wrapper && getComputedStyle(field).textAlign !== "center" && getComputedStyle(wrapper).direction !== getComputedStyle(field).direction) issues.push("Copy placement differs from field direction");
          if (getComputedStyle(field).userSelect !== "none") issues.push("Selectable field");
        }
        for (const button of [...document.querySelectorAll(".studio-copy-button")].filter(visible)) {
          const r = button.getBoundingClientRect();
          if (r.width < 48 || r.height < 48) issues.push("Copy target below 48px");
          if (r.left < 0 || r.right > innerWidth) issues.push("Copy target outside viewport");
          if (!button.getAttribute("aria-label")) issues.push("Unlabelled copy button");
        }
        if (document.documentElement.scrollWidth > innerWidth) issues.push("Horizontal page overflow");
        if ([...document.querySelectorAll("h1,h2,p,label")].filter(visible).some(e => getComputedStyle(e).userSelect !== "none")) issues.push("Selectable display text");
        const event = new ClipboardEvent("copy", {bubbles: true, cancelable: true});
        document.body.dispatchEvent(event);
        if (!event.defaultPrevented) issues.push("Native copy is not blocked");
        return issues;
      })()`);
      assert.deepEqual(issues, [], name);
    }
    await new Promise(done => setTimeout(done, 800));
    const { data } = await call("Page.captureScreenshot", { format: "png" });
    await writeFile(join(output, name + ".png"), Buffer.from(data, "base64"));
    results.push({ case: name, requests: await evaluate("window.__cleanupRequests") });
  };
  const clickText = text => evaluate(`(() => { const b = [...document.querySelectorAll("button")].find(b => (b.textContent + b.getAttribute("aria-label")).includes(${JSON.stringify(text)})); if (!b) throw new Error(${JSON.stringify(`Missing button: ${text}`)}); b.click(); })()`);
  const type = async (selector, value) => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
    await call("Input.insertText", { text: value });
    if (copyCheck) await copyField(selector);
  };
  const verifyCopy = async (selector, expected) => {
    const before = await evaluate("window.__copyWrites.length");
    const requests = await evaluate("window.__cleanupRequests.length");
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    await waitFor(`window.__copyWrites.length === ${before + 1}`);
    assert.equal(await evaluate("window.__copyWrites.at(-1)"), expected, "The app copies the complete, unmodified value");
    // Windows normalizes system clipboard line endings to CRLF.
    assert.equal((await evaluate("navigator.clipboard.readText()")).replace(/\r\n/g, "\n"), expected.replace(/\r\n/g, "\n"));
    assert.equal(await evaluate("window.__cleanupRequests.length"), requests, "Copy must not submit forms or write data");
  };
  const copyField = async selector => {
    const value = await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`);
    await verifyCopy(`${selector} + .studio-copy-action button`, value);
    await evaluate("navigator.clipboard.writeText('native-copy-sentinel')");
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus(); document.querySelector(${JSON.stringify(selector)}).select(); document.execCommand("copy");`);
    assert.equal(await evaluate("navigator.clipboard.readText()"), "native-copy-sentinel", "Native copy must leave clipboard intact");
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).blur()`);
  };
  const viewports = copyCheck ? [[320, 568], [375, 667], [390, 844], [430, 932]] : [[390, 844], [1366, 768]];
  assert(!viewportFilter || viewports.some(([width]) => String(width) === viewportFilter));
  for (const [width, height] of viewports.filter(([width]) => !viewportFilter || String(width) === viewportFilter)) {
    await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    const label = `${width}x${height}`;
    if (!profileOnly) {
    await navigate("/auth/login", "Boolean(document.querySelector('.studio-welcome-actions'))");
    await screenshot(`login-${label}`);
    await clickText("מייל");
    await waitFor("Boolean(document.querySelector('#login-email'))");
    await screenshot(`login-email-${label}`);
    await type("#login-email", "cleanup@example.invalid");
    if (copyCheck) {
      const selector = "#login-email + .studio-copy-action button";
      await evaluate("window.__copyFailure = true");
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
      await waitFor("document.body.textContent.includes('ההעתקה נכשלה')");
      await screenshot(`copy-error-${label}`);
      await evaluate("window.__copyFailure = false; window.__copyDelay = true");
      const count = await evaluate("window.__copyWrites.length");
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).click(); document.querySelector(${JSON.stringify(selector)}).click()`);
      assert(await evaluate(`document.querySelector(${JSON.stringify(selector)}).getAttribute("aria-busy") === "true"`));
      await waitFor(`window.__copyWrites.length === ${count + 1}`);
      await evaluate("window.__copyDelay = false");
      await screenshot(`copy-retry-${label}`);
    }
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
    if (copyCheck) await type("#onboarding-health", "מידע סינתטי בלבד\nשורה נוספת לבדיקה");
    }
    for (const view of profileOnly ? ["profile"] : copyCheck ? ["profile", "schedule", "trainees", "payment"] : ["profile", "bookings", "admin", "schedule", "trainees"]) {
      await navigate(`/cleanup-smoke-check?view=${view}`, view === "payment" ? "Boolean(document.querySelector('dialog[open]'))" : "Boolean(document.querySelector('h1'))");
      await screenshot(`${view}-${label}`);
      if (view === "profile") {
        await clickText("עריכה");
        await waitFor("Boolean(document.querySelector('input'))");
        if (copyCheck) {
          await copyField('input[aria-label="שם מלא"]');
          await evaluate("document.querySelector('details').open = true");
          await copyField('input[aria-label="מספר נייד"]');
          await clickText("יש מגבלות");
          await waitFor("Boolean(document.querySelector('textarea'))");
          await type("textarea", "הצהרה סינתטית\nשורה נוספת");
          await evaluate("window.__copyFailure = true; document.querySelector('textarea + .studio-copy-action button').click()");
          await waitFor("document.querySelector('textarea + .studio-copy-action .studio-copy-feedback[data-error=true]')?.textContent.includes('נסי שוב')");
          assert(await evaluate(`(() => {
            const feedback = document.querySelector('textarea + .studio-copy-action .studio-copy-feedback').getBoundingClientRect();
            const field = document.querySelector('textarea').getBoundingClientRect();
            return feedback.top >= field.top && feedback.bottom <= field.bottom && feedback.left >= field.left && feedback.right <= field.right;
          })()`), "Textarea copy error must remain visible inside its clipped disclosure");
          await screenshot(`textarea-copy-error-${label}`);
          await evaluate("window.__copyFailure = false");
          await copyField("textarea");
        }
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
        if (copyCheck) {
          await type("#new-session-title", "אימון בדיקה");
          assert(await evaluate("document.querySelector('[aria-label=\"העתקת תאריך האימון\"]').disabled"));
          await clickText("בחירת תאריך");
          await waitFor("Boolean(document.querySelector('[role=dialog] table'))");
          await evaluate("[...document.querySelectorAll('[role=dialog] table button')].find(b => b.textContent === '9' && !b.classList.contains('day-outside')).click()");
          await waitFor("!document.querySelector('[aria-label=\"העתקת תאריך האימון\"]').disabled");
          await verifyCopy('[aria-label="העתקת תאריך האימון"]', await evaluate("document.querySelector('[aria-label=\"העתקת תאריך האימון\"]').closest('.space-y-2').querySelector('[aria-haspopup=dialog]').textContent"));
          await verifyCopy('[aria-label="העתקת שעת האימון"]', "08:00");
          await clickText("08:00");
          await waitFor("Boolean(document.querySelector('.MuiDialog-root [role=dialog]'))");
          await screenshot(`clock-${label}`);
          await clickText("ביטול");
          await waitFor("!document.querySelector('.MuiDialog-root')");
        }
        await screenshot(`create-class-${label}`);
        if (copyCheck) {
          await clickText("בחירת מתאמנות");
          await clickText("בחירת מתאמנות לאימון");
          await waitFor("Boolean(document.querySelector('input[aria-label=\"חיפוש מתאמנת\"]'))");
          await type('input[aria-label="חיפוש מתאמנת"]', "בדיקת");
          await screenshot(`trainee-selector-${label}`);
        }
      }
      if (copyCheck && view === "trainees") {
        await waitFor("document.querySelectorAll('article').length === 2");
        for (const [label, key] of [["העתקת שם המתאמנת", "full_name"], ["העתקת כתובת המייל של המתאמנת", "email"], ["העתקת מספר הנייד של המתאמנת", "phone"]]) {
          await verifyCopy(`article:first-of-type [aria-label="${label}"]`, profile[key]);
        }
        const count = await evaluate("window.__copyWrites.length");
        await evaluate("document.querySelector('article [aria-label=\"העתקת שם המתאמנת\"]').focus()");
        await call("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
        await call("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
        await waitFor(`window.__copyWrites.length === ${count + 1}`);
        assert.equal(await evaluate("navigator.clipboard.readText()"), profile.full_name);
        assert(await evaluate("document.querySelectorAll('article')[1].querySelector('[aria-label=\"העתקת מספר הנייד של המתאמנת\"]').disabled"));
        await screenshot(`trainee-copy-${label}`);
        await type('input[aria-label="חיפוש מתאמנת"]', "cleanup");
        await clickText("עדכון יתרה");
        await waitFor("Boolean(document.querySelector('#ticket-change'))");
        await type("#ticket-change", "2");
        await screenshot(`ticket-copy-${label}`);
      }
      if (copyCheck && view === "payment") {
        const expected = await evaluate("document.querySelector('.membership-copy-box p').textContent");
        await verifyCopy('[aria-label="העתקת תיאור התשלום"]', expected);
        await evaluate("window.__copyFailure = true");
        await evaluate("document.querySelector('[aria-label=\"העתקת תיאור התשלום\"]').click()");
        await waitFor("document.querySelector('.membership-copy-feedback').textContent.includes('נסי שוב')");
        await screenshot(`payment-copy-error-${label}`);
        await evaluate("window.__copyFailure = false");
        await verifyCopy('[aria-label="העתקת תיאור התשלום"]', expected);
        await screenshot(`payment-copy-${label}`);
      }
    }
    if (copyCheck) { console.log(`Passed ${profileOnly ? "profile fields and error feedback" : "clipboard, failure/retry, fields and trainee directory"} at ${label}`); continue; }
    await navigate("/cleanup-smoke-check?view=bookings&state=empty", "document.body.textContent.includes('אימונים')");
    await screenshot(`bookings-empty-${label}`);
    await navigate("/~offline", "Boolean(document.querySelector('h1'))");
    await screenshot(`offline-${label}`);
    await navigate("/auth/auth-code-error", "Boolean(document.querySelector('h1'))");
    await screenshot(`auth-error-${label}`);
    console.log(`Passed synthetic journeys at ${label}`);
  }
  await writeFile(join(output, "results.json"), JSON.stringify(results, null, 2));
  console.log(`PASS: ${results.length} screenshots; ${profileOnly ? "profile clipboard values, error feedback containment and native copy suppression" : copyCheck ? "native copy suppression, clipboard values, denial/retry, duplicate clicks, field coverage, trainee contacts and receipt copy" : process.argv.includes("--login-only") ? "login, OTP error and Escape" : "OTP error, Escape, onboarding validation, profile editing, cancellation and class dialogs"}. Evidence: ${output}`);
} finally {
  ws?.close();
  if (chrome?.pid && process.platform === "win32") spawnSync("taskkill", ["/PID", String(chrome.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  else chrome?.kill();
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

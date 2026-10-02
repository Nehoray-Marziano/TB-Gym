// Synthetic browser regression checks. Never submits real bookings or cancellations.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, unlink, rmdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const baseUrl = process.argv[2] || "http://127.0.0.1:3100";
assert(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname));
const output = resolve("scratch/member-navigation-qa");
const fixtureDir = resolve("src/app/member-navigation-check");
const fixtureFile = join(fixtureDir, "page.tsx");
const sessions = Array.from({ length: 16 }, (_, index) => ({
    id: `navigation-fixture-${index}`, title: index === 0 ? "אימון כוח ועיצוב דינמי" : `אימון בדיקה ${index}`,
    start_time: new Date(Date.now() + (24 + index) * 3600000).toISOString(),
    end_time: new Date(Date.now() + (25 + index) * 3600000).toISOString(),
    max_capacity: 8, current_bookings: 3, isRegistered: index === 0,
}));
const fixture = `"use client";
import { useState } from "react";
import BookingExperience from "@/components/book/BookingExperience";
import { MemberNavigation } from "@/components/BottomNav";
import { StudioModal } from "@/components/ui/StudioModal";
import { TraineeIdentity } from "@/components/TraineeIdentity";
export default function Preview() {
  const [path, setPath] = useState("/book");
  const [long, setLong] = useState(false);
  const [busy, setBusy] = useState(false);
  return <TraineeIdentity userId="00000000-0000-0000-0000-000000000000"><div className="studio-app-shell">
    <div className="h-full overflow-hidden">
      <BookingExperience previewSessions={${JSON.stringify(sessions)}} previewTickets={3} previewLoading={false}/>
      <div hidden><button id="change-route" onClick={()=>setPath(path==="/book"?"/profile":"/book")}/><button id="long-modal" onClick={()=>setLong(true)}/></div>
      {long && <StudioModal titleId="long-title" busy={busy} onClose={()=>setLong(false)} actions={<><button id="fixture-confirm" disabled={busy}>כן, לבטל את ההרשמה</button><button id="fixture-return" data-modal-cancel disabled={busy} onClick={()=>setLong(false)}>להישאר רשומה (חזרה)</button></>}><button id="set-busy" type="button" hidden onClick={()=>setBusy(!busy)}/><h2 id="long-title">לבטל את ההרשמה?</h2><p>{"אימון עם שם ארוך מאוד והסבר על הביטול. ".repeat(100)}</p><input id="modal-input" aria-label="בדיקת מקלדת"/></StudioModal>}
    </div><MemberNavigation pathname={path}/>
  </div></TraineeIdentity>;
}`;

let chrome, ws, created = false;
const checks = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
    await mkdir(output, { recursive: true });
    // Exclusive creation protects any pre-existing developer fixture.
    if (!process.argv.includes("--existing-fixture")) {
        await mkdir(fixtureDir);
        created = true;
        await writeFile(fixtureFile, fixture, "utf8");
    }
    if (process.argv.includes("--prepare-only")) {
        created = false;
        console.log("Prepared synthetic production-build fixture");
        process.exit(0);
    }
    let serverReady = false;
    for (let attempt = 0; attempt < 40; attempt++) {
        const response = await fetch(`${baseUrl}/member-navigation-check`, { signal: AbortSignal.timeout(120000) });
        if (response.ok && (await response.text()).includes("studio-member-navigation")) { serverReady = true; break; }
        await delay(1000);
    }
    assert(serverReady, "Development server did not discover the fixture route");
    const profile = await mkdtemp(join(output, "chrome-"));
    chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
        "--headless=new", "--disable-gpu", "--no-sandbox", "--remote-debugging-port=0", "--remote-allow-origins=*",
        `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "about:blank",
    ], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    const wsUrl = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Chrome startup timeout")), 60000);
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
        const timeout = setTimeout(() => reject(new Error(`${method} timeout`)), method === "Page.navigate" ? 180000 : 45000);
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
    const waitFor = async (expression, label) => {
        for (let index = 0; index < 360; index++) {
            try { if (await evaluate(expression)) return; } catch { /* Navigation can invalidate execution contexts. */ }
            await delay(250);
        }
        console.log("Browser diagnostics", await evaluate("JSON.stringify({url:location.href,title:document.title,articles:document.querySelectorAll('article').length,nav:document.querySelector('.studio-member-navigation')?.outerHTML.slice(0,350),body:document.body.innerText.slice(0,900)})"));
        const failure = await call("Page.captureScreenshot", { format: "png" });
        await writeFile(join(output, "failure.png"), Buffer.from(failure.data, "base64"));
        throw new Error(`Timed out: ${label}`);
    };
    const check = async (label, expression) => {
        for (let attempt = 0; attempt < 40; attempt++) {
            if (await evaluate(expression)) { checks.push(label); console.log("PASS:", label); return; }
            await delay(100);
        }
        console.log("Check diagnostics", await evaluate("JSON.stringify({dock:document.querySelector('.studio-member-navigation')?.outerHTML.slice(0,350),scrollTop:document.querySelector('[data-member-scroll]')?.scrollTop,focus:document.activeElement?.outerHTML.slice(0,200)})"));
        await screenshot("failure");
        assert.fail(label);
    };
    const key = async (key, code = key, modifiers = 0) => {
        const windowsVirtualKeyCode = { Tab: 9, Escape: 27 }[key];
        await call("Input.dispatchKeyEvent", { type: "keyDown", key, code, modifiers, windowsVirtualKeyCode });
        await call("Input.dispatchKeyEvent", { type: "keyUp", key, code, modifiers, windowsVirtualKeyCode });
    };
    const scrollTo = async top => { await evaluate(`document.querySelector('[data-member-scroll]').scrollTop=${top}`); await delay(350); };
    const screenshot = async name => { const result = await call("Page.captureScreenshot", { format: "png" }); await writeFile(join(output, `${name}.png`), Buffer.from(result.data, "base64")); };
    await call("Page.enable");
    await call("Page.bringToFront");
    await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    const navigation = await call("Page.navigate", { url: `${baseUrl}/member-navigation-check` });
    assert(!navigation.errorText, `Browser navigation failed: ${navigation.errorText}`);
    await delay(500);
    if (await evaluate("location.href==='about:blank'")) {
        await evaluate(`location.href=${JSON.stringify(`${baseUrl}/member-navigation-check`)}`);
    }
    await waitFor("document.querySelectorAll('article').length===16 && document.querySelector('.studio-member-navigation')?.dataset.hidden==='false'", "fixture hydration");
    await delay(400);
    await check("Dock visible on entry", "document.querySelector('.studio-member-navigation').dataset.hidden==='false'");
    // Keep development chrome out of the visual evidence.
    await evaluate("document.querySelector('nextjs-portal')?.setAttribute('hidden','')");
    await screenshot("navigation-glass-390x844");
    await evaluate("(()=>{const layer=document.createElement('div');layer.id='glass-background-fixture';layer.style.cssText='position:fixed;inset:0;z-index:40;background:var(--studio-deep);pointer-events:none';document.querySelector('.studio-app-shell').append(layer)})()");
    await delay(150);
    await screenshot("navigation-glass-dark-390x844");
    await evaluate("document.querySelector('#glass-background-fixture').style.background='linear-gradient(90deg,var(--studio-deep) 0 33%,var(--studio-coral-bg) 33% 66%,var(--studio-canvas) 66% 100%)'");
    await delay(150);
    await screenshot("navigation-glass-pattern-390x844");
    await evaluate("document.querySelector('#glass-background-fixture').remove()");
    const tap = await evaluate("(()=>{const a=document.querySelectorAll('.studio-member-navigation a')[1];a.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation()},{capture:true,once:true});const r=a.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
    await call("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...tap });
    await call("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...tap });
    await scrollTo(300);
    await check("Pointer focus does not pin navigation", "document.querySelector('.studio-member-navigation').dataset.hidden==='true'");
    await check("Downward scroll hides dock", "document.querySelector('.studio-member-navigation').dataset.hidden==='true' && getComputedStyle(document.querySelector('.studio-member-navigation')).opacity==='0'");
    await scrollTo(296);
    await check("Small reverse movement does not flicker", "document.querySelector('.studio-member-navigation').dataset.hidden==='true'");
    await scrollTo(284);
    await check("Upward scroll reveals dock", "document.querySelector('.studio-member-navigation').dataset.hidden==='false'");
    await scrollTo(400);
    await key("Tab");
    await check("Tab reveals navigation", "document.querySelector('.studio-member-navigation').dataset.hidden==='false'");
    await evaluate("document.querySelector('.studio-member-navigation a').focus()");
    await scrollTo(500);
    await check("Focused navigation stays visible", "document.querySelector('.studio-member-navigation').dataset.hidden==='false'");
    await evaluate("document.activeElement.blur()");
    await scrollTo(600);
    await evaluate("document.querySelector('#change-route').click()");
    await delay(350);
    await check("Route change reveals dock", "document.querySelector('.studio-member-navigation').dataset.hidden==='false'");
    await scrollTo(0);
    await evaluate("document.querySelector('.studio-day-strip').scrollLeft=-100");
    await delay(300);
    await check("Horizontal calendar does not hide dock", "document.querySelector('.studio-member-navigation').dataset.hidden==='false'");
    await evaluate("(()=>{document.querySelector('.studio-book-page').removeAttribute('data-member-scroll');const s=document.createElement('div');s.id='replacement-scroller';s.setAttribute('data-member-scroll','');s.style.cssText='position:fixed;inset:0;overflow:auto';s.innerHTML='<div style=height:3000px>Replacement route test</div>';document.querySelector('.studio-app-shell').append(s)})()");
    await delay(100);
    await scrollTo(300);
    await check("Replacement route scroller responds to its first gesture", "document.querySelector('.studio-member-navigation').dataset.hidden==='true'");
    await evaluate("document.querySelector('#replacement-scroller').remove();document.querySelector('.studio-book-page').setAttribute('data-member-scroll','')");
    await check("Route error or loading replacement reveals navigation", "document.querySelector('.studio-member-navigation').dataset.hidden==='false'");
    await evaluate("const field=document.createElement('input');field.id='editing-fixture';document.querySelector('[data-member-scroll]').prepend(field);field.focus()");
    await delay(350);
    await check("Text entry suppresses and isolates dock", "document.querySelector('.studio-member-navigation').inert && document.querySelector('.studio-member-navigation').getAttribute('aria-hidden')==='true'");
    await evaluate("document.querySelector('#editing-fixture').remove()");
    await delay(350);
    await check("Dock returns after text entry", "!document.querySelector('.studio-member-navigation').inert && document.querySelector('.studio-member-navigation').dataset.hidden==='false'");
    await evaluate("(()=>{const b=[...document.querySelectorAll('article button')].find(b=>b.textContent.includes('ביטול הרשמה'));b.focus();b.click()})()");
    await waitFor("document.querySelector('dialog:modal') && document.querySelector('.studio-member-navigation').inert", "cancellation modal");
    await delay(350);
    await check("Real cancellation action exists and is hit-testable", "(()=>{const b=[...document.querySelectorAll('dialog button')].find(b=>b.textContent.includes('כן, לבטל'));const r=b.getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight && b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()");
    await check("Safe action initially focused", "document.activeElement.hasAttribute('data-modal-cancel')");
    await check("Navigation retreats below cancellation actions", "document.querySelector('.studio-member-navigation').getBoundingClientRect().top>=innerHeight");
    await check("Route scrolling locked behind dialog", "getComputedStyle(document.querySelector('[data-member-scroll]')).overflowY==='hidden'");
    await screenshot("cancellation-390x844");
    await key("Tab");
    await check("Focus stays in native modal", "document.querySelector('dialog:modal').contains(document.activeElement)");
    await key("Escape");
    await waitFor("!document.querySelector('dialog:modal') && document.querySelector('.studio-member-navigation').dataset.hidden==='false'", "modal dismissal");
    await check("Focus returns to cancellation trigger", "document.activeElement.tagName==='BUTTON' && document.activeElement.textContent.includes('ביטול הרשמה')");
    await evaluate("document.querySelectorAll('article')[1].querySelector('button').click()");
    await waitFor("Boolean(document.querySelector('dialog:modal[data-variant=booking]'))", "booking sheet");
    await delay(350);
    await check("Booking confirmation actions reachable", "(()=>{const b=[...document.querySelectorAll('dialog button')].find(b=>b.textContent.includes('אישור והרשמה'));const r=b.getBoundingClientRect();return r.bottom<=innerHeight && b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()");
    await screenshot("booking-390x844");
    await check("Navigation retreats below booking actions", "document.querySelector('.studio-member-navigation').getBoundingClientRect().top>=innerHeight");
    await key("Escape");
    await waitFor("!document.querySelector('dialog:modal')", "booking sheet dismissal");
    await evaluate("(()=>{const d=document.createElement('div');d.id='role-fixture';d.setAttribute('role','dialog');d.setAttribute('aria-modal','false');d.textContent='Nonmodal test';document.body.append(d)})()");
    await delay(350);
    await check("Nonmodal dialog does not suppress navigation", "!document.querySelector('.studio-member-navigation').inert");
    await evaluate("(()=>{const d=document.querySelector('#role-fixture');d.setAttribute('role','alertdialog');d.setAttribute('aria-modal','true')})()");
    await delay(350);
    await check("Alert dialog suppresses navigation", "document.querySelector('.studio-member-navigation').inert");
    await evaluate("document.querySelector('#role-fixture').hidden=true");
    await delay(350);
    await check("Hidden alert dialog does not suppress navigation", "!document.querySelector('.studio-member-navigation').inert");
    await evaluate("(()=>{const holder=document.createElement('div');holder.id='hidden-modal-holder';holder.hidden=true;holder.innerHTML='<div role=alertdialog aria-modal=true>Hidden modal test</div>';document.body.append(holder)})()");
    await delay(350);
    await check("Dialog in hidden ancestor leaves dock interactive", "!document.querySelector('.studio-member-navigation').inert && getComputedStyle(document.querySelector('.studio-member-navigation')).pointerEvents==='auto'");
    await evaluate("document.querySelector('#hidden-modal-holder').remove()");
    await evaluate("document.querySelector('#role-fixture').remove();for(let i=1;i<=2;i++){const d=document.createElement('dialog');d.id='stacked-'+i;d.textContent='Stacked modal test';document.body.append(d);d.showModal()}");
    await delay(350);
    await evaluate("document.querySelector('#stacked-2').close();document.querySelector('#stacked-2').remove()");
    await delay(350);
    await check("Closing one of multiple modals keeps dock suppressed", "document.querySelector('.studio-member-navigation').inert");
    await evaluate("document.querySelector('#stacked-1').close();document.querySelector('#stacked-1').remove()");
    await delay(350);
    await check("Closing final modal restores navigation", "!document.querySelector('.studio-member-navigation').inert");
    for (const [width, height] of [[320, 568], [844, 390], [320, 284]]) {
        await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true });
        await evaluate("document.querySelector('#long-modal').click()");
        await waitFor("Boolean(document.querySelector('dialog:modal'))", "long dialog");
        await delay(350);
        await check(`Long content footer reachable at ${width}x${height}`, "(()=>{const b=document.querySelector('#fixture-confirm'),r=b.getBoundingClientRect(),body=document.querySelector('.studio-modal-content');return r.top>=0 && r.bottom<=innerHeight && body.scrollHeight>body.clientHeight && b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()");
        await screenshot(`long-dialog-${width}x${height}`);
        await evaluate("document.querySelector('.studio-modal-content').scrollTop=500");
        await delay(200);
        await check("Modal scrolling keeps navigation suppressed", "document.querySelector('.studio-member-navigation').inert");
        await key("Escape");
        await waitFor("!document.querySelector('dialog:modal')", "long dialog dismissal");
        await check("Restored focus stays above dock after resizing", "(()=>{const r=document.activeElement.getBoundingClientRect(),n=document.querySelector('.studio-member-navigation').getBoundingClientRect();return r.top>=0 && r.bottom<=n.top+1})()");
    }
    await evaluate("document.querySelector('#long-modal').click()");
    await waitFor("Boolean(document.querySelector('dialog:modal'))", "busy dialog");
    await evaluate("document.querySelector('#set-busy').click()");
    await waitFor("document.querySelector('dialog:modal')?.getAttribute('aria-busy')==='true' && document.querySelector('#fixture-confirm').disabled", "busy state committed");
    await check("Pending dialog keeps keyboard focus", "document.activeElement===document.querySelector('dialog:modal')");
    await key("Escape");
    await check("Busy dialog cannot dismiss or double-submit", "document.querySelector('dialog:modal')?.getAttribute('aria-busy')==='true' && document.querySelector('#fixture-confirm').disabled");
    await evaluate("document.querySelector('#set-busy').click()");
    await waitFor("document.querySelector('dialog:modal')?.getAttribute('aria-busy')==='false'", "busy state released");
    await key("Escape");
    await waitFor("!document.querySelector('dialog:modal')", "busy dialog cleanup");
    await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await delay(100);
    await check("Reduced motion disables dock transition", "getComputedStyle(document.querySelector('.studio-member-navigation')).transitionProperty==='none'");
    await scrollTo(0);
    await scrollTo(400);
    await check("Reduced motion still hides dock", "document.querySelector('.studio-member-navigation').dataset.hidden==='true'");
    await scrollTo(0);
    await check("Top reveals dock", "document.querySelector('.studio-member-navigation').dataset.hidden==='false'");
    await screenshot("navigation-visible");
    await writeFile(join(output, "report.json"), JSON.stringify({ checks, result: "passed" }, null, 2));
    console.log(JSON.stringify({ result: "passed", checks: checks.length, output }));
} finally {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ id: 999999, method: "Browser.close" }));
        await delay(1500);
    }
    ws?.close();
    chrome?.kill();
    if (created) { await unlink(fixtureFile).catch(() => {}); await rmdir(fixtureDir); }
}

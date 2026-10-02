// Local, synthetic browser QA. No authentication, payment or database writes.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.argv[2] || "http://127.0.0.1:3110";
assert(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname), "Use a local development server");
const output = resolve(process.argv[3] || "../subscription-qa");
await mkdir(output, { recursive: true });
const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
    "--headless=new", "--disable-gpu", "--no-sandbox", `--user-data-dir=${output}/chrome`,
    "--remote-debugging-port=0", "--remote-allow-origins=*", "--no-first-run", "--no-default-browser-check", "about:blank",
], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let ws;
const results = [];
const browserErrors = [];
try {
    const wsUrl = await new Promise((resolveUrl, reject) => {
        const timeout = setTimeout(() => reject(new Error("Chrome startup timed out")), 15000);
        chrome.on("error", reject);
        chrome.stderr.on("data", data => {
            const match = data.toString().match(/DevTools listening on (ws:\/\/\S+)/);
            if (match) { clearTimeout(timeout); resolveUrl(match[1]); }
        });
    });
    ws = new WebSocket(wsUrl);
    await new Promise((resolveOpen, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Chrome connection timed out (${ws.readyState})`)), 10000);
        ws.onopen = () => { clearTimeout(timeout); resolveOpen(); };
        ws.onerror = event => { clearTimeout(timeout); reject(new Error(`Chrome connection failed: ${event.message}`)); };
    });
    let id = 0;
    const pending = new Map();
    ws.onmessage = event => {
        const message = JSON.parse(event.data);
        if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails);
        if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") browserErrors.push(message.params.args);
        const request = pending.get(message.id);
        if (!request) return;
        pending.delete(message.id);
        clearTimeout(request.timeout);
        if (message.error) request.reject(new Error(JSON.stringify(message.error)));
        else request.resolve(message.result);
    };
    const send = (method, params = {}, sessionId) => new Promise((resolveCall, reject) => {
        const callId = ++id;
        const timeout = setTimeout(() => reject(new Error(`${method} timed out`)), method === "Page.navigate" ? 60000 : 20000);
        pending.set(callId, { resolve: resolveCall, reject, timeout });
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
    await call("Page.addScriptToEvaluateOnNewDocument", { source: `
        window.open = (url) => { window.__paymentUrl = url; return { opener: window }; };
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copiedText = text; } } });
    ` });
    const screenshot = async (name, full = false) => {
        const { cssContentSize } = full ? await call("Page.getLayoutMetrics") : {};
        const { data } = await call("Page.captureScreenshot", { format: "png", ...(full ? { captureBeyondViewport:true, clip:{ x:0, y:0, width:cssContentSize.width, height:cssContentSize.height, scale:1 } } : {}) });
        await writeFile(`${output}/${name}.png`, Buffer.from(data, "base64"));
    };
    const ready = async () => {
        for (let attempt = 0; attempt < 60; attempt++) {
            if (await evaluate("Boolean(document.querySelector('.membership-plan') && Object.keys(document.querySelector('.membership-option input') || {}).some(key=>key.startsWith('__reactProps$')))")) {
                await evaluate("document.fonts.ready");
                await evaluate("document.querySelectorAll('.membership-option input')[2].click(); document.querySelectorAll('.membership-option input')[0].click()");
                await new Promise(r => setTimeout(r, 150));
                if (await evaluate("document.querySelector('.membership-price-value')?.textContent === '240₪'")) {
                    await evaluate("document.querySelectorAll('.membership-option input')[1].click()");
                    await new Promise(r => setTimeout(r, 250));
                    return;
                }
            }
            await new Promise(r => setTimeout(r, 500));
        }
        await screenshot("render-failure");
        console.log(JSON.stringify({ browserErrors, page: await evaluate("({url:location.href,text:document.body.innerText.slice(0,1500),plan:!!document.querySelector('.membership-plan'),scripts:[...document.scripts].map(s=>s.src)})") }, null, 2));
        throw new Error("Subscription did not render");
    };
    for (const [width, height] of [[320,568], [360,640], [375,667], [390,844], [430,932], [768,1024], [1366,768], [667,375]]) {
        await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 760 });
        await call("Page.navigate", { url: `${baseUrl}/subscription` });
        await ready();
        if ([320,390,1366].includes(width)) await screenshot(`subscription-${width}`);
        if (width === 390) await screenshot("subscription-full-390", true);
        if (width === 390) {
            await evaluate("window.scrollTo(0, document.querySelector('.membership-plan').getBoundingClientRect().top + scrollY - 20)");
            await screenshot("subscription-plan-390");
        }
        const heights = [];
        for (const [index, price] of [[0,240], [1,450], [2,650]]) {
            await evaluate(`document.querySelectorAll('.membership-option input')[${index}].click()`);
            await new Promise(r => setTimeout(r, 250));
            const geometry = await evaluate(`(() => {
                const bounds = element => { const r = element.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, bottom:r.bottom }; };
                const plan = document.querySelector('.membership-plan');
                const badBounds = [...document.querySelectorAll('.membership-content *')].filter(el => {
                    if (!el.getClientRects().length || el.tagName === 'SVG' || el.closest('svg') || el.classList.contains('membership-announcement')) return false;
                    const r = el.getBoundingClientRect(); return r.width > 0 && (r.x < -1 || r.right > innerWidth + 1);
                }).map(el => el.className || el.tagName);
                return { width:innerWidth, documentWidth:document.documentElement.scrollWidth, plan:bounds(plan),
                    price:document.querySelector('.membership-price-value').textContent, badBounds,
                    selected:document.querySelectorAll('input:checked').length,
                    parts:[...plan.children].map(el=>[el.className,bounds(el).height]),
                    button:bounds(document.querySelector('.membership-purchase-button')) };
            })()`);
            assert.equal(geometry.price, `${price}₪`);
            assert.equal(geometry.selected, 1);
            assert(geometry.documentWidth <= width, `Horizontal scroll at ${width}`);
            assert.deepEqual(geometry.badBounds, [], `Clipped content at ${width}`);
            assert(geometry.button.height >= 44 && geometry.button.bottom <= height, `Purchase bar outside viewport at ${width}`);
            heights.push(geometry.plan.height);
        }
        assert(Math.max(...heights) - Math.min(...heights) <= 2, `Plan switching shifts layout at ${width}: ${heights}`);
        await evaluate("document.querySelectorAll('.membership-option input')[1].click(); window.scrollTo(0,0)");
        await new Promise(r => setTimeout(r, 250));
        if ([320,390,1366].includes(width)) await screenshot(`subscription-${width}`);
        await evaluate("document.querySelector('.membership-faq summary').click(); window.scrollTo(0,document.documentElement.scrollHeight)");
        const footerVisible = await evaluate("document.querySelector('.membership-footer').getBoundingClientRect().bottom <= document.querySelector('.membership-purchase-bar').getBoundingClientRect().top");
        assert(footerVisible, `Footer hidden behind purchase bar at ${width}`);
        await evaluate("document.querySelector('.membership-purchase-button').click()");
        await new Promise(r => setTimeout(r, 250));
        assert(await evaluate("document.querySelector('dialog').open && document.activeElement.className === 'membership-payment-close'"), "Dialog initial focus");
        assert(await evaluate("document.body.style.overflow === 'hidden'"), "Background scroll lock");
        if (width === 390) await screenshot("payment-390");
        await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode:9, modifiers: 8 });
        await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode:9, modifiers: 8 });
        assert(await evaluate("document.querySelector('dialog').contains(document.activeElement)"), "Dialog traps focus");
        await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode:27 });
        await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode:27 });
        await new Promise(r => setTimeout(r, 100));
        const closeState = await evaluate("({open:document.querySelector('dialog').open, focus:document.activeElement.className})");
        assert(!closeState.open && closeState.focus.includes('membership-purchase-button'), `Escape and focus restoration: ${JSON.stringify(closeState)}`);
        results.push({ width, height, plans: 3, stablePlanHeight: heights[0], scrollAndDialog: "passed" });
    }
    await call("Emulation.setDeviceMetricsOverride", { width:390, height:844, deviceScaleFactor:1, mobile:true });
    await call("Emulation.setSafeAreaInsetsOverride", { insets: { top:47, bottom:34, left:0, right:0 } });
    await call("Emulation.setEmulatedMedia", { features: [{ name:"prefers-reduced-motion", value:"reduce" }] });
    await call("Page.navigate", { url:`${baseUrl}/subscription` });
    await ready();
    await evaluate("document.querySelectorAll('.membership-option input')[0].focus()");
    await call("Input.dispatchKeyEvent", { type:"keyDown", key:"ArrowLeft", code:"ArrowLeft", windowsVirtualKeyCode:37 });
    await call("Input.dispatchKeyEvent", { type:"keyUp", key:"ArrowLeft", code:"ArrowLeft", windowsVirtualKeyCode:37 });
    await new Promise(r => setTimeout(r, 100));
    assert(await evaluate("document.querySelector('.membership-price-value').textContent !== '240₪' && document.activeElement.matches('input:checked')"), "Native radio keyboard selection");
    await evaluate("document.querySelectorAll('.membership-option input')[2].click()");
    await new Promise(r => setTimeout(r, 50));
    await screenshot("subscription-premium-safe-area");
    assert(await evaluate("getComputedStyle(document.querySelector('.membership-option')).transitionDuration === '1e-05s'"), "Reduced motion");
    await evaluate("document.querySelector('.membership-purchase-button').click()");
    await new Promise(r => setTimeout(r, 100));
    await evaluate("document.querySelector('.membership-copy-box button').click()");
    await new Promise(r => setTimeout(r, 100));
    assert(await evaluate("window.__copiedText.includes('12 אימונים') && document.querySelector('.membership-copy-feedback').textContent.includes('הועתקה')"), "Copy success");
    await evaluate("navigator.clipboard.writeText = async () => { throw new Error('synthetic denied'); }; document.querySelector('.membership-copy-box button').click()");
    await new Promise(r => setTimeout(r, 100));
    assert(await evaluate("document.querySelector('.membership-copy-feedback').textContent.includes('ידנית')"), "Copy error recovery");
    await evaluate("window.open = () => null; document.querySelector('.membership-bit-button').click()");
    await new Promise(r => setTimeout(r, 100));
    assert(await evaluate("document.querySelector('dialog').open && document.querySelector('.membership-payment-error').textContent.includes('חסם')"), "Blocked popup recovery");
    await evaluate("window.open = url => { window.__paymentUrl=url; return { opener:window }; }; document.querySelector('.membership-bit-button').click()");
    await new Promise(r => setTimeout(r, 100));
    assert(await evaluate("Boolean(!document.querySelector('dialog').open && window.__paymentUrl.startsWith('https://www.bitpay.co.il/') && document.querySelector('.membership-handoff'))"), "Synthetic Bit handoff");
    results.push({ safeArea:true, reducedMotion:true, copySuccess:true, copyFailure:true, blockedPopup:true, syntheticHandoff:true });
    await writeFile(`${output}/report.json`, JSON.stringify({ results }, null, 2));
    console.log(JSON.stringify({ output, results }, null, 2));
} finally {
    ws?.close();
    chrome.kill();
}

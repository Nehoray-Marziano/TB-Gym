import { runMobileScenarios } from './subscription-mobile-scenarios.mjs';
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
    await runMobileScenarios({ call, evaluate, screenshot, baseUrl, output });
} finally {
    ws?.close();
    chrome.kill();
}

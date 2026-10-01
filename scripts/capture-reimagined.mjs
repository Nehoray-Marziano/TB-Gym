import fs from "fs";
import os from "os";
import { spawn } from "child_process";

async function run() {
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const tempDir = fs.mkdtempSync(os.tmpdir() + "/chrome-reimagine-");
    const chrome = spawn(chromePath, [
        "--headless=new",
        `--user-data-dir=${tempDir}`,
        "--incognito",
        "--remote-debugging-port=0",
        "--remote-allow-origins=*",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "about:blank"
    ], { stdio: ["ignore", "pipe", "pipe"] });

    const wsUrl = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout waiting for DevTools")), 7000);
        chrome.stderr.on("data", (d) => {
            const m = d.toString().match(/DevTools listening on (ws:\/\/[^\s]+)/);
            if (m) { clearTimeout(timeout); resolve(m[1]); }
        });
    });

    const ws = new WebSocket(wsUrl);
    let id = 1;
    const pending = new Map();
    ws.onmessage = (e) => {
        const res = JSON.parse(e.data);
        if (res.id && pending.has(res.id)) {
            const { resolve, reject } = pending.get(res.id);
            pending.delete(res.id);
            if (res.error) reject(new Error(JSON.stringify(res.error)));
            else resolve(res.result);
        }
    };
    await new Promise((r) => ws.onopen = r);
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const msgId = id++;
        pending.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
    });

    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const sendSession = (method, params = {}) => new Promise((resolve, reject) => {
        const msgId = id++;
        pending.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, sessionId, method, params }));
    });

    await sendSession("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true,
        screenOrientation: { angle: 0, type: "portraitPrimary" }
    });
    await sendSession("Page.enable");
    await sendSession("Runtime.enable");
    await sendSession("Page.navigate", { url: "http://localhost:3000/subscription" });
    await new Promise(r => setTimeout(r, 1500));

    // Hide Next.js dev tools watermark/badge if present
    await sendSession("Runtime.evaluate", {
        expression: `
            const style = document.createElement('style');
            style.innerHTML = 'nextjs-portal, [data-nextjs-toast], [data-nextjs-indicator], div[data-nextjs-route-announcer] { display: none !important; }';
            document.head.appendChild(style);
        `
    });

    // 1. Capture Top Hero Intro
    let snap = await sendSession("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("screenshot-subscription-reimagined-top.png", Buffer.from(snap.data, "base64"));
    console.log("Saved screenshot-subscription-reimagined-top.png");

    // 2. Click "לצפייה במסלולים ובחירת מנוי"
    await sendSession("Runtime.evaluate", {
        expression: `
            const btn = document.querySelector('header button.group');
            if (btn) btn.click();
        `
    });
    await new Promise(r => setTimeout(r, 1000));

    // Capture Popular / Signature Tier centered
    snap = await sendSession("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("screenshot-subscription-reimagined-popular.png", Buffer.from(snap.data, "base64"));
    console.log("Saved screenshot-subscription-reimagined-popular.png");

    // 3. Click "4 אימונים" tab
    const r3 = await sendSession("Runtime.evaluate", {
        expression: `
            (() => {
                const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
                if (tabs[0]) {
                    tabs[0].click();
                    return "Clicked tab 0: " + tabs[0].innerText;
                }
                return "Tab 0 not found";
            })()
        `,
        returnByValue: true
    });
    console.log(r3.result?.value);
    await new Promise(r => setTimeout(r, 800));

    snap = await sendSession("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("screenshot-subscription-reimagined-basic.png", Buffer.from(snap.data, "base64"));
    console.log("Saved screenshot-subscription-reimagined-basic.png");

    // 4. Click "12 אימונים" tab
    const r4 = await sendSession("Runtime.evaluate", {
        expression: `
            (() => {
                const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
                if (tabs[2]) {
                    tabs[2].click();
                    return "Clicked tab 2: " + tabs[2].innerText;
                }
                return "Tab 2 not found, total: " + tabs.length;
            })()
        `,
        returnByValue: true
    });
    console.log(r4.result?.value);
    await new Promise(r => setTimeout(r, 800));

    snap = await sendSession("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("screenshot-subscription-reimagined-premium.png", Buffer.from(snap.data, "base64"));
    console.log("Saved screenshot-subscription-reimagined-premium.png");

    // 5. Test Prev Arrow button (moves 12 -> 8)
    const arrowRes = await sendSession("Runtime.evaluate", {
        expression: `
            (() => {
                const prevBtn = document.querySelector('button[aria-label="מסלול קודם"]');
                if (prevBtn && !prevBtn.disabled) {
                    prevBtn.click();
                    return "Clicked Prev Arrow";
                }
                return "Prev button disabled or not found";
            })()
        `,
        returnByValue: true
    });
    console.log(arrowRes?.result?.value);
    await new Promise(r => setTimeout(r, 600));

    // Verify card is now 8
    const check8 = await sendSession("Runtime.evaluate", {
        expression: `document.querySelector('article[aria-hidden="false"] h3')?.innerText`,
        returnByValue: true
    });
    console.log("Current active card after prev arrow:", check8?.result?.value);

    // 6. Test clicking "מעבר לתשלום בביט" on the active card to open PaymentModal
    const modalRes = await sendSession("Runtime.evaluate", {
        expression: `
            (() => {
                const activeCard = document.querySelector('article[aria-hidden="false"]');
                const btn = activeCard?.querySelector('button');
                if (btn) {
                    btn.click();
                    return "Clicked Card Checkout Button: " + btn.innerText;
                }
                return "Checkout button not found";
            })()
        `,
        returnByValue: true
    });
    console.log(modalRes?.result?.value);
    await new Promise(r => setTimeout(r, 700));

    // Capture PaymentModal opened over the card
    snap = await sendSession("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("screenshot-subscription-payment-modal.png", Buffer.from(snap.data, "base64"));
    console.log("Saved screenshot-subscription-payment-modal.png");

    ws.close();
    chrome.kill("SIGKILL");
}

run().catch(console.error);

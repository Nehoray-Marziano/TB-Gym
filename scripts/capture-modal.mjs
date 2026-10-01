import { spawn } from "child_process";
import fs from "fs";

export async function captureModal({ url, output, width = 390, height = 844 }) {
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const chrome = spawn(chromePath, [
        "--headless=new",
        "--remote-debugging-port=0",
        "--remote-allow-origins=*",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "about:blank"
    ], { stdio: ["ignore", "pipe", "pipe"] });

    const wsUrl = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout")), 7000);
        chrome.stderr.on("data", (data) => {
            const match = data.toString().match(/DevTools listening on (ws:\/\/[^\s]+)/);
            if (match) {
                clearTimeout(timeout);
                resolve(match[1]);
            }
        });
    });

    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const pending = new Map();
    ws.onmessage = (event) => {
        const res = JSON.parse(event.data);
        if (res.id && pending.has(res.id)) {
            const { resolve, reject } = pending.get(res.id);
            pending.delete(res.id);
            if (res.error) reject(new Error(JSON.stringify(res.error)));
            else resolve(res.result);
        }
    };
    await new Promise((r) => ws.onopen = r);
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
    });

    try {
        const { targetId } = await send("Target.createTarget", { url: "about:blank" });
        const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
        const sendSession = (method, params = {}) => new Promise((resolve, reject) => {
            const id = msgId++;
            pending.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, sessionId, method, params }));
        });

        await sendSession("Emulation.setDeviceMetricsOverride", {
            width, height, deviceScaleFactor: 2, mobile: true
        });
        await sendSession("Page.enable");
        await sendSession("Page.navigate", { url });
        await new Promise((r) => setTimeout(r, 1200));

        // Click the "כניסה עם קוד במייל" button
        await sendSession("Runtime.evaluate", {
            expression: `
                const buttons = Array.from(document.querySelectorAll('button'));
                const emailBtn = buttons.find(b => b.textContent.includes('קוד במייל'));
                if (emailBtn) emailBtn.click();
            `
        });
        await new Promise((r) => setTimeout(r, 600));

        const { data } = await sendSession("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(output, Buffer.from(data, "base64"));
        console.log(`Saved modal screenshot to ${output}`);
    } finally {
        ws.close();
        chrome.kill("SIGKILL");
    }
}

captureModal({
    url: "http://localhost:3000",
    output: "C:/Users/U6071035/.gemini/antigravity/brain/672d7f39-fa4f-41ce-bdf0-e103627cedbc/landing_modal_final_390x844.png"
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

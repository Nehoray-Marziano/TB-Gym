import { spawn } from "child_process";
import fs from "fs";
import os from "os";

async function captureScreenshot({ url, output, width = 390, height = 844, waitMs = 1500 }) {
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const tempDir = fs.mkdtempSync(`${os.tmpdir()}/chrome-ss-`);
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
        const timeout = setTimeout(() => reject(new Error("Timeout waiting for Chrome DevTools URL")), 7000);
        chrome.stderr.on("data", (data) => {
            const match = data.toString().match(/DevTools listening on (ws:\/\/[^\s]+)/);
            if (match) {
                clearTimeout(timeout);
                resolve(match[1]);
            }
        });
        chrome.on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
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

    await new Promise((resolve) => ws.onopen = resolve);

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
            width,
            height,
            deviceScaleFactor: 2,
            mobile: true,
            screenOrientation: { angle: 0, type: "portraitPrimary" }
        });
        await sendSession("Emulation.setTouchEmulationEnabled", { enabled: true });
        await sendSession("Emulation.setEmulatedMedia", {
            media: "screen",
            features: [{ name: "prefers-color-scheme", value: "light" }]
        });

        await sendSession("Page.enable");
        await sendSession("Runtime.enable");
        await sendSession("Page.navigate", { url });
        await new Promise((r) => setTimeout(r, waitMs));

        const { data } = await sendSession("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(output, Buffer.from(data, "base64"));
        console.log(`Screenshot saved to ${output}`);
    } finally {
        ws.close();
        chrome.kill();
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
}

async function main() {
    const brainDir = "C:\\Users\\U6071035\\.gemini\\antigravity\\brain\\672d7f39-fa4f-41ce-bdf0-e103627cedbc";
    
    // 1. New user (0 tickets, 0 bookings)
    await captureScreenshot({
        url: "http://localhost:3333/home-preview?state=empty_new",
        output: `${brainDir}/home_reimagined_new_user_390x844.png`,
    });

    // 2. Member with 8 tickets (0 bookings)
    await captureScreenshot({
        url: "http://localhost:3333/home-preview?state=empty_tickets",
        output: `${brainDir}/home_reimagined_with_tickets_390x844.png`,
    });

    // 3. Member with booked session
    await captureScreenshot({
        url: "http://localhost:3333/home-preview?state=booked",
        output: `${brainDir}/home_reimagined_booked_390x844.png`,
    });
}

main().catch(console.error);

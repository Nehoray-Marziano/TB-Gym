import { spawn } from "child_process";
import fs from "fs";
import os from "os";

export async function captureScreenshot({ url, output, width = 390, height = 844, waitMs = 1200 }) {
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
        // Create new target (page)
        const { targetId } = await send("Target.createTarget", { url: "about:blank" });
        const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

        const sendSession = (method, params = {}) => new Promise((resolve, reject) => {
            const id = msgId++;
            pending.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, sessionId, method, params }));
        });

        // Set mobile emulation
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

        ws.addEventListener("message", (event) => {
            try {
                const res = JSON.parse(event.data);
                if (res.method === "Runtime.exceptionThrown") {
                    console.error("BROWSER_EXCEPTION:", JSON.stringify(res.params.exceptionDetails));
                }
                if (res.method === "Runtime.consoleAPICalled" && res.params.type === "error") {
                    console.error("BROWSER_CONSOLE_ERROR:", JSON.stringify(res.params.args));
                }
            } catch {}
        });

        await sendSession("Runtime.enable");
        await sendSession("Page.enable");
        await sendSession("Page.navigate", { url });
        await new Promise((r) => setTimeout(r, waitMs));

        // Screenshot
        const { data } = await sendSession("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(output, Buffer.from(data, "base64"));
        console.log(`Saved screenshot to ${output} (${width}x${height})`);
    } finally {
        ws.close();
        chrome.kill("SIGKILL");
    }
}

if (process.argv[1] && process.argv[1].endsWith("capture-mobile.mjs")) {
    const args = process.argv.slice(2);
    const url = args[0] || "http://localhost:3000";
    const output = args[1] || "landing-mobile.png";
    const width = parseInt(args[2] || "390", 10);
    const height = parseInt(args[3] || "844", 10);
    captureScreenshot({ url, output, width, height })
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

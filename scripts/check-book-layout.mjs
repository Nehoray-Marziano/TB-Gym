import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile, unlink, rmdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const baseUrl = process.argv[2] || "http://127.0.0.1:3110";
assert(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname), "Use local server");

const outputDir = resolve(process.argv[3] || "./scratch/book-layout-qa");
await mkdir(outputDir, { recursive: true });

const fixtureDir = resolve("./src/app/book-layout-check");
const fixtureFile = resolve(fixtureDir, "page.tsx");

const today = new Date();
const todayEvening = new Date(today);
todayEvening.setHours(18, 0, 0, 0);
const todayEveningEnd = new Date(today);
todayEveningEnd.setHours(19, 0, 0, 0);

const tomorrowMorning = new Date(today);
tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
tomorrowMorning.setHours(8, 30, 0, 0);
const tomorrowMorningEnd = new Date(tomorrowMorning);
tomorrowMorningEnd.setHours(9, 20, 0, 0);

const day3 = new Date(today);
day3.setDate(day3.getDate() + 2);
day3.setHours(17, 30, 0, 0);
const day3End = new Date(day3);
day3End.setHours(18, 30, 0, 0);

const sampleSessions = [
    {
        id: "s-1",
        title: "פילאטיס מכשירים בוטיק",
        description: "אימון ממוקד לעיצוב, גמישות ושרירי ליבה על מיטות רפורמר",
        start_time: todayEvening.toISOString(),
        end_time: todayEveningEnd.toISOString(),
        max_capacity: 8,
        current_bookings: 6,
        isRegistered: false,
    },
    {
        id: "s-2",
        title: "אימון כוח ועיצוב דינמי",
        description: "חיטוב וחיזוק פלג גוף תחתון ועליון בעצימות מותאמת אישית",
        start_time: tomorrowMorning.toISOString(),
        end_time: tomorrowMorningEnd.toISOString(),
        max_capacity: 8,
        current_bookings: 5,
        isRegistered: true,
    },
    {
        id: "s-3",
        title: "אינטרוולים וסיבולת לב-ריאה",
        description: "אימון אנרגטי לשריפת שומנים ושיפור הכושר האירובי",
        start_time: day3.toISOString(),
        end_time: day3End.toISOString(),
        max_capacity: 8,
        current_bookings: 8,
        isRegistered: false,
    }
];

const fixtureCode = `"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BookingExperience from "@/components/book/BookingExperience";
import { MemberNavigation } from "@/components/BottomNav";
import { TraineeIdentity } from "@/components/TraineeIdentity";

const mockSessions = ${JSON.stringify(sampleSessions)};

function PreviewContent() {
    const searchParams = useSearchParams();
    const state = searchParams.get("state") || "default";

    let sessions = mockSessions;
    let tickets = 4;
    let loading = false;

    if (state === "empty") {
        sessions = [];
    } else if (state === "loading") {
        loading = true;
    } else if (state === "notickets") {
        tickets = 0;
    }

    return (
        <TraineeIdentity userId="00000000-0000-0000-0000-000000000000">
            <div className="studio-app-shell h-[100dvh] w-full overflow-hidden">
                <div className="relative flex-1 h-full w-full overflow-hidden">
                    <BookingExperience
                        userId="00000000-0000-0000-0000-000000000000"
                        previewSessions={loading ? undefined : sessions}
                        previewTickets={tickets}
                        previewLoading={loading}
                    />
                </div>
                <MemberNavigation pathname="/book" />
            </div>
        </TraineeIdentity>
    );
}

export default function BookLayoutFixture() {
    return (
        <Suspense fallback={<div className="p-4 text-xs">טוען...</div>}>
            <PreviewContent />
        </Suspense>
    );
}
`;

let chrome;
let ws;
let created = false;

try {
    await mkdir(fixtureDir, { recursive: true });
    await writeFile(fixtureFile, fixtureCode, "utf8");
    created = true;
    console.log("Created fixture at:", fixtureFile);

    chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        `--user-data-dir=${join(outputDir, "chrome-profile")}`,
        "--remote-debugging-port=0",
        "--remote-allow-origins=*",
        "--no-first-run",
        "--no-default-browser-check",
        "about:blank",
    ], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });

    const wsUrl = await new Promise((res, rej) => {
        const timeout = setTimeout(() => rej(new Error("Chrome startup timeout")), 15000);
        chrome.on("error", rej);
        chrome.stderr.on("data", data => {
            const match = data.toString().match(/DevTools listening on (ws:\/\/\S+)/);
            if (match) {
                clearTimeout(timeout);
                res(match[1]);
            }
        });
    });

    ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = rej;
    });

    let nextId = 0;
    const pending = new Map();
    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        const req = pending.get(msg.id);
        if (req) {
            pending.delete(msg.id);
            clearTimeout(req.timeout);
            if (msg.error) req.reject(new Error(JSON.stringify(msg.error)));
            else req.resolve(msg.result);
        }
    };

    const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
        const id = ++nextId;
        const timeout = setTimeout(() => rej(new Error(`${method} timed out`)), 30000);
        pending.set(id, { resolve: res, reject: rej, timeout });
        ws.send(JSON.stringify({ id, method, params, sessionId }));
    });

    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const call = (method, params) => send(method, params, sessionId);

    const evaluate = async (expression) => {
        const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
        return result.result.value;
    };

    await call("Page.enable");
    await call("DOM.enable");
    await call("CSS.enable");

    const phoneDevices = [
        { name: "iPhone_SE", width: 375, height: 667, dpr: 2 },
        { name: "iPhone_14", width: 390, height: 844, dpr: 3 },
    ];

    for (const dev of phoneDevices) {
        console.log(`\nTesting device: ${dev.name} (${dev.width}x${dev.height})`);

        await call("Emulation.setDeviceMetricsOverride", {
            width: dev.width,
            height: dev.height,
            deviceScaleFactor: dev.dpr,
            mobile: true,
            hasTouch: true,
        });

        // 1. Default state
        const url = `${baseUrl}/book-layout-check?state=default`;
        await call("Page.navigate", { url });

        // Wait for route compilation & hydration
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
            try {
                ready = await evaluate(`Boolean(document.querySelector('article'))`);
                if (ready) break;
            } catch {}
            await new Promise(r => setTimeout(r, 250));
        }
        assert(ready, "Booking page failed to mount articles");

        // Wait for animations and fonts to settle
        await new Promise(r => setTimeout(r, 500));

        // Evaluate layout metrics
        const metrics = await evaluate(`(() => {
            const page = document.querySelector('.studio-book-page');
            const nav = document.querySelector('nav[aria-label="ניווט ראשי"]');
            const dayStrip = document.querySelector('.studio-day-strip');
            const articles = document.querySelectorAll('article');

            return {
                pageScrollHeight: page ? page.scrollHeight : 0,
                pageClientHeight: page ? page.clientHeight : 0,
                bodyOverflowX: document.documentElement.scrollWidth > window.innerWidth,
                navVisible: Boolean(nav),
                dayCapsulesCount: dayStrip ? dayStrip.children.length : 0,
                articlesCount: articles.length,
            };
        })()`);

        console.log("Layout metrics:", metrics);
        assert.equal(metrics.bodyOverflowX, false, "Page should not have horizontal document overflow");
        assert.ok(metrics.articlesCount >= 3, "Should render sample sessions");
        assert.ok(metrics.dayCapsulesCount >= 14, "Should render 14+ day capsules");

        // Screenshot 1: Overview
        const ss1 = await call("Page.captureScreenshot", { format: "png" });
        await writeFile(join(outputDir, `${dev.name}_default.png`), Buffer.from(ss1.data, "base64"));
        console.log(`Saved screenshot: ${dev.name}_default.png`);

        // Scroll to bottom to verify clearance above floating bottom nav
        await evaluate(`(() => {
            const page = document.querySelector('.studio-book-page');
            if (page) page.scrollTop = page.scrollHeight;
        })()`);
        await new Promise(r => setTimeout(r, 400));
        const ssBottom = await call("Page.captureScreenshot", { format: "png" });
        await writeFile(join(outputDir, `${dev.name}_scrolled_bottom.png`), Buffer.from(ssBottom.data, "base64"));
        console.log(`Saved screenshot: ${dev.name}_scrolled_bottom.png`);

        // Scroll back to top
        await evaluate(`(() => {
            const page = document.querySelector('.studio-book-page');
            if (page) page.scrollTop = 0;
        })()`);
        await new Promise(r => setTimeout(r, 300));

        // 2. Open booking bottom sheet by tapping "שמרי לי מקום"
        await evaluate(`(() => {
            const bookBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('שמרי לי מקום'));
            if (bookBtn) bookBtn.click();
        })()`);
        await new Promise(r => setTimeout(r, 600));

        const modalOpen = await evaluate(`Boolean(document.querySelector('[role="dialog"]'))`);
        console.log("Booking dialog opened:", modalOpen);
        assert.ok(modalOpen, "Booking bottom sheet should open on clicking 'שמרי לי מקום'");

        const ssModal = await call("Page.captureScreenshot", { format: "png" });
        await writeFile(join(outputDir, `${dev.name}_booking_modal.png`), Buffer.from(ssModal.data, "base64"));
        console.log(`Saved screenshot: ${dev.name}_booking_modal.png`);

        // Close modal
        await evaluate(`(() => {
            const closeBtn = document.querySelector('button[aria-label="סגירה"]');
            if (closeBtn) closeBtn.click();
        })()`);
        await new Promise(r => setTimeout(r, 500));

        // 3. Filter by "ההרשמות שלי"
        await evaluate(`(() => {
            const regFilter = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('ההרשמות שלי'));
            if (regFilter) regFilter.click();
        })()`);
        await new Promise(r => setTimeout(r, 500));

        const regCount = await evaluate(`document.querySelectorAll('article').length`);
        console.log("Registered sessions count after filter:", regCount);
        assert.equal(regCount, 1, "Should filter to exactly 1 registered session");

        const ssFiltered = await call("Page.captureScreenshot", { format: "png" });
        await writeFile(join(outputDir, `${dev.name}_filtered_my_bookings.png`), Buffer.from(ssFiltered.data, "base64"));
        console.log(`Saved screenshot: ${dev.name}_filtered_my_bookings.png`);
    }

    console.log("\nALL BOOKING LAYOUT TESTS PASSED WITH FLYING COLORS! 🎉");

} catch (err) {
    console.error("Test execution failed:", err);
    process.exitCode = 1;
} finally {
    if (ws) ws.close();
    if (chrome) chrome.kill();
    if (created) {
        try {
            await unlink(fixtureFile);
            await rmdir(fixtureDir);
            console.log("Cleaned up fixture directory");
        } catch (e) {
            console.warn("Cleanup warning:", e.message);
        }
    }
}

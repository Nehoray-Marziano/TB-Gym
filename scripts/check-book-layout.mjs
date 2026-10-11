import { openBrowser } from "./lib/browser-check.mjs";
import assert from "node:assert/strict";
import { warmLocalRoute } from "./lib/browser-check.mjs";

import { mkdir, writeFile, unlink, rmdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const baseUrl = process.argv[2] || "http://127.0.0.1:3110";
assert(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname), "Use local server");

const outputDir = resolve(process.argv[3] || "./scratch/book-layout-qa");
await mkdir(outputDir, { recursive: true });

const fixtureName = `book-layout-check-${Date.now()}`;
const fixtureDir = resolve("./src/app", fixtureName);
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
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import BookingExperience from "@/components/book/BookingExperience";
import { MemberNavigation } from "@/components/BottomNav";
import { TraineeIdentity } from "@/components/TraineeIdentity";
import TraineeShell from "@/components/TraineeShell";

const mockSessions = ${JSON.stringify(sampleSessions)};

function PreviewContent() {
    useEffect(() => {
        document.documentElement.dataset.bookFixtureReady = "true";
        return () => { delete document.documentElement.dataset.bookFixtureReady; };
    }, []);
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
            <TraineeShell>
                <div className="relative min-h-0 flex-1 w-full overflow-hidden">
                    <BookingExperience
                        userId="00000000-0000-0000-0000-000000000000"
                        previewSessions={loading ? undefined : sessions}
                        previewTickets={tickets}
                        previewLoading={loading}
                    />
                </div>
                <MemberNavigation pathname="/book" />
            </TraineeShell>
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

let browser;
let created = false;
const cases = [];
try {
    await mkdir(fixtureDir);
    created = true;
    await writeFile(fixtureFile, fixtureCode, { encoding: "utf8", flag: "wx" });
    await warmLocalRoute(baseUrl, `/${fixtureName}`);
    browser = await openBrowser(outputDir);
    await browser.call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await browser.call("Network.setBlockedURLs", { urls: ["*supabase.co*", "*onesignal.com*"] });
    for (const [width, height] of [[320, 568], [375, 667], [390, 844], [1366, 768]]) {
        await browser.call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
        await browser.call("Page.navigate", { url: `${baseUrl}/${fixtureName}?state=default` });
        await browser.wait("document.documentElement.dataset.bookFixtureReady==='true'&&document.querySelectorAll('article').length===3", "fixture hydrated", 60000);
        const metrics = await browser.evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth,days:document.querySelector('.studio-day-strip').children.length,nav:!!document.querySelector('nav[aria-label="ניווט ראשי"]')})`);
        assert.equal(metrics.overflow, false, "No document overflow");
        assert.equal(metrics.days, 15, "All days and fourteen calendar days");
        assert(metrics.nav, "Member navigation remains reachable");
        await browser.shot(`${width}-${height}-default`);
        await browser.evaluate("document.querySelector('.studio-book-page').scrollTop=99999");
        await browser.shot(`${width}-${height}-scrolled`);
        await browser.textClick("שמרי לי מקום", "article");
        await browser.wait("!!document.querySelector('dialog:modal')", "native booking dialog");
        const dialog = await browser.evaluate("(()=>{const r=document.querySelector('dialog:modal').getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight}})()");
        assert(dialog.left >= -1 && dialog.top >= -1 && dialog.right <= dialog.width + 1 && dialog.bottom <= dialog.height + 1, "Dialog fits viewport");
        await browser.shot(`${width}-${height}-dialog`);
        await browser.call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
        await browser.call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
        await browser.wait("!document.querySelector('dialog:modal')", "dialog dismissed");
        await browser.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('ההרשמות שלי')).click()");
        await browser.wait("document.querySelectorAll('article').length===1", "registered filter");
        await browser.shot(`${width}-${height}-registered`);
        cases.push({ width, height, metrics, dialog });
        console.log(`PASS booking layout ${width}x${height}`);
    }
    assert.equal(browser.errors.length, 0, JSON.stringify(browser.errors));
    await writeFile(join(outputDir, "results.json"), JSON.stringify({ cases, browserExceptions: 0 }, null, 2));
} catch (error) {
    if (browser) {
        await browser.shot("failure");
        console.log(JSON.stringify(await browser.evaluate("({path:location.pathname,ready:document.documentElement.dataset.bookFixtureReady,buttons:[...document.querySelectorAll('button')].map(b=>({text:b.textContent,disabled:b.disabled}))})")));
    }
    console.error(error);
    process.exitCode = 1;
} finally {
    if (browser) await browser.close();
    if (created) {
        await unlink(fixtureFile);
        await rmdir(fixtureDir);
    }
}

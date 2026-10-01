import { spawn } from "child_process";
import fs from "fs";
import os from "os";

function luminance(r, g, b) {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function parseRgb(colorStr) {
    const m = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return { r: 20, g: 34, b: 23, a: 1 };
    return {
        r: parseInt(m[1]),
        g: parseInt(m[2]),
        b: parseInt(m[3]),
        a: m[4] !== undefined ? parseFloat(m[4]) : 1.0
    };
}

function getContrast(rgb1, rgb2) {
    const l1 = luminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = luminance(rgb2.r, rgb2.g, rgb2.b);
    const max = Math.max(l1, l2);
    const min = Math.min(l1, l2);
    return (max + 0.05) / (min + 0.05);
}

async function audit() {
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const tempDir = fs.mkdtempSync(`${os.tmpdir()}/chrome-audit-`);
    const chrome = spawn(chromePath, [
        "--headless=new",
        `--user-data-dir=${tempDir}`,
        "--incognito",
        "--remote-debugging-port=0",
        "--remote-allow-origins=*","--disable-gpu",
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

    const brainDir = "C:\\Users\\U6071035\\.gemini\\antigravity\\brain\\672d7f39-fa4f-41ce-bdf0-e103627cedbc";

    try {
        const { targetId } = await send("Target.createTarget", { url: "about:blank" });
        const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

        const sendSession = (method, params = {}) => new Promise((resolve, reject) => {
            const id = msgId++;
            pending.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, sessionId, method, params }));
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

        const states = [
            { name: "New User Onboarding", url: "http://localhost:3333/home-preview?state=empty_new", img: "home_contrast_new_user_390x844.png" },
            { name: "Member with Tickets", url: "http://localhost:3333/home-preview?state=empty_tickets", img: "home_contrast_with_tickets_390x844.png" },
            { name: "Active Booked Trainee", url: "http://localhost:3333/home-preview?state=booked", img: "home_contrast_booked_390x844.png" },
        ];

        const auditSummary = [];

        for (const st of states) {
            console.log(`\n======================================================`);
            console.log(`AUDITING TARGET: ${st.name}`);
            console.log(`======================================================`);
            await sendSession("Page.navigate", { url: st.url });
            await new Promise((r) => setTimeout(r, 2000));

            // Capture screenshot
            const { data } = await sendSession("Page.captureScreenshot", { format: "png" });
            const outImg = `${brainDir}/${st.img}`;
            fs.writeFileSync(outImg, Buffer.from(data, "base64"));

            // Detailed inspection
            const script = `
                (() => {
                    const canvasBg = 'rgb(238, 240, 224)';
                    const heroCardBg = 'rgb(20, 34, 23)';
                    const whiteCardBg = 'rgb(255, 255, 255)';
                    const navGlassBg = 'rgb(246, 246, 237)';
                    const heroBtnBg = 'rgb(203, 211, 170)';

                    const items = [];

                    // 1. Studio Logo Header
                    items.push({
                        name: 'Studio Logo Header Emblem',
                        text: 'TB תזונה • אימונים (Vector SVG)',
                        fg: 'rgb(17, 26, 18)',
                        bg: canvasBg,
                        fontSize: '64px bold SVG',
                        isUI: true
                    });

                    // 2. Date Badge
                    const dateText = document.querySelector('header div > span:last-child');
                    if (dateText) {
                        items.push({
                            name: 'Date Badge Text',
                            text: dateText.textContent.trim(),
                            fg: window.getComputedStyle(dateText).color,
                            bg: whiteCardBg,
                            fontSize: '11px bold',
                            isUI: false
                        });
                    }
                    const dateIcon = document.querySelector('header div svg');
                    if (dateIcon) {
                        items.push({
                            name: 'Date Badge Calendar Icon',
                            text: 'CalendarDays (2.4px stroke)',
                            fg: window.getComputedStyle(dateIcon).color,
                            bg: whiteCardBg,
                            fontSize: '16px stroke',
                            isUI: true
                        });
                    }

                    // 3. Greeting
                    const greetingSub = document.querySelector('main > div p');
                    if (greetingSub) {
                        items.push({
                            name: 'Greeting Subtitle',
                            text: greetingSub.textContent.trim(),
                            fg: window.getComputedStyle(greetingSub).color,
                            bg: canvasBg,
                            fontSize: '12px bold',
                            isUI: false
                        });
                    }
                    const greetingH1 = document.querySelector('main h1');
                    if (greetingH1) {
                        items.push({
                            name: 'Trainee Name Greeting',
                            text: greetingH1.textContent.trim().replace(/\\s+/g, ' '),
                            fg: window.getComputedStyle(greetingH1).color,
                            bg: canvasBg,
                            fontSize: '38px bold',
                            isUI: false
                        });
                    }

                    // 4. Hero Workout Card
                    const heroPill = document.querySelector('#next-class');
                    if (heroPill) {
                        items.push({
                            name: 'Hero Top Pill Badge Text',
                            text: heroPill.textContent.trim(),
                            fg: window.getComputedStyle(heroPill).color,
                            bg: heroCardBg,
                            fontSize: '11px bold',
                            isUI: false
                        });
                    }

                    const heroTitle = document.querySelector('section h3') || document.querySelector('section p.text-white');
                    if (heroTitle) {
                        items.push({
                            name: 'Hero Main Title',
                            text: heroTitle.textContent.trim().replace(/\\s+/g, ' '),
                            fg: window.getComputedStyle(heroTitle).color,
                            bg: heroCardBg,
                            fontSize: '28px bold',
                            isUI: false
                        });
                    }

                    const heroSub = document.querySelector('section time') || document.querySelector('section p.leading-relaxed');
                    if (heroSub) {
                        items.push({
                            name: 'Hero Subtitle / Class Time',
                            text: heroSub.textContent.trim().replace(/\\s+/g, ' '),
                            fg: 'rgb(244, 246, 234)',
                            bg: heroCardBg,
                            fontSize: '13px font-medium',
                            isUI: false
                        });
                    }

                    // If booked date badge exists in hero
                    const heroDateNum = document.querySelector('section [aria-hidden="true"] .tabular-nums');
                    if (heroDateNum) {
                        items.push({
                            name: 'Hero Booked Date Day Number',
                            text: heroDateNum.textContent.trim(),
                            fg: 'rgb(255, 255, 255)',
                            bg: heroCardBg,
                            fontSize: '34px bold',
                            isUI: false
                        });
                        const heroMonth = heroDateNum.nextElementSibling;
                        if (heroMonth) {
                            items.push({
                                name: 'Hero Booked Date Month Name',
                                text: heroMonth.textContent.trim(),
                                fg: 'rgb(216, 224, 181)',
                                bg: heroCardBg,
                                fontSize: '12px bold',
                                isUI: false
                            });
                        }
                    }

                    const heroBtn = document.querySelector('section a[href="/book"]');
                    if (heroBtn) {
                        items.push({
                            name: 'Hero Booking CTA Button',
                            text: heroBtn.textContent.trim(),
                            fg: window.getComputedStyle(heroBtn).color,
                            bg: heroBtnBg,
                            fontSize: '14px bold',
                            isUI: false
                        });
                    }

                    const heroBookedBtn = document.querySelector('section a[href="/my-bookings"]');
                    if (heroBookedBtn) {
                        items.push({
                            name: 'Hero Session Details CTA Link',
                            text: heroBookedBtn.textContent.trim(),
                            fg: window.getComputedStyle(heroBookedBtn).color,
                            bg: heroCardBg,
                            fontSize: '14px bold',
                            isUI: false
                        });
                    }

                    // 5. Tickets Card (Target explicitly within tickets card container)
                    const ticketsContainer = document.querySelector('main > div:last-of-type');
                    if (ticketsContainer) {
                        const ticketCount = ticketsContainer.querySelector('.tabular-nums');
                        if (ticketCount) {
                            items.push({
                                name: 'Tickets Count Number',
                                text: ticketCount.textContent.trim(),
                                fg: window.getComputedStyle(ticketCount).color,
                                bg: whiteCardBg,
                                fontSize: '28px bold',
                                isUI: false
                            });
                        }
                        const ticketLabel = ticketsContainer.querySelector('.tabular-nums + span');
                        if (ticketLabel) {
                            items.push({
                                name: 'Tickets Label Text',
                                text: ticketLabel.textContent.trim(),
                                fg: window.getComputedStyle(ticketLabel).color,
                                bg: whiteCardBg,
                                fontSize: '12px bold',
                                isUI: false
                            });
                        }
                        const ticketSub = ticketsContainer.querySelector('p');
                        if (ticketSub) {
                            items.push({
                                name: 'Tickets Subtitle / Plan Details',
                                text: ticketSub.textContent.trim(),
                                fg: window.getComputedStyle(ticketSub).color,
                                bg: whiteCardBg,
                                fontSize: '12px font-bold',
                                isUI: false
                            });
                        }
                        const subBtn = ticketsContainer.querySelector('a[href="/subscription"]');
                        if (subBtn) {
                            items.push({
                                name: 'Subscription Action Button',
                                text: subBtn.textContent.trim(),
                                fg: window.getComputedStyle(subBtn).color,
                                bg: 'rgb(242, 244, 232)',
                                fontSize: '12px bold',
                                isUI: false
                            });
                        }
                    }

                    // 6. Bottom Navigation
                    const activeTab = document.querySelector('nav a.studio-navigation-selected') || document.querySelector('nav a:first-child');
                    if (activeTab) {
                        items.push({
                            name: 'Bottom Nav Active Tab (בית)',
                            text: activeTab.textContent.trim(),
                            fg: 'rgb(246, 246, 237)',
                            bg: 'rgb(22, 34, 24)',
                            fontSize: '11px bold',
                            isUI: true
                        });
                    }
                    const inactiveTab = document.querySelector('nav a:nth-child(2)');
                    if (inactiveTab) {
                        items.push({
                            name: 'Bottom Nav Inactive Tab (לוח אימונים)',
                            text: inactiveTab.textContent.trim(),
                            fg: window.getComputedStyle(inactiveTab).color,
                            bg: navGlassBg,
                            fontSize: '11px bold',
                            isUI: true
                        });
                    }
                    const inactiveTab2 = document.querySelector('nav a:nth-child(3)');
                    if (inactiveTab2) {
                        items.push({
                            name: 'Bottom Nav Inactive Tab (חשבון)',
                            text: inactiveTab2.textContent.trim(),
                            fg: window.getComputedStyle(inactiveTab2).color,
                            bg: navGlassBg,
                            fontSize: '11px bold',
                            isUI: true
                        });
                    }

                    return items;
                })()
            `;

            const evalRes = await sendSession("Runtime.evaluate", {
                expression: script,
                returnByValue: true
            });

            const rawElements = evalRes.result.value || [];
            const processed = rawElements.map(el => {
                const fg = parseRgb(el.fg);
                const bg = parseRgb(el.bg);
                const ratio = getContrast(fg, bg);
                const isLarge = parseFloat(el.fontSize) >= 18 || (parseFloat(el.fontSize) >= 14 && (el.fontSize.includes('bold') || el.fontSize.includes('700') || el.fontSize.includes('800') || el.fontSize.includes('900')));
                const reqRatio = el.isUI ? 3.0 : (isLarge ? 3.0 : 4.5);
                const pass = ratio >= reqRatio;
                return {
                    name: el.name,
                    text: el.text,
                    fg: el.fg,
                    bg: el.bg,
                    ratio: ratio.toFixed(2),
                    required: `${reqRatio.toFixed(1)}:1`,
                    status: ratio >= 7.0 ? 'PASS AAA' : (pass ? 'PASS AA' : 'FAIL'),
                    pass
                };
            });

            console.table(processed.map(p => ({
                Element: p.name,
                Text: p.text.substring(0, 30),
                Ratio: `${p.ratio}:1`,
                Req: `>=${p.required}`,
                Status: p.status
            })));

            auditSummary.push({ state: st.name, items: processed });
        }

        fs.writeFileSync("contrast_dev_inspection_report.json", JSON.stringify(auditSummary, null, 2));
        console.log("\nSaved complete accurate audit to contrast_dev_inspection_report.json");
    } finally {
        ws.close();
        chrome.kill();
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
}

audit().catch(console.error);

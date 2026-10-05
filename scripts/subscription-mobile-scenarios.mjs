import { tierNavigation } from "./subscription-test-navigation.mjs";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

export async function runMobileScenarios({ call, evaluate, screenshot, baseUrl, output }) {
    const results = [];
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const until = async (expression, label) => {
        for (let attempt = 0; attempt < 80; attempt++) {
            if (await evaluate(expression)) return;
            await wait(100);
        }
        await screenshot("mobile-failure");
        throw new Error(label);
    };
    const ready = async () => {
        await until("Boolean(document.querySelector('.membership-reveal-button') && Object.keys(document.querySelector('.membership-reveal-button')).some(key=>key.startsWith('__reactProps$')))", "Mobile introduction did not hydrate");
        await evaluate("document.fonts.ready");
        await wait(1100);
    };
    const centered = index => `(() => {
        const track = document.querySelector('.membership-carousel');
        const active = document.querySelector('.membership-card-position.is-active');
        if (!track || !active || active.dataset.planIndex !== '${index}') return false;
        const a=active.getBoundingClientRect(), t=track.getBoundingClientRect();
        return Math.abs(a.x + a.width/2 - t.x - track.clientWidth/2) < 2;
    })()`;
    const reveal = async () => {
        const button = await evaluate("(() => {const r=document.querySelector('.membership-reveal-button').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
        await call("Input.dispatchTouchEvent", {type:"touchStart",touchPoints:[button]});
        await call("Input.dispatchTouchEvent", {type:"touchEnd",touchPoints:[]});
        await until(centered(1), "Middle tier must start centered");
        await until("Math.abs(document.querySelector('.membership-stage').getBoundingClientRect().top) < 3", "Reveal must move to the gallery");
        await wait(750);
        assert(await evaluate("Math.abs(document.querySelector('.membership-stage').getBoundingClientRect().top)<1"), "Reveal must remain fully aligned after settling");
    };
    const select = async index => {
        await evaluate(tierNavigation(index));
        await until(centered(index), `Tier ${index} did not center`);
        await wait(300);
    };
    const scene = async (index, width) => {
        const tone = ["terracotta", "sage", "champagne"][index];
        await until(`document.querySelector('.membership-page').dataset.tone === '${tone}'`, "Focused tier must own the scene");
        await wait(900);
        const state = await evaluate(`(() => {
            const layer=document.querySelector('.membership-scene-layer[data-active="true"]');
            const card=document.querySelector('.is-active .membership-card');
            return {tone:layer.className,opacity:Number(getComputedStyle(layer).opacity),
                background:getComputedStyle(layer).backgroundColor,
                accent:getComputedStyle(document.querySelector('.membership-page')).getPropertyValue('--scene-accent'),
                litStrokes:card.querySelectorAll('.membership-card-motif .is-lit').length,
                bottom:card.querySelector('.membership-card-purchase').getBoundingClientRect().bottom};
        })()`);
        assert(state.tone.includes(tone) && state.opacity === 1, "Tier background must finish crossfading");
        assert.equal(state.litStrokes,index+1,"Card motif follows weekly workout rhythm");
        if (width === 390) await screenshot(`tier-${index}-${width}`);
        return state;
    };
    const key = async (name, code, modifiers = 0) => {
        await call("Input.dispatchKeyEvent", { type:"keyDown", key:name, code:name, windowsVirtualKeyCode:code, modifiers });
        await call("Input.dispatchKeyEvent", { type:"keyUp", key:name, code:name, windowsVirtualKeyCode:code, modifiers });
    };
    const swipe = async direction => {
        const bounds = await evaluate("(() => { const r=document.querySelector('.membership-card-position.is-active').getBoundingClientRect(); return {width:innerWidth,y:Math.min(innerHeight-90,r.top+170)};})()");
        const start = direction === "left" ? bounds.width * .78 : bounds.width * .22;
        const end = direction === "left" ? bounds.width * .22 : bounds.width * .78;
        await call("Input.dispatchTouchEvent", { type:"touchStart", touchPoints:[{x:start,y:bounds.y}] });
        for (let step = 1; step <= 8; step++) {
            await call("Input.dispatchTouchEvent", { type:"touchMove", touchPoints:[{x:start+(end-start)*step/8,y:bounds.y}] });
            await wait(25);
        }
        await call("Input.dispatchTouchEvent", { type:"touchEnd", touchPoints:[] });
    };
    await call("Emulation.setTouchEmulationEnabled", { enabled:true, maxTouchPoints:1 });
    for (const [width,height] of [[390,844],[320,568],[375,667],[430,932]]) {
        await call("Emulation.setDeviceMetricsOverride", { width,height,deviceScaleFactor:1,mobile:true });
        await call("Page.navigate", { url:`${baseUrl}/subscription` });
        await ready();
        assert(await evaluate("!document.querySelector('.membership-carousel') && !document.querySelector('.membership-details')"), "Plans and FAQ must stay hidden before reveal");
        const intro = await evaluate("({height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,buttonBottom:document.querySelector('.membership-reveal-button').getBoundingClientRect().bottom})");
        assert(intro.width <= width && intro.height <= height + 1 && intro.buttonBottom <= height, `Intro must fit phone ${width}×${height}: ${JSON.stringify(intro)}`);
        await screenshot(`intro-${width}`);
        await reveal();
        await screenshot(`gallery-${width}`);
        assert(await evaluate("!document.querySelector('.membership-carousel-controls')"), "Bottom plan controls must be removed");
        const focus=await evaluate("[...document.querySelectorAll('.membership-card')].map(card=>new DOMMatrix(getComputedStyle(card).transform).a)");
        assert(focus[1]>.99 && focus[0]<.9 && focus[2]<.9, "Centered card must dominate smaller edge previews");
        const order = await evaluate("[...document.querySelectorAll('[data-plan-index]')].map(el=>Number(el.dataset.planIndex))");
        assert.deepEqual(order,[2,1,0], "Highest tier left; lowest tier right");
        const heights = [];
        const scenes = [];
        for (const [index,price] of [[0,240],[1,450],[2,650]]) {
            await select(index);
            const geometry = await evaluate(`(() => {
                const card=document.querySelector('.membership-card-position.is-active');
                const content=card.querySelector('.membership-card-content');
                const r=card.getBoundingClientRect();
                const clipped=[...content.querySelectorAll('h3,p,li,button')].filter(el=>{
                    const e=el.getBoundingClientRect(); return e.left<r.left-1 || e.right>r.right+1;
                }).map(el=>el.className || el.tagName);
                return {height:r.height,clipped,price:parseFloat(card.querySelector('.membership-price-value').textContent),
                    documentWidth:document.documentElement.scrollWidth,
                    activeButtons:document.querySelectorAll('.membership-card-content:not([inert]) button').length};
            })()`);
            assert.equal(geometry.price,price);
            assert.deepEqual(geometry.clipped,[], `Card text clipped at ${width}: ${JSON.stringify(geometry)}`);
            assert.equal(geometry.activeButtons,1,"Only the focused card owns a payment action");
            assert(geometry.documentWidth <= width,"Only carousel owns horizontal scrolling");
            heights.push(geometry.height);
            const tierScene = await scene(index,width);
            if (height >= 800) assert(tierScene.bottom < height-20,"Purchase action must fit a tall phone's revealed view");
            scenes.push(tierScene);
        }
        assert(Math.max(...heights)-Math.min(...heights)<2,"Switching cards must preserve deck height");
        assert.equal(new Set(scenes.map(item=>item.background)).size,3,"Every tier needs its own background hue");
        assert.equal(new Set(scenes.map(item=>item.accent)).size,3,"Every tier needs its own accent");
        await select(1);
        await evaluate("document.querySelector('.membership-stage').scrollIntoView({behavior:'instant'})");
        await swipe("left");
        await until(centered(0),"Left swipe must reveal the lower tier on the right");
        await swipe("right");
        await until(centered(1),"Right swipe must return to the middle tier");
        await swipe("right");
        await until(centered(2),"Right swipe must reveal the higher tier on the left");
        await screenshot(`premium-${width}`);
        results.push({width,height,introFits:true,completeReveal:true,startsOnMiddle:true,physicalTierOrder:true,threePrices:true,nativeTouchSwipes:true,threeTierAccents:true,backgroundCrossfades:true});
    }
    // Model a mobile browser retracting its toolbar during the reveal.
    await call("Emulation.setDeviceMetricsOverride", {width:390,height:760,deviceScaleFactor:1,mobile:true});
    await call("Page.navigate", {url:`${baseUrl}/subscription`});
    await ready();
    await evaluate("document.querySelector('.membership-reveal-button').click()");
    await wait(180);
    await call("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:true});
    await until("Math.abs(document.querySelector('.membership-stage').getBoundingClientRect().top)<1", "Reveal must follow viewport height changes");
    await wait(500);
    assert(await evaluate("Math.abs(document.querySelector('.membership-stage').getBoundingClientRect().top)<1"), "Toolbar resize must not leave the gallery partially revealed");
    await until(centered(1), "Viewport resizing preserves middle-first selection");

    // Interrupt one crossfade with another tier before it settles.
    await evaluate(tierNavigation(0));
    await until("[...document.querySelectorAll('.membership-scene-layer')].some(el=>{const opacity=Number(getComputedStyle(el).opacity);return opacity>0 && opacity<1})", "Background transition must crossfade rather than jump");
    await evaluate(tierNavigation(2));
    await until(centered(2), "Rapid selection must settle on the final tier");
    await scene(2,390);
    await evaluate("document.querySelector('.membership-intro-link').click()");
    await until("window.scrollY===0", "Studio description remains reachable");
    await evaluate("document.querySelector('.membership-reveal-button').click()");
    await until("Math.abs(document.querySelector('.membership-stage').getBoundingClientRect().top)<1", "Repeat reveal must align completely");
    await until(centered(2), "Repeat reveal preserves the chosen tier");
    results.push({toolbarResizeDuringReveal:true,interruptedCrossfade:true,repeatReveal:true});
    await call("Emulation.setDeviceMetricsOverride", {width:390,height:844,deviceScaleFactor:1,mobile:true});
    await call("Emulation.setSafeAreaInsetsOverride", {insets:{top:47,bottom:34,left:0,right:0}});
    await call("Emulation.setEmulatedMedia", {features:[{name:"prefers-reduced-motion",value:"reduce"}]});
    await call("Page.navigate", {url:`${baseUrl}/subscription`});
    await ready();
    await screenshot("intro-safe-area");
    await reveal();
    await evaluate("document.querySelector('.membership-carousel').focus()");
    await key("ArrowLeft",37);
    await until(centered(2),"Keyboard alternative must reach premium");
    assert(await evaluate("getComputedStyle(document.querySelector('.membership-orbit')).animationName==='none'"),"Reduced motion stops ambient animation");
    await evaluate("document.querySelector('.is-active .membership-card-purchase').scrollIntoView({block:'center',behavior:'instant'});document.querySelector('.is-active .membership-card-purchase').click()");
    await until("document.querySelector('dialog').open", "Payment sheet did not open");
    assert(await evaluate("document.querySelector('.membership-payment-total > strong').textContent.includes('650')"),"Payment matches premium selection");
    assert(await evaluate("document.activeElement.classList.contains('membership-payment-close') && document.body.style.overflow==='hidden'"),"Initial dialog focus and background lock");
    await screenshot("payment-mobile");
    await key("Tab",9,8);
    assert(await evaluate("document.querySelector('dialog').contains(document.activeElement)"),"Sheet traps reverse Tab");
    await key("Escape",27);
    await until("!document.querySelector('dialog').open", "Escape must close the sheet");
    assert(await evaluate("document.activeElement.classList.contains('membership-card-purchase')"),"Focus returns to chosen card");
    await evaluate("document.querySelector('.is-active .membership-card-purchase').click()");
    await until("document.querySelector('dialog').open", "Sheet must reopen");
    await evaluate("document.querySelector('.membership-copy-box button').click()");
    await wait(100);
    assert(await evaluate("window.__copiedText.includes('12') && document.querySelector('.membership-copy-feedback').textContent.length>20"),"Copy carries selected tier");
    await evaluate("navigator.clipboard.writeText=async()=>{throw new Error('synthetic denied')};document.querySelector('.membership-copy-box button').click()");
    await wait(100);
    assert(await evaluate("document.querySelector('.membership-copy-feedback').textContent.includes('כפתור ההעתקה')"),"Clipboard failure is recoverable through the copy button");
    await evaluate("window.open=()=>null;document.querySelector('.membership-slide-handle').click()");
    await wait(100);
    assert(await evaluate("document.querySelector('dialog').open && Boolean(document.querySelector('.membership-payment-error'))"),"Blocked Bit popup keeps instructions available");
    await evaluate("window.open=url=>{window.__paymentUrl=url;return {opener:window}};document.querySelector('.membership-slide-handle').click()");
    await until("!document.querySelector('dialog').open", "Synthetic handoff must close instructions");
    assert(await evaluate("window.__paymentUrl.startsWith('https://www.bitpay.co.il/') && Boolean(document.querySelector('.membership-handoff'))"),"Handoff must await Talia approval");
    await evaluate("document.querySelector('.membership-faq summary').click();window.scrollTo(0,document.documentElement.scrollHeight)");
    assert(await evaluate("document.querySelector('.membership-footer').getBoundingClientRect().bottom<=innerHeight+1"),"Footer stays reachable");
    results.push({safeAreas:true,reducedMotion:true,keyboardAlternative:true,dialogFocus:true,copySuccess:true,copyFailure:true,blockedPopup:true,syntheticBitHandoff:true});
    await writeFile(`${output}/report.json`,JSON.stringify({mobileOnly:true,results},null,2));
    console.log(JSON.stringify({output,mobileOnly:true,results},null,2));
}

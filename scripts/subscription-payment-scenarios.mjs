import assert from 'node:assert/strict';
import { tierNavigation } from './subscription-test-navigation.mjs';

// Real touch gestures against a synthetic Bit destination. Never opens Bit.
export async function runPaymentScenarios({ call, evaluate, screenshot, baseUrl }) {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const until = async (expression, label) => {
        for (let attempt=0;attempt<100;attempt++) {
            if (await evaluate(expression)) return;
            await wait(80);
        }
        await screenshot('slider-failure');
        throw new Error(label);
    };
    const fitsWithoutScroll = async label => {
        const geometry = await evaluate(`(() => {
            const dialog=document.querySelector('dialog'),sheet=dialog.querySelector('.membership-payment-sheet'),content=dialog.querySelector('.membership-payment-content');
            const r=sheet.getBoundingClientRect(),footer=dialog.querySelector('footer').getBoundingClientRect();
            return {top:r.top,bottom:r.bottom,height:innerHeight,footerBottom:footer.bottom,overflow:content.scrollHeight-content.clientHeight,dialogOverflow:dialog.scrollHeight-dialog.clientHeight};
        })()`);
        assert(geometry.top>=12 && geometry.bottom<=geometry.height-12 && geometry.footerBottom<=geometry.bottom && geometry.overflow<=1 && geometry.dialogOverflow<=1,`${label}: ${JSON.stringify(geometry)}`);
    };
    const slide = async (fraction, cancel=false, capture=false) => {
        const start=await evaluate(`(() => {
            const handle=document.querySelector('.membership-slide-handle'),rail=document.querySelector('.membership-slide-rail');
            const r=handle.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,travel:rail.clientWidth-handle.offsetWidth-16};
        })()`);
        await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x,y:start.y}]});
        for (let step=1;step<=10;step++) {
            await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x-start.travel*fraction*step/10,y:start.y}]});
            await wait(20);
        }
        if (capture) await screenshot('payment-slider-drag');
        assert.equal(await evaluate('window.__bitOpens'),0,'Dragging alone must never open Bit');
        await call('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
        await wait(400);
    };
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    await call('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,bottom:0,left:0,right:0}});
    for (const [width,height] of [[320,568],[375,667],[390,844],[430,932]]) {
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
        await call('Page.navigate',{url:`${baseUrl}/subscription`});
        await until("document.querySelector('.membership-reveal-button') && Object.keys(document.querySelector('.membership-reveal-button')).some(key=>key.startsWith('__reactProps$'))",'Slider introduction must hydrate');
        await evaluate('document.fonts.ready');
        await wait(1000);
        await evaluate("document.querySelector('.membership-reveal-button').click()");
        await until("Math.abs(document.querySelector('.membership-stage')?.getBoundingClientRect().top)<1 && document.querySelector('.membership-carousel').dataset.moving==='false'",'Deck must reveal and settle');
        await evaluate("document.querySelector('.is-active .membership-card-purchase').click()");
        await until("document.querySelector('dialog').open",'Receipt sheet must open');
        await wait(350);
        const bounds=await evaluate(`(() => {
            const rail=document.querySelector('.membership-slide-rail').getBoundingClientRect(),close=document.querySelector('.membership-payment-close').getBoundingClientRect();
            const sheet=document.querySelector('.membership-payment-sheet').getBoundingClientRect(),content=document.querySelector('.membership-payment-content');
            return {left:rail.left,right:rail.right,bottom:rail.bottom,closeTop:close.top,doc:document.documentElement.scrollWidth,sheetTop:sheet.top,sheetBottom:sheet.bottom,overflow:content.scrollHeight-content.clientHeight};
        })()`);
        assert(bounds.left>=0 && bounds.right<=width && bounds.bottom<=height && bounds.closeTop>=0 && bounds.doc<=width,'Receipt and fixed actions must fit the phone');
        assert(bounds.sheetTop>=12 && bounds.sheetBottom<=height-12 && bounds.overflow<=1,`Payment card must fit without scrolling at ${width}×${height}: ${JSON.stringify(bounds)}`);
        await screenshot(`payment-v2-${width}`);
        for (const [index,tone] of [[0,'terracotta'],[1,'sage'],[2,'champagne'],[1,'sage']]) {
            await evaluate("document.querySelector('.membership-payment-close').click()");
            await until("!document.querySelector('dialog').open",'Close must dismiss payment');
            assert(await evaluate("document.activeElement.matches('.membership-card-purchase')"),'Close must restore purchase-button focus');
            await evaluate(tierNavigation(index));
            await until(`document.querySelector('.membership-page').dataset.tone==='${tone}' && document.querySelector('.membership-carousel').dataset.moving==='false'`,'Tier must settle before purchase');
            await wait(350);
            await evaluate("document.querySelector('.is-active .membership-card-purchase').click()");
            await until("document.querySelector('dialog').open",'Selected tier payment must open');
            await wait(250);
            await fitsWithoutScroll(`Tier ${tone} must fit at ${width}×${height}`);
            assert(await evaluate(`(() => {
                const dialog=document.querySelector('dialog'),sheet=dialog.querySelector('.membership-payment-sheet'),card=document.querySelector('.is-active .membership-card');
                return dialog.dataset.tone==='${tone}' && getComputedStyle(sheet).backgroundColor===getComputedStyle(card).backgroundColor && getComputedStyle(sheet).color===getComputedStyle(card).color;
            })()`),'Payment must use the exact selected card surface and ink');
            if (width===390) await screenshot(`payment-tier-${tone}`);
        }
        await evaluate("document.querySelector('.membership-copy-box button').click()");
        await until("document.querySelector('.membership-copy-box button').textContent.includes('הועתק')",'Copy must announce success');
        await fitsWithoutScroll('Copied feedback must not introduce scrolling');
        await evaluate("navigator.clipboard.writeText=async()=>{throw new Error('synthetic clipboard rejection')};document.querySelector('.membership-copy-box button').click()");
        await until("document.querySelector('.membership-copy-feedback').textContent.includes('לא הצלחנו')",'Clipboard failure must provide retry guidance');
        await fitsWithoutScroll('Copy failure must not introduce scrolling');
        await evaluate("navigator.clipboard.writeText=async text=>{window.__copiedText=text};document.querySelector('.membership-copy-box button').click()");
        await until("document.querySelector('.membership-copy-box button').textContent.includes('הועתק')",'Clipboard retry must succeed');
        await evaluate("window.__bitOpens=0;window.open=()=>{window.__bitOpens++;return {opener:window}}");
        await slide(.45,false,width===390);
        assert(await evaluate("document.querySelector('dialog').open && new DOMMatrix(getComputedStyle(document.querySelector('.membership-slide-handle')).transform).e===0"),'Partial slide must return to its starting position');
        await slide(1,true);
        assert(await evaluate("document.querySelector('dialog').open && window.__bitOpens===0"),'Cancelled full slide must never confirm');
        {
            await evaluate("window.open=()=>{window.__bitOpens++;return null}");
            await slide(1);
            assert(await evaluate("document.querySelector('dialog').open && Boolean(document.querySelector('.membership-payment-error')) && new DOMMatrix(getComputedStyle(document.querySelector('.membership-slide-handle')).transform).e===0"),'Blocked popup must reset the slider and retain retry instructions');
            await fitsWithoutScroll(`Blocked popup must fit without scrolling at ${width}×${height}`);
            await screenshot('payment-popup-retry');
            await evaluate("window.__bitOpens=0;window.open=()=>{window.__bitOpens++;return {opener:window}}");
        }
        await slide(1);
        await until("!document.querySelector('dialog').open",'Completed slide must hand off');
        assert.equal(await evaluate('window.__bitOpens'),1,'A completed gesture must open exactly one destination');
        assert(await evaluate("Boolean(document.querySelector('.membership-handoff'))"),'Handoff must still await manual approval');
        if (width===390) {
            await evaluate("document.querySelector('.is-active .membership-card-purchase').click()");
            await until("document.querySelector('dialog').open",'Receipt must reopen for keyboard confirmation');
            await evaluate("window.__bitOpens=0;document.querySelector('.membership-slide-handle').focus()");
            await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
            await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
            await until("!document.querySelector('dialog').open",'Enter must activate the non-drag confirmation');
            assert.equal(await evaluate('window.__bitOpens'),1,'Keyboard confirmation must open exactly once');
        }
        if (width===430) {
            await call('Emulation.setSafeAreaInsetsOverride',{insets:{top:44,bottom:34,left:0,right:0}});
            await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
            await evaluate("document.querySelector('.is-active .membership-card-purchase').click()");
            await until("document.querySelector('dialog').open",'Safe-area payment must open');
            await fitsWithoutScroll('Safe areas must preserve the full card');
            assert(await evaluate("getComputedStyle(document.querySelector('.membership-payment-sheet')).animationName==='none'"),'Reduced motion must remove card entrance');
            await evaluate("document.querySelector('.membership-payment-cancel').focus()");
            await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
            await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
            assert(await evaluate("document.activeElement.matches('.membership-payment-close')"),'Tab must wrap inside payment');
            await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
            await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
            await until("!document.querySelector('dialog').open",'Escape must close payment');
            assert(await evaluate("document.activeElement.matches('.membership-card-purchase')"),'Escape must restore purchase focus');
        }
    }
    console.log(JSON.stringify({receiptMobileSizes:true,zeroScroll:true,matchingTierMaterials:true,clipboardSuccessAndRetry:true,partialSlideReturns:true,cancelledSlideSafe:true,fullSlideOpensOnce:true,blockedPopupRetry:true,keyboardConfirmation:true,safeAreas:true,reducedMotion:true,focusTrapAndRestoration:true}));
}

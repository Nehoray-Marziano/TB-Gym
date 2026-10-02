import assert from 'node:assert/strict';

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
            return {left:rail.left,right:rail.right,bottom:rail.bottom,closeTop:close.top,doc:document.documentElement.scrollWidth};
        })()`);
        assert(bounds.left>=0 && bounds.right<=width && bounds.bottom<=height && bounds.closeTop>=0 && bounds.doc<=width,'Receipt and fixed actions must fit the phone');
        await screenshot(`payment-v2-${width}`);
        await evaluate("window.__bitOpens=0;window.open=()=>{window.__bitOpens++;return {opener:window}}");
        await slide(.45,false,width===390);
        assert(await evaluate("document.querySelector('dialog').open && new DOMMatrix(getComputedStyle(document.querySelector('.membership-slide-handle')).transform).e===0"),'Partial slide must return to its starting position');
        await slide(1,true);
        assert(await evaluate("document.querySelector('dialog').open && window.__bitOpens===0"),'Cancelled full slide must never confirm');
        if (width===390) {
            await evaluate("window.open=()=>{window.__bitOpens++;return null}");
            await slide(1);
            assert(await evaluate("document.querySelector('dialog').open && Boolean(document.querySelector('.membership-payment-error')) && new DOMMatrix(getComputedStyle(document.querySelector('.membership-slide-handle')).transform).e===0"),'Blocked popup must reset the slider and retain retry instructions');
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
    }
    console.log(JSON.stringify({receiptMobileSizes:true,partialSlideReturns:true,cancelledSlideSafe:true,fullSlideOpensOnce:true,blockedPopupRetry:true,keyboardConfirmation:true}));
}

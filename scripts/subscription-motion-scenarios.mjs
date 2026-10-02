import { tierNavigation } from "./subscription-test-navigation.mjs";
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

export async function runMotionScenarios({ call, evaluate, screenshot, baseUrl, output, recordOnly = false }) {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const until = async (expression, label) => {
        for (let attempt = 0; attempt < 100; attempt++) {
            if (await evaluate(expression)) return;
            await wait(75);
        }
        await screenshot('motion-failure');
        throw new Error(label);
    };
    await call('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:2, mobile:true });
    await call('Emulation.setTouchEmulationEnabled', { enabled:true, maxTouchPoints:1 });
    await call('Emulation.setSafeAreaInsetsOverride', { insets:{top:0,bottom:0,left:0,right:0} });
    await call('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'no-preference'}] });
    await call('Page.navigate', { url:`${baseUrl}/subscription` });
    await until("document.querySelector('.membership-reveal-button') && Object.keys(document.querySelector('.membership-reveal-button')).some(key=>key.startsWith('__reactProps$'))", 'Motion test did not hydrate');
    await evaluate('document.fonts.ready');
    await wait(1300);
    await call('Profiler.enable');
    await call('Profiler.start');
    await call('Emulation.setCPUThrottlingRate', { rate:4 });
    const revealPoint=await evaluate("(() => { const r=document.querySelector('.membership-reveal-button').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}; })()");
    await call('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[revealPoint]});
    await call('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    try {
        await until("Math.abs(document.querySelector('.membership-stage')?.getBoundingClientRect().top)<1", 'Reveal must complete under CPU throttling');
    } catch(error) {
        const {profile}=await call('Profiler.stop');
        await writeFile(`${output}/motion.cpuprofile`,JSON.stringify(profile));
        throw error;
    }
    await wait(1300);
    await evaluate(`(() => {
        const probe=window.__membershipProbe={dragging:false,phase:'swipe',changesDuringTouch:0,touchTarget:null,targetRemoved:false,frameGaps:[],longTasks:[],animationFrames:[],frames:0};
        const observer=new MutationObserver(records=>{
            if(probe.dragging) probe.changesDuringTouch+=records.filter(record=>record.attributeName==='data-tone' || record.attributeName==='aria-current').length;
        });
        observer.observe(document.querySelector('.membership-page'),{subtree:true,attributes:true,attributeFilter:['data-tone','aria-current']});
        let last=performance.now();
        const sample=now=>{
            probe.frameGaps.push(now-last);last=now;probe.frames++;
            if(probe.dragging && probe.touchTarget && !probe.touchTarget.isConnected) probe.targetRemoved=true;
            probe.frame=requestAnimationFrame(sample);
        };
        probe.frame=requestAnimationFrame(sample);
        const tasks=new PerformanceObserver(list=>probe.longTasks.push(...list.getEntries().map(entry=>({duration:Math.round(entry.duration),phase:probe.phase,attribution:entry.attribution.map(item=>item.name)}))));
        tasks.observe({type:'longtask',buffered:false});
        const animationFrames=new PerformanceObserver(list=>probe.animationFrames.push(...list.getEntries().map(entry=>({duration:Math.round(entry.duration),phase:probe.phase,renderStart:entry.renderStart,styleAndLayoutStart:entry.styleAndLayoutStart,scripts:entry.scripts.map(script=>({duration:Math.round(script.duration),invoker:script.invoker,sourceURL:script.sourceURL,sourceFunctionName:script.sourceFunctionName,forcedStyleAndLayoutDuration:script.forcedStyleAndLayoutDuration}))}))));
        animationFrames.observe({type:'long-animation-frame',buffered:false});
        probe.stop=()=>{cancelAnimationFrame(probe.frame);observer.disconnect();tasks.disconnect();animationFrames.disconnect()};
    })()`);
    const y=await evaluate("document.querySelector('.membership-card-position.is-active').getBoundingClientRect().top+140");
    await evaluate(`window.__membershipProbe.touchTarget=document.elementFromPoint(12,${y});window.__membershipProbe.dragging=true`);
    await call('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x:12,y}]});
    for (let step=1;step<=12;step++) {
        await call('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:12+step*26,y}]});
        await wait(35);
    }
    // Holding the finger still must not commit a new tier or replace its target.
    await wait(280);
    const liveFocus=await evaluate(`(() => {
        const card=document.querySelector('[data-plan-index="2"] .membership-card');
        return {scale:new DOMMatrix(getComputedStyle(card).transform).a,sceneOpacity:Number(getComputedStyle(document.querySelector('.membership-scene--champagne')).opacity)};
    })()`);
    assert(liveFocus.scale>.93 && liveFocus.sceneOpacity>.5,'Card growth and hue must follow the finger before touch release');
    await evaluate('window.__membershipProbe.dragging=false');
    await call('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
    await until("document.querySelector('.is-active')?.dataset.planIndex==='2'", 'Swipe must finish on the higher tier');
    await wait(700);
    await evaluate("window.__membershipProbe.phase='burst'");
    // Burst controls while previous scrolling/fading is still underway.
    for (const index of [0,2,0,1,2,1]) {
        await evaluate(tierNavigation(index));
        await wait(70);
    }
    await until(`(() => {
        const track=document.querySelector('.membership-carousel'),card=document.querySelector('.membership-card-position.is-active');
        const r=card.getBoundingClientRect();
        return card.dataset.planIndex==='1' && Math.abs(r.x+r.width/2-innerWidth/2)<2 && track.dataset.moving!=='true';
    })()`, 'Burst selections must settle on the last tier without freezing');
    await wait(700);
    const report=await evaluate(`(() => {
        const probe=window.__membershipProbe;probe.stop();
        const gaps=probe.frameGaps.slice(2).sort((a,b)=>a-b);
        return {cpuThrottle:4,changesDuringTouch:probe.changesDuringTouch,touchTargetRemoved:probe.targetRemoved,
            frameCount:probe.frames,p95FrameMs:Math.round(gaps[Math.floor(gaps.length*.95)]),
            longestFrameMs:Math.round(Math.max(...gaps)),longTasks:probe.longTasks,animationFrames:probe.animationFrames,finalTier:document.querySelector('.is-active').dataset.planIndex};
    })()`);
    report.liveFocus=liveFocus;
    const {profile}=await call('Profiler.stop');
    await writeFile(`${output}/motion.cpuprofile`,JSON.stringify(profile));
    await writeFile(`${output}/motion-report.json`,JSON.stringify(report,null,2));
    console.log(JSON.stringify({motion:report},null,2));
    if (!recordOnly) {
        assert.equal(report.changesDuringTouch,0,'Payment ownership must wait for the finger to lift and scrolling to settle');
        assert.equal(report.touchTargetRemoved,false,'Never unmount the touch target during a swipe');
        assert(report.longestFrameMs<250,'Throttled swipe must avoid prolonged main-thread freezes');
    }
    await screenshot('motion-settled');
    // Exercise browsers without scrollend, and release touch state on cancellation.
    const {identifier}=await call('Page.addScriptToEvaluateOnNewDocument', {source:`
        const subscribe=EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener=function(type,...args){if(type!=='scrollend')return subscribe.call(this,type,...args)};
    `});
    await call('Page.navigate', {url:`${baseUrl}/subscription`});
    await until("document.querySelector('.membership-reveal-button') && Object.keys(document.querySelector('.membership-reveal-button')).some(key=>key.startsWith('__reactProps$'))", 'Fallback introduction must hydrate');
    await evaluate('document.fonts.ready');
    await wait(1300);
    await evaluate("document.querySelector('.membership-reveal-button').click()");
    await until("document.activeElement.classList.contains('membership-carousel') && Math.abs(document.querySelector('.membership-stage').getBoundingClientRect().top)<1", 'Reveal timer fallback must align and restore keyboard focus');
    await evaluate(tierNavigation(0));
    await until("document.querySelector('.is-active').dataset.planIndex==='0' && document.querySelector('.membership-carousel').dataset.moving==='false'", 'Selection debounce fallback must settle');
    const cancelY=await evaluate("document.querySelector('.is-active').getBoundingClientRect().top+170");
    await call('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x:90,y:cancelY}]});
    await call('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:230,y:cancelY}]});
    await call('Input.dispatchTouchEvent', {type:'touchCancel',touchPoints:[]});
    await until("document.querySelector('.membership-carousel').dataset.moving==='false' && !document.querySelector('.is-active .membership-card-purchase').disabled", 'Cancelled touches must never leave the deck or payment button frozen');
    report.scrollEndFallback=true;
    report.cancelledTouchRecovery=true;
    await writeFile(`${output}/motion-report.json`,JSON.stringify(report,null,2));
    console.log(JSON.stringify({scrollEndFallback:true,cancelledTouchRecovery:true}));
    await call('Page.removeScriptToEvaluateOnNewDocument',{identifier});
    await call('Emulation.setCPUThrottlingRate', {rate:1});
}

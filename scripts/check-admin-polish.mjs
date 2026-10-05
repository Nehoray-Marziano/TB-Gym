// Local, synthetic browser checks. All Supabase/API requests are intercepted;
// no profiles, bookings, credits, or notifications are changed in production.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile, unlink, rmdir, mkdtemp } from "node:fs/promises";
import { resolve, join } from "node:path";

const baseUrl = process.argv[2] || "http://127.0.0.1:3110";
assert(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname));
const output = resolve("scratch/admin-polish-qa");
const fixtureDir = resolve("src/app/admin-polish-check");
const fixtureFile = join(fixtureDir, "page.tsx");
const fixture = `"use client";
import { useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import Schedule from "@/app/admin/schedule/page";
import Trainees from "@/app/admin/trainees/page";
import Overview from "@/app/admin/page";
import { getSupabaseClient } from "@/lib/supabaseClient";
if (typeof window !== "undefined") {
    const qaClient = getSupabaseClient();
    qaClient.auth.getSession = async () => ({data:{session:{user:{id:"qa-admin"}}},error:null} as Awaited<ReturnType<typeof qaClient.auth.getSession>>);
}
export default function Preview() {
    const [view,setView] = useState("schedule");
    return <AdminShell><div hidden><button id="qa-schedule" onClick={()=>setView("schedule")}/><button id="qa-trainees" onClick={()=>setView("trainees")}/><button id="qa-overview" onClick={()=>setView("overview")}/></div>{view==="schedule"?<Schedule/>:view==="trainees"?<Trainees/>:<Overview/>}</AdminShell>;
}`;

const mock = `(() => {
    const profiles = Array.from({length:32},(_,i)=>({id:"qa-user-"+i,full_name:i===0?"מתאמנת בדיקה עם שם ארוך במיוחד לבדיקת שבירת שורות":"מתאמנת בדיקה "+i,email:"qa"+i+"@example.invalid",phone:"050000"+String(i).padStart(4,"0"),role:"trainee"}));
    let sessions = Array.from({length:34},(_,i)=>({id:"qa-session-"+i,title:i===0?"אימון כוח ועיצוב עם שם ארוך במיוחד לבדיקה":"אימון בדיקה "+i,start_time:new Date(Date.now()+(i<30?i+24:-i)*3600000).toISOString(),end_time:new Date(Date.now()+(i<30?i+25:1-i)*3600000).toISOString(),max_capacity:10,current_bookings:3,bookings:[{count:3}]}));
    let bookings = profiles.slice(0,3).map((user,i)=>({id:"qa-booking-"+i,user_id:user.id,status:"confirmed",created_at:new Date().toISOString(),users:user}));
    const balances=new Map(profiles.map(p=>[p.id,8])), receipts=new Map();
    window.__qa = {fail:null,delay:250,calls:{},empty:false,requests:[],lose:null};
    const original = window.fetch;
    window.fetch = async (input,init={}) => {
        const url = new URL(typeof input==="string"?input:input.url,location.href);
        if(url.pathname.startsWith("/rest/v1/") || url.pathname.startsWith("/api/notifications")) {
            const raw=url.pathname.split("/").at(-1), name=raw.replace(/_once$/, "");
            window.__qa.calls[name]=(window.__qa.calls[name]||0)+1;
            await new Promise(r=>setTimeout(r,window.__qa.delay));
            const fail=window.__qa.fail===name||(name==="admin_list_trainees"&&window.__qa.fail==="profiles");
            const body=JSON.parse(init.body||"{}");
            if(raw.endsWith("_once"))window.__qa.requests.push({name,requestId:body.p_request_id});
            if(!fail && name==="admin_grant_tickets"&&!receipts.has(body.p_request_id)){balances.set(body.p_user_id,balances.get(body.p_user_id)+body.p_quantity);receipts.set(body.p_request_id,true);}
            if(!fail && window.__qa.lose===name){window.__qa.lose=null;throw new TypeError("Synthetic lost reply after commit");}
            const data=window.__qa.empty?[]:name==="admin_list_trainees"?profiles.map(p=>({...p,tickets:balances.get(p.id)})):name==="profiles"?profiles:name==="user_tickets"?profiles.flatMap(p=>Array.from({length:balances.get(p.id)},(_,i)=>({id:p.id+"-ticket-"+i,user_id:p.id}))):name==="gym_sessions_with_counts"?sessions:name==="bookings"?bookings:name==="get_available_tickets"?8:{success:true,user_ids:[]};
            if(!fail && name==="admin_cancel_booking"){const body=JSON.parse(init.body||"{}");bookings=bookings.filter(b=>b.id!==body.p_booking_id);}
            if(!fail && name==="admin_delete_session"){const body=JSON.parse(init.body||"{}");sessions=sessions.filter(s=>s.id!==body.p_session_id);}
            return new Response(JSON.stringify(fail?{message:"Synthetic failure",code:"QA500"}:data),{status:fail?500:200,headers:{"Content-Type":"application/json","Content-Range":"0-31/32"}});
        }
        if(url.hostname!==location.hostname) return new Response(JSON.stringify({}),{status:200,headers:{"Content-Type":"application/json"}});
        return original(input,init);
    };
})();`;

let chrome, ws, created = false, evaluateBrowser, saveShot;
const checks = [];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
    await mkdir(output,{recursive:true});
    await mkdir(fixtureDir);
    created = true;
    await writeFile(fixtureFile,fixture,"utf8");
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
        const response = await fetch(baseUrl + "/admin-polish-check");
        if (response.ok && (await response.text()).includes('id="qa-schedule"')) { ready = true; break; }
        await delay(1000);
    }
    assert(ready, "Development server did not discover the temporary admin fixture");
    const profile = await mkdtemp(join(output,"chrome-"));
    chrome=spawn(process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",[
        "--headless=new","--no-sandbox","--remote-debugging-port=0","--remote-allow-origins=*",`--user-data-dir=${profile}`,"--no-first-run","--no-default-browser-check","about:blank"
    ],{stdio:["ignore","pipe","pipe"],windowsHide:true});
    const wsUrl=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error("Chrome startup timeout")),30000);chrome.on("error",reject);chrome.stderr.on("data",data=>{const match=data.toString().match(/DevTools listening on (ws:\/\/\S+)/);if(match){clearTimeout(timeout);resolve(match[1]);}});});
    ws=new WebSocket(wsUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
    let nextId=0;const pending=new Map();
    ws.onmessage=event=>{const m=JSON.parse(event.data);const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timeout);if(m.error)p.reject(Error(JSON.stringify(m.error)));else p.resolve(m.result);};
    const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++nextId;const timeout=setTimeout(()=>reject(Error(method+" timeout")),90000);pending.set(id,{resolve,reject,timeout});ws.send(JSON.stringify({id,method,params,sessionId}));});
    const {targetId}=await send("Target.createTarget",{url:"about:blank"});
    const {sessionId}=await send("Target.attachToTarget",{targetId,flatten:true});
    const call=(method,params={})=>send(method,params,sessionId);
    const evaluate=async expression=>{const r=await call("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    const screenshot=async name=>{await delay(300);const r=await call("Page.captureScreenshot",{format:"png"});await writeFile(join(output,name+".png"),Buffer.from(r.data,"base64"));};
    evaluateBrowser = evaluate; saveShot = screenshot;
    const waitFor=async (expression,label)=>{for(let i=0;i<240;i++){try{if(await evaluate(expression))return;}catch{}await delay(250);}throw Error("Timeout: "+label);};
    const check=async(label,expression)=>{await waitFor(expression,label);checks.push(label);console.log("PASS:",label);};
    const click=async selector=>{const pos=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error("Missing "+${JSON.stringify(selector)});e.scrollIntoView({block:"nearest"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await call("Input.dispatchMouseEvent",{type:"mousePressed",button:"left",clickCount:1,...pos});await call("Input.dispatchMouseEvent",{type:"mouseReleased",button:"left",clickCount:1,...pos});};
    const clickText=async (text,scope=".studio-modal")=>{
        await evaluate(`(()=>{document.getElementById("qa-click-target")?.removeAttribute("id");const e=[...document.querySelectorAll(${JSON.stringify(scope+" button")})].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!e)throw Error("Missing button "+${JSON.stringify(text)});e.id="qa-click-target";})()`);
        await click("#qa-click-target");
    };
    const key=async(key,modifiers=0)=>{const windowsVirtualKeyCode={Tab:9,Escape:27,Enter:13}[key];for(const type of ["keyDown","keyUp"])await call("Input.dispatchKeyEvent",{type,key,code:key,modifiers,windowsVirtualKeyCode});};
    const input=async(selector,value)=>{await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event("input",{bubbles:true}));})()`);};
    const view=async name=>{await evaluate(`document.getElementById("qa-${name}").click()`);await waitFor(`document.querySelector("h1")?.textContent.includes(${JSON.stringify({schedule:"יומן",trainees:"המתאמנות",overview:"תמונת"}[name])})`,"view "+name);await delay(400);};
    await call("Page.enable");await call("Page.addScriptToEvaluateOnNewDocument",{source:mock});
    await call("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await call("Page.navigate",{url:baseUrl+"/admin-polish-check"});
    await waitFor("document.querySelectorAll('.studio-admin-card').length===24","schedule hydration");
    await evaluate("document.querySelector('nextjs-portal')?.setAttribute('hidden','')");
    await screenshot("schedule-390");
    await check("Bounded schedule list and load more",`document.body.innerText.includes('הצגת אימונים נוספים (6)')`);
    await click('button[aria-label="אימון חדש"]');
    await check("Create sheet isolates background and initially focuses close",`document.querySelector('dialog:modal') && document.activeElement.hasAttribute('data-modal-cancel') && getComputedStyle(document.documentElement).overflowY==='hidden'`);
    await evaluate("[...document.querySelectorAll('.studio-modal :is(button,input):not(:disabled)')].filter(e=>e.getClientRects().length).at(-1).focus()");await key("Tab");
    await check("Tab wraps inside sheet",`document.activeElement.hasAttribute('data-modal-cancel')`);
    await click('button[aria-label="בחירת תאריך האימון"]');
    await check("Calendar portal stays in native top layer",`!!document.querySelector('dialog:modal .studio-admin-calendar') && document.querySelector('.studio-admin-calendar').getBoundingClientRect().top>=0`);
    await screenshot("calendar-390");
    await key("Escape");
    await check("Escape closes calendar and retains form",`document.querySelectorAll('dialog:modal').length===1 && !document.querySelector('.studio-admin-calendar') && document.activeElement.getAttribute('aria-label')==='בחירת תאריך האימון'`);
    await click('button[aria-haspopup="dialog"]:not([data-state])');
    await check("Time picker appears above form",`!!document.querySelector('dialog:modal .studio-admin-time-dialog [role=dialog]')`);
    await screenshot("time-390");
    await key("Escape");
    await check("Escape closes clock without losing form and restores trigger",`!document.querySelector('.studio-admin-time-dialog') && document.querySelectorAll('dialog:modal').length===1 && document.activeElement.getAttribute('aria-label')?.includes('בחירת שעת')`);
    await input("#new-session-title","אימון בדיקה חדש");
    await click('button[aria-label="בחירת תאריך האימון"]');
    await evaluate("[...document.querySelectorAll('.studio-admin-calendar button')].find(b=>b.textContent==='17'&&!b.disabled).click()");
    await check("Date selection enables publishing",`!document.querySelector('.studio-modal-actions button').disabled`);
    await evaluate("window.__qa.fail='admin_create_session';window.__qa.delay=900");
    await click('.studio-modal-actions button');
    await key("Escape");
    await check("Busy create cannot dismiss",`document.querySelector('dialog:modal')?.getAttribute('aria-busy')==='true'`);
    await check("Create failure keeps entered values and retry visible",`document.querySelector('.studio-modal [role=alert]') && document.getElementById('new-session-title').value==='אימון בדיקה חדש' && !document.querySelector('.studio-modal-actions button').disabled`);
    await screenshot("create-error-390");
    await evaluate("window.__qa.fail=null;window.__qa.delay=250");
    await click('.studio-modal-actions button');
    await check("Create success closes and acknowledges",`!document.querySelector('dialog:modal') && document.body.innerText.includes('האימון פורסם בהצלחה')`);
    await check("Create retry preserves one request ID",`(()=>{const r=window.__qa.requests.filter(r=>r.name==='admin_create_session').slice(-2);return r.length===2&&r[0].requestId===r[1].requestId&&!!r[0].requestId})()`);
    await click('button[aria-label="אימון חדש"]');
    await check("Reopened create has clean fields",`document.getElementById('new-session-title').value===''`);
    await clickText("בחירת מתאמנות");
    await clickText("בחירת מתאמנות לאימון");
    await check("Nested selector traps focus in upper sheet",`document.querySelectorAll('dialog:modal').length===2 && document.querySelectorAll('dialog:modal')[1].contains(document.activeElement)`);
    await screenshot("selector-390");
    await key("Escape");
    await check("Nested Escape retains create and restores selection trigger",`document.querySelectorAll('dialog:modal').length===1 && document.activeElement.textContent.includes('בחירת מתאמנות לאימון')`);
    await key("Escape");
    await check("Closing form restores new-workout trigger",`!document.querySelector('dialog:modal') && document.activeElement.getAttribute('aria-label')==='אימון חדש'`);
    await clickText("ניהול נרשמות",".studio-admin");
    await check("Roster loads inside canonical sheet",`document.querySelectorAll('.studio-modal button[aria-label^="ביטול ההרשמה"]').length===3`);
    await click('.studio-modal button[aria-label^="ביטול ההרשמה"]');
    await check("Cancellation uses named app confirmation and safe focus",`document.querySelectorAll('dialog:modal').length===2 && document.querySelector('dialog[role=alertdialog]').innerText.includes('מתאמנת בדיקה') && document.activeElement.textContent.includes('להשאיר את ההרשמה')`);
    await evaluate("window.__qa.fail='admin_cancel_booking'");
    await click('dialog[role="alertdialog"] .studio-modal-actions button[data-intent="danger"]');
    await check("Cancellation error preserves confirmation",`!!document.querySelector('dialog[role=alertdialog] [role=alert]')`);
    await evaluate("window.__qa.fail=null");
    await click('dialog[role="alertdialog"] .studio-modal-actions button[data-intent="danger"]');
    await check("Cancellation succeeds and refreshes roster",`document.querySelectorAll('dialog:modal').length===1 && document.querySelectorAll('.studio-modal button[aria-label^="ביטול ההרשמה"]').length===2`);
    await check("Removed attendee trigger restores focus to roster close","document.activeElement.textContent==='סגירה'");
    await key("Escape");await delay(300);
    await click('.studio-admin button[aria-label^="מחיקת"]');
    await check("Deletion names workout and focuses safe action",`document.querySelector('dialog[role=alertdialog]').innerText.includes('אימון כוח') && document.activeElement.textContent==='להשאיר את האימון'`);
    await evaluate("window.__qa.fail='admin_delete_session'");
    await click('dialog[role="alertdialog"] button[data-intent="danger"]');
    await check("Delete failure stays open for retry",`!!document.querySelector('dialog[role=alertdialog] [role=alert]')`);
    await evaluate("window.__qa.fail=null");await click('dialog[role="alertdialog"] button[data-intent="danger"]');
    await check("Delete success closes confirmation",`!document.querySelector('dialog:modal') && document.body.innerText.includes('האימון נמחק')`);
    await check("Removed workout trigger restores focus to new-workout action","document.activeElement.getAttribute('aria-label')==='אימון חדש'");
    await click('button[aria-label="להודיע למתאמנות שהלוח עודכן"]');
    await evaluate("window.__qa.fail='notifications'");
    await click('.studio-modal-actions button:last-child');
    await check("Notification failure has visible retry feedback",`!!document.querySelector('.studio-modal [role=alert]')`);
    await evaluate("window.__qa.fail=null");await click('.studio-modal-actions button:last-child');
    await check("Notification success closes confirmation",`!document.querySelector('dialog:modal') && document.body.innerText.includes('העדכון נשלח')`);
    await view("trainees");
    await check("Trainee list bounds render count",`document.querySelectorAll('article').length===24`);
    await input('input[type="search"]',"missing");
    await check("No-results state distinguishes search",`document.body.innerText.includes('לא נמצאו מתאמנות')`);
    await click('button[aria-label="ניקוי החיפוש"]');
    await check("Clear restores all results and search focus",`document.querySelectorAll('article').length===24 && document.activeElement.type==='search'`);
    await screenshot("trainees-390");
    await clickText("עדכון יתרה","article");
    await input("#ticket-change","-99");
    await check("Ticket reduction cannot exceed balance",`document.getElementById('ticket-change').getAttribute('aria-invalid')==='true' && document.querySelector('.studio-modal-actions button').disabled`);
    await evaluate("[...document.querySelectorAll('.studio-modal button')].find(b=>b.textContent.includes('8 אימונים')).click()");
    await screenshot("ticket-390");
    await evaluate("window.__qa.fail='admin_grant_tickets';window.__qa.delay=700");
    await click('.studio-modal-actions button');await key("Escape");
    await check("Busy ticket sheet stays open",`document.querySelector('dialog:modal')?.getAttribute('aria-busy')==='true'`);
    await check("Ticket failure retains adjustment",`document.getElementById('ticket-change').value==='8' && !!document.querySelector('.studio-modal [role=alert]')`);
    await evaluate("window.__qa.fail=null;window.__qa.delay=250");await click('.studio-modal-actions button');
    await check("Ticket success closes sheet and updates balance",`!document.querySelector('dialog:modal') && document.querySelector('article').innerText.includes('16')`);
    await check("Ticket retry preserves one request ID",`(()=>{const r=window.__qa.requests.filter(r=>r.name==='admin_grant_tickets').slice(-2);return r.length===2&&r[0].requestId===r[1].requestId&&!!r[0].requestId})()`);
    await clickText("עדכון יתרה","article");
    await check("Fresh ticket opening resets adjustment",`document.getElementById('ticket-change').value===''`);
    await input('#ticket-change','2');
    await evaluate("window.__qa.lose='admin_grant_tickets'");await click('.studio-modal-actions button');
    await check("Lost committed reply leaves ticket draft available to retry",`document.getElementById('ticket-change').value==='2'&&!!document.querySelector('.studio-modal [role=alert]')&&!document.querySelector('.studio-modal-actions button').disabled`);
    await click('.studio-modal-actions button');
    await check("Lost reply retry displays persisted balance without a second addition",`!document.querySelector('dialog:modal')&&document.querySelector('article').innerText.includes('18')`);
    await check("New acknowledged action gets a new ID and its lost-reply retry keeps it",`(()=>{const r=window.__qa.requests.filter(r=>r.name==='admin_grant_tickets').slice(-3);return r.length===3&&r[0].requestId!==r[1].requestId&&r[1].requestId===r[2].requestId})()`);
    await key("Escape");await view("overview");await screenshot("overview-390");
    await check("Overview has stable populated counts",`document.querySelector('[aria-label="הפעילות בסטודיו"]').innerText.includes('32')`);
    for (const size of [{width:320,height:568},{width:390,height:400},{width:320,height:284},{width:430,height:932},{width:1280,height:800}]) {
        await call("Emulation.setDeviceMetricsOverride",{...size,deviceScaleFactor:1,mobile:size.width<640});
        await view("schedule");await click('button[aria-label="אימון חדש"]');await delay(300);
        await check(`Sheet controls fit ${size.width}x${size.height}`,`(()=>{const d=document.querySelector('dialog:modal'),f=d.querySelector('.studio-modal-actions').getBoundingClientRect(),s=d.querySelector('.studio-modal-surface').getBoundingClientRect();return s.left>=-1&&s.right<=innerWidth+1&&s.top>=-1&&f.bottom<=innerHeight+1&&f.top>=0})()`);
        await evaluate("document.querySelector('.studio-modal-content').scrollTop=10000");
        await check(`Sheet header stays clear of scrolling fields ${size.width}x${size.height}`,`(()=>{const d=document.querySelector('dialog:modal'),h=d.querySelector('.studio-modal-header').getBoundingClientRect(),c=d.querySelector('.studio-modal-content').getBoundingClientRect();return h.bottom<=c.top+1})()`);
        await evaluate("document.querySelector('.studio-modal-content').scrollTop=0");
        await screenshot(`create-${size.width}x${size.height}`);
        await key("Escape");
        await waitFor("!document.querySelector('dialog:modal')","resized sheet dismissed");
        await check(`No horizontal overflow ${size.width}x${size.height}`,"document.documentElement.scrollWidth<=innerWidth");
    }
    await evaluate("window.__qa.fail='profiles'");
    await view("trainees");
    await check("Trainee read failure remains an error rather than empty or zero","!!document.querySelector('.studio-admin [role=alert]') && !document.querySelector('article')");
    await evaluate("window.__qa.fail=null");
    await clickText("ניסיון נוסף",".studio-admin");
    await check("Trainee read retry restores records","document.querySelectorAll('article').length===24");
    await evaluate("window.__qa.empty=true");await view("schedule");
    await check("Schedule empty state remains actionable","document.body.innerText.includes('אין אימונים קרובים כרגע') && !document.querySelector('.studio-admin [role=alert]')");
    await evaluate("window.__qa.empty=false;window.__qa.fail='gym_sessions_with_counts'");await view("trainees");await view("schedule");
    await check("Schedule read failure remains distinct from empty","!!document.querySelector('.studio-admin [role=alert]') && !document.body.innerText.includes('אין אימונים קרובים כרגע')");
    await evaluate("window.__qa.fail=null");await clickText("ניסיון נוסף",".studio-admin");
    await check("Schedule read retry restores records","document.querySelectorAll('.studio-admin-card').length===24");
    await call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
    await click('button[aria-label="אימון חדש"]');await delay(100);
    console.log("Reduced motion state",await evaluate("JSON.stringify({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,transform:getComputedStyle(document.querySelector('.studio-modal-surface')).transform,transition:getComputedStyle(document.querySelector('.studio-admin button')).transitionDuration})"));
    await check("Reduced motion removes sheet transform and transition",`getComputedStyle(document.querySelector('.studio-modal-surface')).transform==='none' && getComputedStyle(document.querySelector('.studio-admin button')).transitionDuration.split(',').every(value=>parseFloat(value)<=0.001)`);
    await key("Escape");
    await writeFile(join(output,"results.json"),JSON.stringify({checks,passed:checks.length},null,2));
    console.log(`Admin browser checks passed: ${checks.length}`);
} catch(error) {
    console.error(error);
    if (evaluateBrowser) { try { console.error(await evaluateBrowser("JSON.stringify({url:location.href,body:document.body.innerText.slice(0,1700),focus:document.activeElement?.outerHTML.slice(0,350)})")); await saveShot("failure"); } catch {} }
    if(ws?.readyState===WebSocket.OPEN) {
        // The normal test runner already records screenshot states; preserve diagnostics.
        console.error("Browser run failed; inspect scratch/admin-polish-qa.");
    }
    process.exitCode=1;
} finally {
    if(ws?.readyState===WebSocket.OPEN)ws.close();
    chrome?.kill();
    if(created){await unlink(fixtureFile);await rmdir(fixtureDir);}
}

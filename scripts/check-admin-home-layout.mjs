// Local, synthetic browser checks. All Supabase/API requests are intercepted;
// no profiles, bookings, credits, or notifications are changed in production.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile, unlink, rmdir, mkdtemp } from "node:fs/promises";
import { resolve, join } from "node:path";

const baseUrl = process.argv[2] || "http://127.0.0.1:3110";
assert(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname));
const output = resolve("scratch/admin-home-scroll-qa");
const fixtureDir = resolve("src/app/admin-home-scroll-check");
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
    Object.assign(qaClient, {rest: Object.assign((qaClient as unknown as {rest: object}).rest, {fetch: (...args: Parameters<typeof fetch>) => window.fetch(...args)})});
    qaClient.auth.getSession = async () => ({data:{session:{user:{id:"qa-admin"}}},error:null} as Awaited<ReturnType<typeof qaClient.auth.getSession>>);
}
export default function Preview() {
    const [view,setView] = useState("overview");
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
            const data=window.__qa.empty?[]:name==="admin_list_trainees"?profiles.map(p=>({...p,tickets:balances.get(p.id)})):name==="profiles"?profiles:name==="user_tickets"?profiles.flatMap(p=>Array.from({length:balances.get(p.id)},(_,i)=>({id:p.id+"-ticket-"+i,user_id:p.id}))):name==="gym_sessions_with_counts"?(window.__qa.homeSessions ? Array.from({length:24},(_,i)=>({...sessions[i],start_time:new Date(Date.now()+i*60000).toISOString(),end_time:new Date(Date.now()+(i+60)*60000).toISOString()})) : sessions):name==="bookings"?bookings:name==="get_available_tickets"?8:{success:true,user_ids:[]};
            if(!fail && name==="admin_cancel_booking"){const body=JSON.parse(init.body||"{}");bookings=bookings.filter(b=>b.id!==body.p_booking_id);}
            if(!fail && name==="admin_delete_session"){const body=JSON.parse(init.body||"{}");sessions=sessions.filter(s=>s.id!==body.p_session_id);}
            return new Response(JSON.stringify(fail?{message:"Synthetic failure",code:"QA500"}:data),{status:fail?500:200,headers:{"Content-Type":"application/json","Content-Range":"0-31/32"}});
        }
        if(url.hostname!==location.hostname) return new Response(JSON.stringify({}),{status:200,headers:{"Content-Type":"application/json"}});
        return original(input,init);
    };
})();`;

let chrome, ws, created = false, evaluateBrowser, saveShot;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
    await mkdir(output,{recursive:true});
    await mkdir(fixtureDir);
    created = true;
    await writeFile(fixtureFile,fixture,"utf8");
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
        const response = await fetch(baseUrl + "/admin-home-scroll-check");
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
    const key=async(key,modifiers=0)=>{const windowsVirtualKeyCode={Tab:9,Escape:27,Enter:13}[key];for(const type of ["keyDown","keyUp"])await call("Input.dispatchKeyEvent",{type,key,code:key,modifiers,windowsVirtualKeyCode});};
    await call("Page.enable");await call("Page.addScriptToEvaluateOnNewDocument",{source:mock});
    await call("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await call("Page.navigate",{url:baseUrl+"/admin-home-scroll-check"});

    await waitFor("!!document.querySelector('.studio-admin-home section')", "home loaded");
    for (const active of [false, true]) {
      await evaluate('window.__qa.homeSessions='+active);
      await evaluate('document.getElementById("qa-schedule").click()');
      await delay(400);
      await evaluate('document.getElementById("qa-overview").click()');
      await waitFor(active ? "!!document.querySelector('.studio-admin-home-timeline')" : "document.querySelector('.studio-admin-home section') && !document.querySelector('.studio-admin-home-timeline')", 'home state');
      for (const size of [{width:390,height:844},{width:375,height:667},{width:360,height:740},{width:320,height:568},{width:1280,height:800}]) {
        await call('Emulation.setDeviceMetricsOverride',{...size,deviceScaleFactor:1,mobile:true});
        await delay(400);
        const geometry=await evaluate("(()=>{const h=document.querySelector('.studio-admin-home'),n=document.querySelector('.studio-admin-nav');return {documentHeight:document.documentElement.scrollHeight,viewport:innerHeight,pageHeight:h.clientHeight,pageScrollHeight:h.scrollHeight,width:document.documentElement.scrollWidth,viewportWidth:innerWidth,sections:[...h.children].filter(e=>e.tagName==='SECTION').map(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})),navTop:n.getBoundingClientRect().top}})()");
        assert(geometry.documentHeight<=geometry.viewport+1, 'Document must not scroll');
        assert(geometry.width<=geometry.viewportWidth, 'No horizontal overflow');
        if(size.height>=667) assert(geometry.pageScrollHeight<=geometry.pageHeight+1, 'Standard home must fit without scrolling');
        console.log('PASS: '+(active?'active':'empty')+' home '+size.width+'x'+size.height);
        await screenshot('home-'+(active?'active':'empty')+'-'+size.width+'x'+size.height);
      }
    }
    await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await evaluate("document.querySelector('.studio-admin-home-sessions').scrollTop=10000");
    assert(await evaluate("document.querySelector('.studio-admin-home-sessions').scrollTop>0 && scrollY===0"), 'Long timeline must scroll independently');
    await evaluate("document.querySelector('.studio-admin-home-actions button').click()");
    await waitFor("!!document.querySelector('dialog:modal')", 'quick action opens');
    await key('Escape');
    await waitFor("!document.querySelector('dialog:modal')", 'quick action closes');
    await evaluate('window.__qa.homeSessions=false;document.getElementById("qa-schedule").click()');
    await waitFor("document.querySelectorAll('.studio-admin-card').length===24", 'sibling list');
    assert(await evaluate('document.documentElement.scrollHeight>innerHeight'), 'Schedule retains document scrolling');
    console.log('Admin home layout checks passed');
} catch(error) {
    console.error(error);
    if (evaluateBrowser) { try { console.error(await evaluateBrowser("JSON.stringify({url:location.href,qa:window.__qa,body:document.body.innerText.slice(0,1700),focus:document.activeElement?.outerHTML.slice(0,350)})")); await saveShot("failure"); } catch {} }
    if(ws?.readyState===WebSocket.OPEN) {
        // The normal test runner already records screenshot states; preserve diagnostics.
        console.error("Browser run failed; inspect scratch/admin-home-scroll-qa.");
    }
    process.exitCode=1;
} finally {
    if(ws?.readyState===WebSocket.OPEN)ws.close();
    chrome?.kill();
    chrome?.unref();
    chrome?.stdout?.destroy();
    chrome?.stderr?.destroy();
    if(created){await unlink(fixtureFile);await rmdir(fixtureDir);}
}

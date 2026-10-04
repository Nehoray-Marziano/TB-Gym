// Actual onboarding component with deterministic failed writes; no live data or emails.
import { mkdir, writeFile, unlink, rmdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openBrowser } from './lib/browser-check.mjs';
const base=process.argv[2]||'http://127.0.0.1:3111';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local fixture only');
const fixture=resolve('src/app/onboarding-correctness-check'), out=resolve('scratch/onboarding-correctness');
let browser,created=false;const checks=[];
const record=(name,passed,evidence)=>{checks.push({name,passed,evidence});console.log(`${passed?'PASS':'FAIL'} ${name}`);};
try{
  await mkdir(fixture);created=true;
  await writeFile(`${fixture}/page.tsx`, `"use client";
import { useState, useEffect } from 'react';
import Page from '@/app/onboarding/page';
import { getSupabaseClient } from '@/lib/supabaseClient';
export default function Fixture(){const [ready,setReady]=useState(false);useEffect(()=>{
 const w=window as any;w.__qa={fail:'health_declarations',calls:[],delay:200};
 const client=getSupabaseClient() as any;
 client.auth.getUser=async()=>({data:{user:{id:'00000000-0000-0000-0000-000000000001'}},error:null});
 client.from=(table:string)=>{const save=async(payload:any)=>{w.__qa.calls.push({table,payload});await new Promise(r=>setTimeout(r,w.__qa.delay));return{data:null,error:w.__qa.fail===table?{message:'Synthetic database rejection'}:null};};return{update:(p:any)=>({eq:()=>save(p)}),upsert:(p:any)=>save(p)};};
 setReady(true);
 },[]);return ready?<Page/>:null;}`);
  let ready=false;for(let i=0;i<30;i++){const r=await fetch(`${base}/onboarding-correctness-check`);if(r.ok){ready=true;break;}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Fixture unavailable');
  browser=await openBrowser(out);
  await browser.call('Network.setBlockedURLs',{urls:['*supabase.co*','*onesignal.com*']});
  await browser.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await browser.call('Page.navigate',{url:`${base}/onboarding-correctness-check`});
  await browser.wait("!!document.querySelector('#onboarding-name')",'onboarding hydrated');
  const fill=async()=>{
    await browser.input('#onboarding-name','Synthetic Test Member');await browser.textClick('המשך');
    await browser.wait("!!document.querySelector('#onboarding-age')",'age step');await browser.input('#onboarding-age','25');await browser.textClick('המשך');
    await browser.wait("!!document.querySelector('#onboarding-phone')",'phone step');await browser.input('#onboarding-phone','0500000000');await browser.textClick('המשך');
    await browser.wait("!!document.querySelector('button[aria-pressed]')",'declaration step');await browser.textClick('אין משהו מיוחד שצריך לדעת');
  };
  await fill();await browser.textClick('סיום');
  await browser.delay(800);
  const state=await browser.evaluate("({alert:document.querySelector('[role=alert]')?.textContent,hasFinish:[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='סיום'),calls:window.__qa.calls})");
  record('Failed declaration save retains form and exposes retry error',!!state.alert&&state.hasFinish,state);
  record('Onboarding is not marked complete when declaration fails',!state.calls.some(c=>c.table==='profiles'&&c.payload.onboarding_completed),state.calls);
  await browser.shot('failed-save');
  if(!state.alert||!state.hasFinish)throw Error('Failure recovery regression reproduced');
  const contrast=await browser.evaluate(`(()=>{const e=document.querySelector('[role=alert]'),s=getComputedStyle(e);const luminance=c=>c.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);const a=luminance(s.color),b=luminance(s.backgroundColor);return{ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),foreground:s.color,background:s.backgroundColor}})()`);
  record('Retry error has readable text contrast',contrast.ratio>=4.5,contrast);
  await browser.evaluate("window.__qa.fail='profiles';window.__qa.calls=[]");await browser.textClick('סיום');await browser.delay(800);
  record('Failed profile save also preserves form for retry',await browser.evaluate("!!document.querySelector('[role=alert]')&&!!document.querySelector('#onboarding-title')"));
  await browser.evaluate("window.__qa.fail=null;window.__qa.calls=[];window.__qa.delay=700");
  await browser.evaluate("(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='סיום');b.click();b.click();b.click();})()");
  await browser.delay(1700);
  const calls=await browser.evaluate('window.__qa.calls');
  record('Repeated submit dispatches one declaration and one profile write',calls.filter(c=>c.table==='profiles').length===1&&calls.filter(c=>c.table==='health_declarations').length===1,calls);
  record('Completion flag is saved after declaration',calls[0]?.table==='health_declarations'&&calls[1]?.payload.onboarding_completed===true);
  await browser.shot('successful-save');
  record('No unhandled browser errors',browser.errors.length===0,browser.errors);
}catch(e){record('Browser campaign completed',false,e.message);}
finally{
  if(browser)await browser.close();
  if(created){await unlink(`${fixture}/page.tsx`);await rmdir(fixture);}
  await mkdir(out,{recursive:true});await writeFile(`${out}/report.json`,JSON.stringify(checks,null,2));
  if(checks.some(c=>!c.passed))process.exitCode=1;
}

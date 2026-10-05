// Deployed UI, real disposable Auth/DB records, and deterministic rejected writes.
// The email-send request alone is intercepted: generated OTPs are never delivered.
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './lib/browser-check.mjs';
config({path:'.env.local',quiet:true});config({path:'.env.stress.local',override:true,quiet:true});
if(process.env.ALLOW_LIVE_CORRECTNESS!=='1')throw Error('Explicit disposable live testing authorization required');
const base='https://tb-gym.vercel.app',url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const service=createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const runId=`final-ui-${Date.now()}-${randomUUID().slice(0,8)}`,dir=`scratch/final-stress/${runId}`;
const checks=[],ids=[],writes=[],verificationTypes=[];let browser,fail='health_declarations',sendIntercepts=0;
await mkdir(dir,{recursive:true});
const expect=(name,passed,evidence)=>{checks.push({name,passed:!!passed,...(evidence===undefined?{}:{evidence})});console.log(`${passed?'PASS':'FAIL'} ${name}`);};
const data=(r,label)=>{if(r.error)throw Error(`${label}: ${r.error.message}`);return r.data;};
const profile=async()=>data(await service.from('profiles').select('full_name,age,phone,onboarding_completed').eq('id',ids[0]).single(),'read own fixture profile');
const health=async()=>data(await service.from('health_declarations').select('id,is_healthy,medical_conditions').eq('id',ids[0]),'read own fixture declaration');
async function persist(){await writeFile(`${dir}/report.json`,JSON.stringify({runId,checks,userIds:ids,writes,verificationTypes,sendIntercepts},null,2));}
async function login(email,token,wrongFirst=false){
  await browser.call('Page.navigate',{url:base+'/'});
  await browser.wait("!!document.querySelector('.studio-welcome-email-button')",'deployed welcome hydrated',60000);
  await browser.wait("document.readyState==='complete'",'deployed scripts loaded',60000);
  await browser.delay(500);
  await browser.click('.studio-welcome-email-button');
  await browser.wait("!!document.querySelector('#login-email')",'email form');
  await browser.wait("document.querySelector('[role=dialog]').getBoundingClientRect().bottom<=innerHeight+1",'login sheet animation settled');
  await browser.input('#login-email',email);
  await browser.wait("!document.querySelector('[role=dialog] button[type=submit]').disabled",'email submit enabled');
  await browser.click('[role=dialog] button[type=submit]');
  await browser.wait("!!document.querySelector('#login-code')",'code form');
  if(wrongFirst){
    await browser.input('#login-code',token[0]==='9'?'0'+token.slice(1):'9'+token.slice(1));
    await browser.wait("!document.querySelector('[role=dialog] button[type=submit]').disabled",'wrong-code submit enabled');
    await browser.click('[role=dialog] button[type=submit]');
    await browser.wait("!!document.querySelector('[role=dialog] [role=alert]')",'invalid-code error');
    expect('Deployed UI rejects wrong signup code and permits retry',await browser.evaluate("!!document.querySelector('#login-code')&&!document.querySelector('[role=dialog] button[type=submit]').disabled"));
  }
  await browser.input('#login-code',token);
  await browser.wait("!document.querySelector('[role=dialog] button[type=submit]').disabled",'valid-code submit enabled');
  await browser.click('[role=dialog] button[type=submit]');
}
try{
  const version=await fetch(base+'/api/app-version',{cache:'no-store'}).then(r=>r.json());
  expect('Production serves the approved application commit',version.version===process.env.EXPECTED_APP_VERSION,{version:version.version});
  if(version.version!==process.env.EXPECTED_APP_VERSION)throw Error('Wait for the approved deployment before testing');
  const email=`${runId}@example.invalid`,password=randomBytes(24).toString('base64url');
  const signup=data(await service.auth.admin.generateLink({type:'signup',email,password,options:{data:{stress_run:runId,full_name:'Disposable deployed UI'}}}),'generate undelivered signup');
  ids.push(signup.user.id);await persist();
  browser=await openBrowser(dir);
  await browser.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await browser.call('Network.setBlockedURLs',{urls:['*onesignal.com*']});
  browser.on('Fetch.requestPaused',async({requestId,request})=>{
    const target=new URL(request.url),method=request.method;
    const fulfill=async(status,body)=>browser.call('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:[{name:'content-type',value:'application/json'},{name:'access-control-allow-origin',value:base},{name:'access-control-allow-credentials',value:'true'}],body:Buffer.from(JSON.stringify(body)).toString('base64')});
    if(target.origin===new URL(url).origin&&target.pathname==='/auth/v1/otp'&&method==='POST'){
      sendIntercepts++;await fulfill(200,{});return;
    }
    if(target.origin===new URL(url).origin&&target.pathname==='/auth/v1/verify'&&method==='POST')verificationTypes.push(JSON.parse(request.postData||'{}').type);
    const table=target.pathname.split('/').at(-1);
    if(target.origin===new URL(url).origin&&['health_declarations','profiles'].includes(table)&&['POST','PATCH'].includes(method)){
      writes.push({table,rejected:fail===table});
      if(fail===table){await fulfill(403,{code:'42501',message:'Disposable UI fault injection: rejected save',details:null,hint:null});return;}
      if(!fail)await browser.delay(300);
    }
    await browser.call('Fetch.continueRequest',{requestId});
  });
  await browser.call('Fetch.enable',{patterns:[{urlPattern:url+'/*',requestStage:'Request'}]});
  await login(email,signup.properties.email_otp,true);
  await browser.wait("location.pathname==='/onboarding'&&!!document.querySelector('#onboarding-name')",'new user enters onboarding',60000);
  expect('Deployed signup code authenticates and opens onboarding',true);
  expect('Deployed verification requests use email OTP',verificationTypes.length===2&&verificationTypes.every(t=>t==='email'),verificationTypes);
  const name=`[${runId}] Test Member`;
  await browser.input('#onboarding-name',name);await browser.textClick('המשך');
  await browser.wait("!!document.querySelector('#onboarding-age')",'age');await browser.input('#onboarding-age','25');await browser.textClick('המשך');
  await browser.wait("!!document.querySelector('#onboarding-phone')",'phone');await browser.input('#onboarding-phone','0500000000');await browser.textClick('המשך');
  await browser.wait("!!document.querySelector('button[aria-pressed]')",'health');await browser.textClick('אין משהו מיוחד שצריך לדעת');await browser.textClick('סיום');
  await browser.wait("!!document.querySelector('[role=alert]')",'declaration rejection recovery');
  expect('Rejected declaration keeps deployed form and selected answer',await browser.evaluate("location.pathname==='/onboarding'&&!!document.querySelector('button[aria-pressed=true]')"));
  expect('Rejected declaration never marks profile complete',!(await profile()).onboarding_completed&&(await health()).length===0&&!writes.some(w=>w.table==='profiles'));
  await browser.shot('declaration-save-rejected');
  fail='profiles';await browser.textClick('סיום');
  await browser.wait("!!document.querySelector('[role=alert]')",'profile rejection recovery');
  const savedHealth=await health();
  expect('Rejected profile retains declaration but leaves onboarding incomplete',savedHealth.length===1&&savedHealth[0].is_healthy===true&&!(await profile()).onboarding_completed);
  expect('Rejected profile keeps deployed retry form',await browser.evaluate("location.pathname==='/onboarding'&&!!document.querySelector('button[aria-pressed=true]')"));
  await browser.shot('profile-save-rejected');
  fail=null;writes.length=0;
  await browser.evaluate("(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='סיום');b.click();b.click();b.click();})()");
  await browser.wait("location.pathname==='/dashboard'",'successful deployed retry reaches dashboard',60000);
  const finalProfile=await profile(),finalHealth=await health();
  expect('Successful retry persists all entered details and declaration',finalProfile.onboarding_completed&&finalProfile.full_name===name&&finalProfile.age===25&&finalProfile.phone==='0500000000'&&finalHealth.length===1&&finalHealth[0].is_healthy===true);
  expect('Repeated deployed submit performs exactly one ordered pair of writes',writes.length===2&&writes[0].table==='health_declarations'&&writes[1].table==='profiles',writes);
  await browser.shot('onboarding-retry-complete');
  const fresh=data(await service.auth.admin.generateLink({type:'magiclink',email}),'generate undelivered returning code');
  await browser.call('Network.clearBrowserCookies');await browser.call('Storage.clearDataForOrigin',{origin:base,storageTypes:'local_storage,session_storage'});
  await login(email,fresh.properties.email_otp);
  await browser.wait("location.pathname==='/dashboard'",'returning login reaches dashboard',60000);
  expect('Deployed returning-user code also authenticates',verificationTypes.length===3&&verificationTypes.at(-1)==='email');
  expect('No actual email-send request was made',sendIntercepts===2);
  expect('No unhandled browser exceptions',browser.errors.length===0,browser.errors.map(e=>({event:e.event,text:e.text,message:e.message})));
  await browser.shot('returning-login-complete');
}catch(e){expect('Deployed flow campaign completed',false,e.message);if(browser){console.log(JSON.stringify(await browser.evaluate("({path:location.pathname,ready:document.readyState,buttons:[...document.querySelectorAll('button')].map(b=>({text:b.textContent.trim(),disabled:b.disabled})),alerts:[...document.querySelectorAll('[role=alert]')].map(e=>e.textContent)})")));}}
finally{
  if(browser)await browser.close();
  for(const id of ids){
    data(await service.from('health_declarations').delete().eq('id',id),'cleanup fixture declaration');
    const removed=await service.auth.admin.deleteUser(id);expect('Disposable deployed-flow identity removed',!removed.error,removed.error?.message);
    const residue=await service.auth.admin.getUserById(id);expect('Auth fixture independently absent',residue.error?.status===404||residue.error?.code==='user_not_found');
    for(const table of ['profiles','health_declarations'])expect(`Zero deployed-flow fixture ${table}`,data(await service.from(table).select('id').eq('id',id),'verify fixture residue').length===0);
  }
  await persist();console.log(JSON.stringify({runId,dir,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length}));
  if(checks.some(c=>!c.passed))process.exitCode=1;
}

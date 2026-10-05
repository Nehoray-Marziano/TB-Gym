// Actual deployed admin UI and real disposable DB writes. Drop one reply AFTER
// the mutation commits, then retry. All list reads display only our fixtures;
// all notification delivery is intercepted. Never send emails or real payments.
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {config} from 'dotenv';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './lib/browser-check.mjs';
config({path:'.env.local',quiet:true});config({path:'.env.stress.local',override:true,quiet:true});
if(process.env.ALLOW_LIVE_CORRECTNESS!=='1')throw Error('Explicit disposable live testing authorization required');
const base='https://tb-gym.vercel.app',url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,opts={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,process.env.SUPABASE_SECRET_KEY,opts),runId=`deep-admin-ui-${Date.now()}-${randomUUID().slice(0,8)}`,dir=`scratch/deep-concurrency/${runId}`;
const users=[],checks=[],requests=[],sessionIds=[];let manager,member,browser,lose='admin_grant_tickets_once',notifications=0;
await mkdir(dir,{recursive:true});
const data=(r,label)=>{if(r.error)throw Error(`${label}: ${r.error.message}`);return r.data;};
const good=r=>!r.error&&r.data?.success===true;
const expect=(name,passed,evidence)=>{checks.push({name,passed:!!passed,evidence});console.log(`${passed?'PASS':'FAIL'} ${name}`);};
async function persist(){await writeFile(`${dir}/report.json`,JSON.stringify({runId,userIds:users.map(u=>u.id),sessionIds,checks,requests,notifications},null,2));}
const balance=async()=>{const r=await service.from('user_tickets').select('id',{count:'exact',head:true}).eq('user_id',member.id).is('used_at',null).gt('expires_at',new Date().toISOString());data(r,'own persisted balance');return r.count;};
const classes=async()=>data(await service.from('gym_sessions').select('*').like('title',`[${runId}]%`),'own classes');
try {
 const version=await fetch(base+'/api/app-version',{cache:'no-store'}).then(r=>r.json());
 expect('Production serves the intended hardening commit',version.version===process.env.EXPECTED_APP_VERSION,{version:version.version});
 if(version.version!==process.env.EXPECTED_APP_VERSION)throw Error('Approved deployment is not live yet');
 for(let i=0;i<2;i++) {
  const email=`${runId}-${i}@example.invalid`,made=data(await service.auth.admin.createUser({email,password:randomBytes(24).toString('base64url'),email_confirm:true,user_metadata:{stress_run:runId,full_name:`[${runId}] ${i}`}}),'fixture account').user,cookies=new Map();
  const client=createServerClient(url,key,{auth:{autoRefreshToken:false},cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:items=>items.forEach(c=>cookies.set(c.name,c.value))}});
  const user={id:made.id,client,cookies};users.push(user);await persist();
  const link=data(await service.auth.admin.generateLink({type:'magiclink',email}),'undelivered code');data(await client.auth.verifyOtp({email,token:link.properties.email_otp,type:'email'}),'fixture login');
  data(await service.from('profiles').update({role:i===0?'administrator':'trainee',onboarding_completed:true,full_name:`[${runId}] ${i===0?'Admin':'Member'}`}).eq('id',made.id),'fixture readiness');
 }
 [manager,member]=users;
 if(!good(await manager.client.rpc('admin_grant_tickets',{p_user_id:member.id,p_quantity:5,p_expires_at:new Date(Date.now()+365*86400000).toISOString()})))throw Error('Fixture grant failed');
 browser=await openBrowser(dir);await browser.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await browser.call('Network.setBlockedURLs',{urls:['*onesignal.com*']});
 await browser.call('Network.setCookies',{cookies:[...manager.cookies].map(([name,value])=>({name,value:encodeURIComponent(value),url:base,path:'/',secure:true,sameSite:'Lax'}))});
 browser.on('Fetch.requestPaused',async({requestId,request})=>{
  const target=new URL(request.url),name=target.pathname.split('/').at(-1);
  const fulfill=(status,body)=>browser.call('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:[{name:'content-type',value:'application/json'},{name:'access-control-allow-origin',value:base},{name:'access-control-allow-credentials',value:'true'}],body:Buffer.from(JSON.stringify(body)).toString('base64')});
  if(target.origin===base&&target.pathname.startsWith('/api/notifications')){notifications++;await fulfill(200,{});return;}
  if(target.origin===new URL(url).origin&&target.pathname.startsWith('/rest/v1/')) {
   if(request.method==='OPTIONS'){await browser.call('Fetch.continueRequest',{requestId});return;}
   if(['admin_grant_tickets_once','admin_create_session_once'].includes(name)) {
    const args=JSON.parse(request.postData||'{}');
    if(name==='admin_grant_tickets_once'&&args.p_user_id!==member.id||name==='admin_create_session_once'&&(!args.p_title?.startsWith(`[${runId}]`)||args.p_user_ids?.length))throw Error('Refusing a mutation outside disposable fixtures');
    requests.push({name,requestId:args.p_request_id,lostReply:lose===name});
    if(lose===name) {
     lose=null;const result=await manager.client.rpc(name,args);
     expect(`${name}: deliberately lost reply had already committed`,good(result),{replayed:result.data?.replayed});
     if(name==='admin_create_session_once'&&good(result))sessionIds.push(result.data.session_id);
     await browser.call('Fetch.failRequest',{requestId,errorReason:'Failed'});return;
    }
    await browser.call('Fetch.continueRequest',{requestId});return;
   }
   if(name==='admin_list_trainees') {
    const own=data(await service.from('profiles').select('id,full_name,email,phone,role').eq('id',member.id).single(),'own display profile');await fulfill(200,[{...own,tickets:await balance()}]);return;
   }
   if(name==='gym_sessions_with_counts') {await fulfill(200,(await classes()).map(s=>({...s,current_bookings:0,bookings:[{count:0}]})));return;}
   if(name==='profiles'){await fulfill(200,data(await service.from('profiles').select('id,full_name,email,phone,role').eq('id',member.id),'own selector profile'));return;}
   if(name==='user_tickets'){await fulfill(200,data(await service.from('user_tickets').select('id,user_id').eq('user_id',member.id).is('used_at',null),'own display tickets'));return;}
   if(name==='bookings'){await fulfill(200,[]);return;}
   if(name==='get_available_tickets'){await fulfill(200,await balance());return;}
   await fulfill(403,{message:'Unexpected fixture request blocked'});return;
  }
  await browser.call('Fetch.continueRequest',{requestId});
 });
 await browser.call('Fetch.enable',{patterns:[{urlPattern:url+'/rest/v1/*',requestStage:'Request'},{urlPattern:base+'/api/notifications*',requestStage:'Request'}]});
 await browser.call('Page.navigate',{url:base+'/admin/trainees'});await browser.wait("document.querySelectorAll('article').length===1",'deployed fixture trainee',60000);
 await browser.textClick('עדכון יתרה','article');await browser.input('#ticket-change','2');await browser.click('.studio-modal-actions button');
 await browser.wait("!!document.querySelector('.studio-modal [role=alert]')&&!document.querySelector('.studio-modal-actions button').disabled",'lost grant reply recovery');
 expect('Lost grant reply keeps its entered adjustment',await browser.evaluate("document.querySelector('#ticket-change').value==='2'"));
 expect('First grant really committed exactly two tickets',await balance()===7);await browser.shot('grant-reply-lost');
 // Reload discards component memory but retains the unresolved tab intent.
 await browser.call('Page.reload');await browser.wait("document.querySelectorAll('article').length===1&&!document.querySelector('dialog:modal')",'reload restores fixture list',60000);
 await browser.textClick('עדכון יתרה','article');await browser.input('#ticket-change','2');
 await browser.evaluate("(()=>{const b=document.querySelector('.studio-modal-actions button');b.click();b.click();b.click();})()");
 await browser.wait("!document.querySelector('dialog:modal')",'reloaded grant retry acknowledged');
 const grants=requests.filter(r=>r.name==='admin_grant_tickets_once');
 expect('Reload and triple-submit retain one grant ID and send one retry',grants.length===2&&grants[0].requestId===grants[1].requestId,grants);
 expect('Reloaded retry leaves persisted and displayed balance at seven',await balance()===7&&await browser.evaluate("document.querySelector('article').innerText.includes('7')"));await browser.shot('grant-retry-once');
 await browser.call('Page.navigate',{url:base+'/admin/schedule'});await browser.wait("!!document.querySelector('button[aria-label=\"אימון חדש\"]')",'deployed schedule',60000);
 await browser.click('button[aria-label="אימון חדש"]');await browser.wait("!!document.querySelector('#new-session-title')",'class form');
 const title=`[${runId}] Lost class reply`;await browser.input('#new-session-title',title);await browser.click('button[aria-label="בחירת תאריך האימון"]');
 await browser.wait("!!document.querySelector('.studio-admin-calendar')",'calendar');await browser.evaluate("[...document.querySelectorAll('.studio-admin-calendar button')].find(b=>b.textContent==='17'&&!b.disabled).click()");
 lose='admin_create_session_once';await browser.click('.studio-modal-actions button');await browser.wait("!!document.querySelector('.studio-modal [role=alert]')&&!document.querySelector('.studio-modal-actions button').disabled",'lost class reply recovery');
 expect('Lost class reply keeps the title and creates exactly one real class',await browser.evaluate(`document.querySelector('#new-session-title').value===${JSON.stringify(title)}`)&&(await classes()).length===1);await browser.shot('class-reply-lost');
 await browser.evaluate("(()=>{const b=document.querySelector('.studio-modal-actions button');b.click();b.click();b.click();})()");await browser.wait("!document.querySelector('dialog:modal')",'class retry acknowledged');
 const creates=requests.filter(r=>r.name==='admin_create_session_once');
 expect('Repeated class submit sends one retry with the same ID',creates.length===2&&creates[0].requestId===creates[1].requestId,creates);
 expect('Class retry persists exactly one class and one displayed card',(await classes()).length===1&&await browser.evaluate("document.querySelectorAll('.studio-admin-card').length===1"));await browser.shot('class-retry-once');
 expect('Only the successful grant acknowledgment requested a notification',notifications===1,{intercepted:notifications});
}catch(e){expect('Deployed retry campaign completed',false,e.message);if(browser)try{await browser.shot('failure');}catch{}}
finally {
 if(browser)await browser.close();
 const errors=[],attempt=async fn=>{try{data(await fn(),'cleanup');}catch(e){errors.push(e.message);}},ids=users.map(u=>u.id);
 const own=await classes();sessionIds.push(...own.map(s=>s.id));const sids=[...new Set(sessionIds)];
 if(sids.length){await attempt(()=>service.from('bookings').delete().in('session_id',sids));await attempt(()=>service.from('user_tickets').update({used_at:null,used_for_session:null}).in('used_for_session',sids));await attempt(()=>service.from('gym_sessions').delete().in('id',sids));}
 if(ids.length){await attempt(()=>service.from('user_tickets').delete().in('user_id',ids));for(const u of users)await attempt(()=>service.auth.admin.deleteUser(u.id));
  for(const [table,col]of[['profiles','id'],['user_tickets','user_id'],['bookings','user_id'],['admin_mutation_receipts','actor_id']])expect(`Zero own ${table}`,data(await service.from(table).select(col).in(col,ids),'cleanup verification').length===0);
  expect('All deployed fixture Auth identities independently absent',(await Promise.all(users.map(u=>service.auth.admin.getUserById(u.id)))).every(r=>r.error?.status===404||r.error?.code==='user_not_found'));
 }
 expect('Zero own deployed fixture classes',(await classes()).length===0);expect('All cleanup operations succeeded',errors.length===0,errors);await persist();console.log(JSON.stringify({runId,dir,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length}));if(checks.some(c=>!c.passed))process.exitCode=1;
}

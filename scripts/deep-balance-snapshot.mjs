import {createClient} from '@supabase/supabase-js';
import {config} from 'dotenv';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
config({path:'.env.local',quiet:true});config({path:'.env.stress.local',override:true,quiet:true});
if(process.env.ALLOW_LIVE_CORRECTNESS!=='1')throw Error('Explicit disposable live testing authorization required');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,opts={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,process.env.SUPABASE_SECRET_KEY,opts),anon=createClient(url,key,opts),runId=`deep-balance-${Date.now()}-${randomUUID().slice(0,8)}`,dir=`scratch/deep-concurrency/${runId}`;
const users=[],checks=[];let manager;await mkdir(dir,{recursive:true});
const data=(r,label)=>{if(r.error)throw Error(`${label}: ${r.error.message}`);return r.data;};
const expect=(name,passed,evidence)=>{checks.push({name,passed:!!passed,evidence});console.log(`${passed?'PASS':'FAIL'} ${name}`);};
const good=r=>!r.error&&r.data?.success===true;
async function persist(){await writeFile(`${dir}/report.json`,JSON.stringify({runId,userIds:users.map(u=>u.id),checks},null,2));}
const expiry=new Date(Date.now()+365*86400000).toISOString();
try {
 for(let i=0;i<5;i++) {
  const email=`${runId}-${i}@example.invalid`;
  const user=data(await service.auth.admin.createUser({email,password:randomBytes(24).toString('base64url'),email_confirm:true,user_metadata:{full_name:`[${runId}] ${i}`,stress_run:runId}}),'make fixture').user;
  const client=createClient(url,key,opts);users.push({id:user.id,client});await persist();
  const link=data(await service.auth.admin.generateLink({type:'magiclink',email}),'undelivered code');data(await client.auth.verifyOtp({email,token:link.properties.email_otp,type:'email'}),'fixture login');
 }
 manager=users[4];data(await service.from('profiles').update({role:'administrator',onboarding_completed:true}).eq('id',manager.id),'fixture admin');
 const group=users.slice(0,4),ids=group.map(u=>u.id);
 data(await service.from('user_tickets').insert(group.flatMap(u=>Array.from({length:300},()=>({user_id:u.id,source:'admin',expires_at:expiry})))),'seed 1200 own tickets');
 const page=range=>service.from('user_tickets').select('id,user_id').in('user_id',ids).is('used_at',null).gt('expires_at',new Date().toISOString()).order('user_id').order('id').range(...range);
 const first=data(await page([0,999]),'old page one');expect('Old pagination test crosses 1000-row API boundary',first.length===1000);
 data(await service.from('user_tickets').delete().eq('id',first[0].id).eq('user_id',first[0].user_id),'simulate concurrent reduction between pages');
 const second=data(await page([1000,1999]),'old page two'),old=new Map(ids.map(id=>[id,0]));
 for(const t of [...first,...second])old.set(t.user_id,old.get(t.user_id)+1);
 const actual=async()=>new Map(await Promise.all(ids.map(async id=>{
  const result=await service.from('user_tickets').select('id',{count:'exact',head:true}).eq('user_id',id).is('used_at',null).gt('expires_at',new Date().toISOString());data(result,'independent exact count');return [id,result.count];
 })));
 const before=await actual();
 const mismatches=ids.map((id,index)=>({index,old:old.get(id),actual:before.get(id)})).filter(r=>r.old!==r.actual);
 expect('Reproduced per-trainee miscounts when a ticket disappears between pages',mismatches.length>=2,mismatches);
 const snapshot=()=>manager.client.rpc('admin_list_trainees');
 const initial=data(await snapshot(),'new snapshot').filter(u=>ids.includes(u.id));
 expect('Atomic snapshot returns all four trainees and all 1199 available tickets',initial.length===4&&initial.every(u=>u.tickets===before.get(u.id))&&initial.reduce((n,u)=>n+u.tickets,0)===1199);
 expect('Atomic snapshot excludes its administrator',!data(await snapshot(),'role exclusion').some(u=>u.id===manager.id));
 expect('Anonymous cannot read administrator balance snapshot',!!(await anon.rpc('admin_list_trainees')).error);
 expect('Trainee cannot read administrator balance snapshot',!!(await group[0].client.rpc('admin_list_trainees')).error);
 const expired=data(await service.from('user_tickets').insert({user_id:ids[0],source:'admin',expires_at:new Date(Date.now()-1000).toISOString()}).select('id').single(),'expired fixture');
 const afterExpiry=data(await snapshot(),'expiry snapshot').find(u=>u.id===ids[0]);
 expect('Expired tickets are excluded from the snapshot',afterExpiry.tickets===before.get(ids[0]));
 const jobs=Array.from({length:32},(_,i)=>manager.client.rpc('admin_grant_tickets_once',{p_request_id:randomUUID(),p_user_id:ids[i%4],p_quantity:i%2?1:-1,p_expires_at:expiry}));
 const results=await Promise.all(jobs);expect('32 concurrent adjustments complete without resource errors',results.every(good));
 const final=await actual(),shown=data(await snapshot(),'post-race snapshot').filter(u=>ids.includes(u.id));
 expect('Snapshot after concurrent adjustments matches independent persisted counts',shown.length===4&&shown.every(u=>u.tickets===final.get(u.id)));
 for(let i=0;i<4;i++)expect(`Trainee ${i} final balance conserves every adjustment`,final.get(ids[i])===before.get(ids[i])+(i%2?8:-8));
} catch(e){expect('Balance campaign completed',false,e.message);}
finally {
 const ids=users.map(u=>u.id),errors=[];
 if(ids.length) {
  for(const action of [()=>service.from('user_tickets').delete().in('user_id',ids),...users.map(u=>()=>service.auth.admin.deleteUser(u.id))])try{data(await action(),'fixture removal');}catch(e){errors.push(e.message);}
  for(const [table,col]of[['profiles','id'],['user_tickets','user_id'],['admin_mutation_receipts','actor_id']])expect(`Zero own ${table}`,data(await service.from(table).select(col).in(col,ids),'independent cleanup').length===0);
  const removed=await Promise.all(users.map(u=>service.auth.admin.getUserById(u.id)));expect('All five Auth identities independently absent',removed.every(r=>r.error?.status===404||r.error?.code==='user_not_found'));
 }
 expect('Every cleanup operation succeeded',errors.length===0,errors);await persist();console.log(JSON.stringify({runId,dir,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length}));if(checks.some(c=>!c.passed))process.exitCode=1;
}

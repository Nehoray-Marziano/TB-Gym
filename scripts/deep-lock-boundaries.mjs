// Requires a separate, fixture-only SQL transaction from blocker.sql in the run directory.
// Never sends emails; credentials remain in ignored environment files.
import {createClient} from '@supabase/supabase-js';
import {config} from 'dotenv';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
config({path:'.env.local',quiet:true});config({path:'.env.stress.local',override:true,quiet:true});
if(process.env.ALLOW_LIVE_CORRECTNESS!=='1')throw Error('Explicit disposable live testing authorization required');
const opts={auth:{persistSession:false,autoRefreshToken:false}},url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service=createClient(url,process.env.SUPABASE_SECRET_KEY,opts),runId=`deep-boundary-${Date.now()}-${randomUUID().slice(0,8)}`,dir=`scratch/deep-concurrency/${runId}`;
const users=[],sessionIds=[],checks=[],results=[];let manager;
await mkdir(dir,{recursive:true});
const data=(r,label)=>{if(r.error)throw Error(`${label}: ${r.error.message}`);return r.data;};
const good=r=>!r.error&&r.data?.success===true;
const expect=(name,passed,evidence)=>{checks.push({name,passed:!!passed,evidence});console.log(`${passed?'PASS':'FAIL'} ${name}`);};
async function persist(){await writeFile(`${dir}/report.json`,JSON.stringify({runId,userIds:users.map(u=>u.id),sessionIds,checks,results},null,2));}
async function makeUser(i){
 const email=`${runId}-${i}@example.invalid`,password=randomBytes(24).toString('base64url');
 const made=data(await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`[${runId}] ${i}`,stress_run:runId}}),'create fixture').user;
 const client=createClient(url,key,opts),user={id:made.id,client};users.push(user);await persist();
 const link=data(await service.auth.admin.generateLink({type:'magiclink',email}),'generate undelivered code');data(await client.auth.verifyOtp({email,token:link.properties.email_otp,type:'email'}),'verify fixture code');return user;
}
const payload=(label,start=new Date(Date.now()+7*86400000).toISOString(),invite=[])=>({p_title:`[${runId}] ${label}`,p_description:'Disposable deadline/lock fixture',p_start_time:start,p_end_time:new Date(new Date(start).getTime()+3600000).toISOString(),p_max_capacity:4,p_user_ids:invite});
async function lesson(label){const r=data(await manager.client.rpc('admin_create_session',payload(label)),'create fixture lesson');sessionIds.push(r.session_id);await persist();return r.session_id;}
async function ticket(user,days=365){return data(await service.from('user_tickets').insert({user_id:user.id,source:'admin',expires_at:new Date(Date.now()+days*86400000).toISOString()}).select('id').single(),'seed own fixture ticket').id;}
const rows=(table,col,ids)=>service.from(table).select('*').in(col,ids);
try{
 for(let i=0;i<11;i++)await makeUser(i);manager=users[10];data(await service.from('profiles').update({role:'administrator',onboarding_completed:true}).eq('id',manager.id),'promote fixture manager');
 const [a,b,c,d,e,f,g,h,i,j]=users;
 const [sa,sb,sc,sd,control,sh,si]=await Promise.all(['started-class','expired-ticket','fallback-ticket','cancel-cutoff','control','final-booking','final-cancel'].map(lesson));
 const [ta,tb,tc,td,te,tf,tFallback,th,ti,tj]=await Promise.all([ticket(a),ticket(b),ticket(c,180),ticket(d),ticket(e),ticket(f),ticket(c,365),ticket(h),ticket(i),ticket(j)]);
 const seeded=await d.client.rpc('book_session',{p_session_id:sd});if(!good(seeded))throw Error('Cancellation fixture seed failed');
 if(!good(await i.client.rpc('book_session',{p_session_id:si})))throw Error('Final cancellation seed failed');
 const sql=`-- Only this run's disposable records are mutation/lock targets.
BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='26s';
UPDATE public.gym_sessions SET start_time=clock_timestamp()+interval '20 seconds',end_time=clock_timestamp()+interval '1 hour' WHERE id='${sa}' AND title='[${runId}] started-class';
UPDATE public.gym_sessions SET start_time=clock_timestamp()+interval '10 hours 20 seconds',end_time=clock_timestamp()+interval '11 hours' WHERE id='${sd}' AND title='[${runId}] cancel-cutoff';
UPDATE public.user_tickets SET expires_at=clock_timestamp()+interval '20 seconds' WHERE id IN ('${tb}','${tc}','${te}') AND user_id IN ('${b.id}','${c.id}','${e.id}');
SELECT id FROM public.user_tickets WHERE id='${tf}' AND user_id='${f.id}' FOR UPDATE;
SELECT id FROM public.profiles WHERE id='${g.id}' AND full_name='[${runId}] 6' FOR UPDATE;
SELECT id FROM public.profiles WHERE id IN ('${h.id}','${j.id}') AND full_name IN ('[${runId}] 7','[${runId}] 9') FOR UPDATE;
SELECT id FROM public.user_tickets WHERE id='${ti}' AND user_id='${i.id}' FOR UPDATE;
SELECT pg_sleep(23);
COMMIT;
SELECT clock_timestamp() AS blocker_finished;`;
 await writeFile(`${dir}/blocker.sql`,sql);await writeFile('scratch/deep-concurrency/latest-boundary.json',JSON.stringify({runId,dir,control},null,2));
 console.log(`READY ${dir}/blocker.sql`);console.log(sql);
 const end=Date.now()+600000;let armed=false;
 // Dashboard submits the entire SQL batch atomically, so an in-batch marker is
 // invisible until COMMIT. A local cue schedules requests 18 seconds later;
 // run the SQL immediately after writing the cue. The guard below rejects
 // trials that missed the actual lock/deadline window.
 while(Date.now()<end){try{const cue=JSON.parse(await readFile(`${dir}/cue.json`,'utf8'));if(Date.now()>=cue.beginAt){armed=true;break;}}catch{}await new Promise(ok=>setTimeout(ok,100));}
 if(!armed)throw Error('Fixture blocker was not started before the ten-minute cleanup deadline');
 // These unlocked session/ticket rows commit before requests start. Their
 // deadlines then pass while later booking FK or refund locks are held.
 const later=new Date(Date.now()+3500);
 data(await service.from('gym_sessions').update({start_time:later.toISOString(),end_time:new Date(later.getTime()+3600000).toISOString()}).eq('id',sh),'set final booking deadline');
 data(await service.from('gym_sessions').update({start_time:new Date(later.getTime()+10*3600000).toISOString(),end_time:new Date(later.getTime()+11*3600000).toISOString()}).eq('id',si),'set final cancel deadline');
 data(await service.from('user_tickets').update({expires_at:later.toISOString()}).eq('id',tj),'set final private expiry');
 console.log('START ten simultaneous deadline-crossing requests');
 const start=Date.now(),privatePayload=payload('blocked-private',new Date(start+2500).toISOString(),[f.id]);
 const tasks=[
  ['class-start',()=>a.client.rpc('book_session',{p_session_id:sa})],
  ['ticket-expiry',()=>b.client.rpc('book_session',{p_session_id:sb})],
  ['valid-fallback',()=>c.client.rpc('book_session',{p_session_id:sc})],
  ['cancel-cutoff',()=>d.client.rpc('cancel_booking',{p_session_id:sd})],
  ['reduction-expiry',()=>manager.client.rpc('admin_grant_tickets',{p_user_id:e.id,p_quantity:-1})],
  ['private-start',()=>manager.client.rpc('admin_create_session',privatePayload)],
  ['grant-expiry',()=>manager.client.rpc('admin_grant_tickets',{p_user_id:g.id,p_quantity:1,p_expires_at:new Date(start+2500).toISOString()})],
  ['final-booking',()=>h.client.rpc('book_session',{p_session_id:sh})],
  ['final-cancel',()=>i.client.rpc('cancel_booking',{p_session_id:si})],
  ['private-ticket-expiry',()=>manager.client.rpc('admin_create_session',payload('private-expiry',undefined,[j.id]))],
 ];
 const replies=await Promise.all(tasks.map(async([name,fn])=>{const began=Date.now(),reply=await fn(),finished=Date.now();const item={name,ms:finished-began,beganAt:new Date(began).toISOString(),finishedAt:new Date(finished).toISOString(),data:reply.data,error:reply.error?{code:reply.error.code,message:reply.error.message}:null};results.push(item);console.log(`END ${name}: ${item.ms}ms success=${good(reply)}`);if(name==='private-start'&&good(reply))sessionIds.push(reply.data.session_id);return reply;}));
 const timingValid=results.every(r=>r.ms>=3000&&!['57014','55P03','40P01'].includes(r.error?.code)&&!/deadlock|statement timeout|lock timeout/i.test(r.error?.message||r.data?.message||''));
 expect('All ten requests actually waited across the test deadline',timingValid,results.map(r=>({name:r.name,ms:r.ms,code:r.error?.code})));
 if(!timingValid)throw Error('Inconclusive timing trial: discard business outcomes and repeat with synchronized lock acquisition');
 const ts=data(await rows('user_tickets','user_id',users.map(u=>u.id)),'inspect fixture tickets'),bs=data(await rows('bookings','session_id',sessionIds),'inspect fixture bookings');
 const ticketById=id=>ts.find(t=>t.id===id);
 expect('Waiting booking cannot join a class that has started',!good(replies[0])&&!ticketById(ta).used_at&&!bs.some(b=>b.session_id===sa));
 expect('Waiting booking cannot spend a ticket that expired',!good(replies[1])&&!ticketById(tb).used_at&&!bs.some(b=>b.session_id===sb));
 expect('Expired locked ticket is skipped in favor of a valid fallback',good(replies[2])&&!ticketById(tc).used_at&&ticketById(tFallback).used_for_session===sc);
 expect('Waiting cancellation cannot cross the ten-hour cutoff',!good(replies[3])&&ticketById(td).used_for_session===sd&&bs.some(b=>b.session_id===sd));
 expect('Waiting reduction does not remove an expired unavailable ticket',!good(replies[4])&&!!ticketById(te));
 const privateRows=data(await service.from('gym_sessions').select('id').eq('title',privatePayload.p_title),'inspect private rollback');
 expect('Waiting private invitation rolls back if its class has started',!good(replies[5])&&privateRows.length===0&&!ticketById(tf).used_at);
 expect('Waiting grant cannot create already-expired tickets',!good(replies[6])&&!ts.some(t=>t.user_id===g.id));
 expect('Booking rolls back when a later foreign-key wait crosses class start',!good(replies[7])&&!ticketById(th).used_at&&!bs.some(b=>b.session_id===sh));
 expect('Cancellation rolls back when refund wait crosses cutoff',!good(replies[8])&&ticketById(ti).used_for_session===si&&bs.some(b=>b.session_id===si));
 const expiredPrivate=data(await service.from('gym_sessions').select('id').eq('title',payload('private-expiry').p_title),'inspect private expiry rollback');
 expect('Private invitation rolls back when ticket expires during booking insertion',!good(replies[9])&&expiredPrivate.length===0&&!ticketById(tj).used_at);
}catch(e){expect('Boundary campaign completed',false,e.message);}
finally{
 const errors=[];const attempt=async(label,fn)=>{try{data(await fn(),label);}catch(e){errors.push(e.message);}};
 // Include private sessions whose reply may have been lost.
 const found=data(await service.from('gym_sessions').select('id').like('title',`[${runId}]%`),'discover own sessions');const ids=[...new Set([...sessionIds,...found.map(s=>s.id)])],uids=users.map(u=>u.id);
 if(ids.length){await attempt('remove own bookings',()=>service.from('bookings').delete().in('session_id',ids));await attempt('unlink own tickets',()=>service.from('user_tickets').update({used_at:null,used_for_session:null}).in('used_for_session',ids));await attempt('remove own sessions',()=>service.from('gym_sessions').delete().in('id',ids));}
 if(uids.length){await attempt('remove own tickets',()=>service.from('user_tickets').delete().in('user_id',uids));for(const u of users)await attempt('remove own Auth identity',()=>service.auth.admin.deleteUser(u.id));
  for(const [table,col] of [['profiles','id'],['user_tickets','user_id'],['bookings','user_id']])expect(`Zero boundary fixture ${table}`,data(await service.from(table).select(col).in(col,uids),'independent residue').length===0);
  const absent=await Promise.all(users.map(u=>service.auth.admin.getUserById(u.id)));expect('All boundary Auth identities independently absent',absent.every(r=>r.error?.status===404||r.error?.code==='user_not_found'));
 }
 expect('Zero boundary fixture sessions',data(await service.from('gym_sessions').select('id').like('title',`[${runId}]%`),'session residue').length===0);
 expect('Every boundary cleanup operation succeeded',errors.length===0,errors);await persist();console.log(JSON.stringify({runId,dir,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length}));if(checks.some(c=>!c.passed))process.exitCode=1;
}

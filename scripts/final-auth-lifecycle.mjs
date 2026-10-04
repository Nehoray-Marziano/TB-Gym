// Real Auth lifecycle checks with generated, undelivered OTPs and disposable accounts.
import {createClient} from '@supabase/supabase-js';
import {config} from 'dotenv';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
config({path:'.env.local',quiet:true});config({path:'.env.stress.local',override:true,quiet:true});
if(process.env.ALLOW_LIVE_CORRECTNESS!=='1')throw Error('Explicit disposable Auth testing authorization required');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SECRET_KEY;
if(!url||!key||!secret)throw Error('Missing private test environment');
const opts={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(url,secret,opts),client=createClient(url,key,opts),runId=`final-auth-${Date.now()}-${randomUUID().slice(0,8)}`;
const dir=`scratch/final-stress/${runId}`,checks=[],ids=[];
const landing=await readFile('src/components/home/LandingPage.tsx','utf8');
const verificationType=landing.match(/supabase\.auth\.verifyOtp\(\{[\s\S]*?type:\s*"(email|magiclink)"/)?.[1];
if(!verificationType)throw Error('Cannot identify the current app OTP verification type');
await mkdir(dir,{recursive:true});
const expect=(name,passed,evidence)=>{checks.push({name,passed:!!passed,evidence});console.log(`${passed?'PASS':'FAIL'} ${name}`);};
const data=(r,label)=>{if(r.error)throw Error(`${label}: ${r.error.message}`);return r.data;};
async function persist(){await writeFile(`${dir}/report.json`,JSON.stringify({runId,checks,userIds:ids},null,2));}
try{
  const email=`${runId}@example.invalid`,password=randomBytes(24).toString('base64url');
  const link=data(await service.auth.admin.generateLink({type:'signup',email,password,options:{data:{stress_run:runId,role:'administrator',full_name:'Disposable Auth Lifecycle'}}}),'generate signup fixture');
  ids.push(link.user.id);await persist();
  const profile=data(await service.from('profiles').select('id,role,onboarding_completed').eq('id',link.user.id).single(),'inspect signup profile');
  expect('Unverified signup receives a trainee profile',profile.role==='trainee'&&profile.onboarding_completed===false,profile);
  const duplicate=await service.auth.admin.createUser({email,password,email_confirm:true});
  expect('Duplicate email cannot create another identity',!!duplicate.error,duplicate.error?.code);
  const token=link.properties.email_otp,wrong=token[0]==='9'?'0'+token.slice(1):'9'+token.slice(1);
  const rejected=await client.auth.verifyOtp({email,token:wrong,type:verificationType});
  expect('Wrong signup OTP rejected',!!rejected.error,rejected.error?.code);
  const verified=await client.auth.verifyOtp({email,token,type:verificationType});
  expect('Current app OTP type handles first-time signup',!verified.error&&verified.data.user?.id===link.user.id,verified.error?.code);
  if(verified.error){
    const universal=await client.auth.verifyOtp({email,token,type:'email'});
    expect('Universal email verification handles signup',!universal.error&&universal.data.user?.id===link.user.id,universal.error?.code);
  }
  expect('Verified email is marked confirmed',!!data(await service.auth.admin.getUserById(link.user.id),'inspect verification').user.email_confirmed_at);
  const replay=await createClient(url,key,opts).auth.verifyOtp({email,token,type:'email'});
  expect('Consumed signup OTP cannot be replayed',!!replay.error,replay.error?.code);
  const fresh=data(await service.auth.admin.generateLink({type:'magiclink',email}),'generate returning-member token');
  const returning=await client.auth.verifyOtp({email,token:fresh.properties.email_otp,type:verificationType});
  expect('Returning-member OTP works with current app type',!returning.error&&returning.data.user?.id===link.user.id,returning.error?.code);
  const refreshed=await client.auth.refreshSession();
  expect('Session refresh preserves identity',!refreshed.error&&refreshed.data.user?.id===link.user.id);
  const wrongPassword=await createClient(url,key,opts).auth.signInWithPassword({email,password:randomBytes(24).toString('base64url')});
  expect('Wrong password rejected',!!wrongPassword.error,wrongPassword.error?.code);
  await client.auth.signOut();
  expect('Sign-out clears session',!(await client.auth.getSession()).data.session);
}catch(e){expect('Lifecycle campaign completed',false,e.message);}
finally{
  for(const id of ids){const removed=await service.auth.admin.deleteUser(id);expect('Disposable Auth identity removed',!removed.error,removed.error?.message);const residue=await service.auth.admin.getUserById(id);expect('Auth identity independently absent',residue.error?.status===404||residue.error?.code==='user_not_found');const profile=await service.from('profiles').select('id').eq('id',id);expect('Signup profile independently absent',!profile.error&&profile.data.length===0);}
  await persist();console.log(JSON.stringify({runId,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,dir}));
  if(checks.some(c=>!c.passed))process.exitCode=1;
}

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { config } from 'dotenv';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

config({ path: '.env.local', quiet: true });
config({ path: '.env.stress.local', override: true, quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !key || !secret) throw new Error('Missing private test environment');
if (process.env.ALLOW_LIVE_CORRECTNESS !== '1') throw new Error('This is a live mutation campaign. Explicitly set ALLOW_LIVE_CORRECTNESS=1 after authorizing disposable fixture tests.');
const base = process.env.BASE_URL || 'https://tb-gym.vercel.app';
if (!['tb-gym.vercel.app','localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Unapproved HTTP target; test-session cookies must stay on TB-Gym or localhost');
const runId = `final-${Date.now()}-${randomUUID().slice(0, 8)}`;
const dir = `scratch/final-stress/${runId}`;
await mkdir(dir, { recursive: true });
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, secret, options);
const anon = createClient(url, key, options);
const users = [], sessions = [], checks = [], phases = [], timings = [];
const report = { runId, base, project: new URL(url).host, startedAt: new Date().toISOString(), checks, phases, timings };
let persistence = Promise.resolve();
let manager, manager2;
let rpcCount = 0, httpCount = 0;
const future = new Date(Date.now() + 180 * 86400000);
const expiry = new Date(Date.now() + 365 * 86400000).toISOString();
const good = r => !r.error && r.data?.success === true;
const denied = r => !!r.error || r.data?.success === false;
function data(r, label) { if (r.error) throw new Error(`${label}: ${r.error.message}`); return r.data; }
function expect(condition, name, evidence) {
  checks.push({ name, passed: !!condition, ...(evidence === undefined ? {} : { evidence }) });
  if (!condition) console.log(`FAIL: ${name} ${JSON.stringify(evidence ?? '')}`);
}
async function persist() {
  const manifest = JSON.stringify({ runId, project: report.project, userIds: users.map(u => u.id), sessionIds: sessions }, null, 2);
  const snapshot = JSON.stringify(report, null, 2);
  persistence = persistence.then(async () => {
    await writeFile(`${dir}/manifest.json`, manifest);
    await writeFile(`${dir}/report.json`, snapshot);
  });
  await persistence;
}
async function phase(name, fn) {
  console.log(`START ${name}`);
  const start = performance.now(), before = checks.length;
  try { await fn(); } catch (e) { expect(false, `${name}: harness completed`, e.message); }
  phases.push({ name, ms: Math.round(performance.now() - start), checks: checks.length - before, failures: checks.slice(before).filter(c => !c.passed).length });
  await persist();
  console.log(`END ${name}: ${phases.at(-1).checks} checks, ${phases.at(-1).failures} failures`);
}
async function rpc(client, name, args) {
  const start = performance.now();
  const result = await client.rpc(name, args);
  rpcCount++;
  timings.push({ name, ms: Math.round(performance.now() - start), transportError: result.error?.code || null });
  return result;
}
async function pool(tasks, limit = 24) {
  let index = 0;
  const result = [];
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (index < tasks.length) { const i = index++; result[i] = await tasks[i](); }
  }));
  return result;
}
async function makeUser(i) {
  const email = `${runId}-${i}@example.invalid`, password = randomBytes(24).toString('base64url');
  const created = data(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `[${runId}] ${i}`, stress_run: runId } }), 'create disposable account').user;
  const cookies = new Map();
  const client = createServerClient(url, key, { auth: { autoRefreshToken: false }, cookies: {
    getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
    setAll: items => items.forEach(c => cookies.set(c.name, c.value)),
  } });
  const user = { id: created.id, client, cookies };
  users.push(user);
  await persist();
  if (process.env.AUTH_TEST_MODE === 'otp') {
    const link = data(await service.auth.admin.generateLink({ type: 'magiclink', email }), 'generate undelivered test OTP');
    data(await client.auth.verifyOtp({ email, token: link.properties.email_otp, type: 'email' }), 'verify real test OTP');
  } else data(await client.auth.signInWithPassword({ email, password }), 'sign in disposable account');
  return user;
}
function payload(label, capacity = 24, invite = []) {
  return { p_title: `[${runId}] ${label}`, p_description: 'Disposable automated correctness fixture', p_start_time: future.toISOString(), p_end_time: new Date(future.getTime() + 3600000).toISOString(), p_max_capacity: capacity, p_user_ids: invite };
}
async function lesson(label, capacity = 24, invite = []) {
  const r = data(await rpc(manager.client, 'admin_create_session', payload(label, capacity, invite)), 'create lesson');
  if (!r.success) throw new Error(`Lesson failed: ${r.message}`);
  sessions.push(r.session_id); await persist(); return r.session_id;
}
async function grant(user, quantity) {
  const r = await rpc(manager.client, 'admin_grant_tickets', { p_user_id: user.id, p_quantity: quantity, p_expires_at: expiry });
  if (!good(r)) throw new Error(`Grant failed: ${r.error?.message || r.data?.message}`);
  return r.data;
}
async function tickets(ids) {
  return data(await service.from('user_tickets').select('id,user_id,used_at,used_for_session,expires_at').in('user_id', ids), 'read fixture tickets');
}
async function bookings(ids) {
  return data(await service.from('bookings').select('id,user_id,session_id,status').in('session_id', ids), 'read fixture bookings');
}
async function resetTickets(group, count) {
  const ids = group.map(u => u.id);
  const used = (await tickets(ids)).filter(t => t.used_at);
  if (used.length) throw new Error('Reset would delete consumed tickets');
  data(await service.from('user_tickets').delete().in('user_id', ids), 'reset disposable unused tickets');
  if (count) data(await service.from('user_tickets').insert(group.flatMap(u => Array.from({ length: count }, () => ({ user_id: u.id, source: 'admin', expires_at: expiry })))), 'seed unused tickets');
}
async function removeLesson(id) {
  const r = await rpc(manager.client, 'admin_delete_session', { p_session_id: id });
  if (!good(r)) throw new Error(`Delete fixture lesson: ${r.error?.message}`);
  return r.data;
}
async function invariant(label, ids, group) {
  const [bs, ts, ss] = await Promise.all([bookings(ids), tickets(group.map(u => u.id)), service.from('gym_sessions').select('id,max_capacity').in('id', ids)]);
  const rows = data(ss, 'read fixture capacity');
  const active = bs.filter(b => b.status === 'confirmed');
  expect(rows.every(s => active.filter(b => b.session_id === s.id).length <= s.max_capacity), `${label}: capacity respected`);
  expect(new Set(active.map(b => `${b.user_id}:${b.session_id}`)).size === active.length, `${label}: bookings unique`);
  const spent = ts.filter(t => t.used_at && ids.includes(t.used_for_session));
  expect(spent.length === active.length && active.every(b => spent.filter(t => t.user_id === b.user_id && t.used_for_session === b.session_id).length === 1), `${label}: one consumed ticket per booking`, { bookings: active.length, spent: spent.length });
  expect(ts.every(t => (t.used_at === null) === (t.used_for_session === null)), `${label}: ticket links coherent`);
  return { bs: active, ts };
}
async function web(path, user, method = 'GET', body) {
  const start = performance.now();
  const cookie = user ? [...user.cookies].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join('; ') : '';
  const res = await fetch(`${base}${path}`, { redirect: 'manual', method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  const text = await res.text(); httpCount++;
  timings.push({ name: `HTTP ${path}`, ms: Math.round(performance.now() - start), status: res.status });
  return { status: res.status, location: res.headers.get('location'), text };
}
function redirects(r, path) { return r.location?.includes(path) || (r.text.includes('NEXT_REDIRECT') && r.text.includes(path)); }

try {
  await phase('Concurrent disposable account provisioning and onboarding', async () => {
    await pool(Array.from({ length: 26 }, (_, i) => () => makeUser(i)), 3);
    manager = users[24]; manager2 = users[25];
    data(await service.from('profiles').update({ role: 'administrator' }).in('id', [manager.id, manager2.id]), 'promote test managers');
    const profiles = data(await service.from('profiles').select('id,role,onboarding_completed').in('id', users.map(u => u.id)), 'inspect generated profiles');
    expect(profiles.length === 26, 'Every auth account has exactly one profile');
    expect(profiles.filter(p => p.role === 'trainee').length === 24, 'New accounts default to trainee');
    expect(profiles.filter(p => p.role === 'trainee').every(p => p.onboarding_completed === false), 'New trainees require onboarding');
    expect(redirects(await web('/dashboard',users[0]),'/onboarding'),'Incomplete trainee dashboard redirects to onboarding');
    expect(redirects(await web('/book',users[0]),'/onboarding'),'Incomplete trainee cannot bypass onboarding through booking route');
    await pool(users.map((u, i) => async () => {
      data(await u.client.from('profiles').update({ full_name: `[${runId}] User ${i}`, age: 25, phone: '0500000000', onboarding_completed: true }).eq('id', u.id).select('id').single(), 'save own onboarding');
      data(await u.client.from('health_declarations').upsert({ id: u.id, is_healthy: true, medical_conditions: null }), 'save synthetic declaration');
    }), 8);
    const health = data(await service.from('health_declarations').select('id').in('id', users.map(u => u.id)), 'read fixture declarations');
    expect(health.length === 26, 'Concurrent onboarding saved all declarations');
    expect(data(await users[0].client.auth.getUser(), 'validate user session').user.id === users[0].id, 'Authenticated identity matches account');
  });
  if (!manager || users.length !== 26) throw new Error('Provisioning incomplete; skip dependent workload');
  const trainees = users.slice(0, 24);
  await phase('Public catalog reads and administrator-only writes',async()=>{
    const name=`${runId}-catalog-probe`;
    const row={name,display_name:'Disposable catalog permission fixture',sessions:1,price_nis:1};
    try {
      expect(! (await anon.from('subscription_tiers').select('id,name,price_nis')).error,'Anonymous can read public plan prices');
      expect(!!(await anon.from('subscription_tiers').insert(row)).error,'Anonymous cannot insert plan prices');
      // Remove only our exact synthetic name if the initial probe found a gap.
      data(await service.from('subscription_tiers').delete().eq('name',name),'clear own probe');
      expect(!!(await trainees[0].client.from('subscription_tiers').insert(row)).error,'Trainee cannot insert plan prices');
      data(await service.from('subscription_tiers').delete().eq('name',name),'clear own trainee probe');
      const created=await manager.client.from('subscription_tiers').insert(row).select('id').single();
      expect(!created.error,'Administrator can maintain catalog');
      if(!created.error){
        for(const [label,client] of [['Anonymous',anon],['Trainee',trainees[0].client]]) {
          const changed=await client.from('subscription_tiers').update({price_nis:2}).eq('id',created.data.id).select('id');
          expect(!!changed.error||changed.data.length===0,`${label} cannot change plan prices`);
          const deleted=await client.from('subscription_tiers').delete().eq('id',created.data.id).select('id');
          expect(!!deleted.error||deleted.data.length===0,`${label} cannot delete a plan`);
        }
        const current=data(await service.from('subscription_tiers').select('price_nis').eq('id',created.data.id).single(),'inspect catalog fixture');
        expect(Number(current.price_nis)===1,'Rejected catalog mutations preserve price');
        const updated=await manager.client.from('subscription_tiers').update({price_nis:3}).eq('id',created.data.id).select('price_nis').single();
        expect(!updated.error&&Number(updated.data?.price_nis)===3,'Administrator can update catalog fixture');
        const removed=await manager.client.from('subscription_tiers').delete().eq('id',created.data.id).select('id');
        expect(!removed.error&&removed.data.length===1,'Administrator can delete catalog fixture');
      }
    } finally {
      data(await service.from('subscription_tiers').delete().eq('name',name),'cleanup catalog fixture');
      expect(data(await service.from('subscription_tiers').select('id').eq('name',name),'verify catalog residue').length===0,'No catalog fixture remains');
    }
  });
  await phase('Authorization and direct-write bypasses', async () => {
    const a = trainees[0], b = trainees[1];
    const id = await lesson('permission fixture', 1);
    await grant(b, 1);
    for (const [table, column] of [['profiles','id'], ['health_declarations','id'], ['user_tickets','user_id'], ['user_subscriptions','user_id'], ['user_credits','user_id']]) {
      const r = await a.client.from(table).select('*').eq(column, b.id);
      expect(!r.error && r.data.length === 0, `Trainee cannot read another account's ${table}`, r.error?.message);
      const ar = await anon.from(table).select('*').eq(column, b.id);
      expect(!!ar.error || ar.data.length === 0, `Anonymous cannot read private ${table}`);
    }
    const role = await a.client.from('profiles').update({ role: 'administrator' }).eq('id', a.id).select('role');
    expect(!!role.error, 'Self promotion is rejected');
    const email = await a.client.from('profiles').update({ email: 'forbidden@example.invalid' }).eq('id', a.id);
    expect(!!email.error, 'Profile identity tampering is rejected');
    const other = await a.client.from('profiles').update({ full_name: 'forbidden' }).eq('id', b.id).select('id');
    expect(!!other.error || other.data.length === 0, 'Another user profile cannot be changed');
    const h = await a.client.from('health_declarations').upsert({ id: b.id, is_healthy: false, medical_conditions: 'fixture tampering attempt' });
    expect(!!h.error, 'Another user declaration cannot be overwritten');
    for (const [name, args] of [
      ['admin_create_session', payload('forbidden')], ['admin_grant_tickets', {p_user_id:a.id,p_quantity:1}],
      ['admin_delete_session',{p_session_id:id}], ['admin_cancel_booking',{p_booking_id:randomUUID()}],
      ['purchase_subscription',{p_tier_id:1}], ['purchase_additional_tickets',{p_quantity:1}],
    ]) {
      expect(denied(await rpc(a.client,name,args)), `Trainee denied ${name}`);
      expect(denied(await rpc(anon,name,args)), `Anonymous denied ${name}`);
    }
    expect(denied(await rpc(anon,'book_session',{p_session_id:id})), 'Anonymous booking denied');
    expect(denied(await rpc(anon,'cancel_booking',{p_session_id:id})), 'Anonymous cancellation denied');
    const direct = await a.client.from('bookings').insert({user_id:a.id,session_id:id,status:'confirmed'});
    expect(!!direct.error, 'Direct booking cannot bypass ticket/capacity checks');
    const minted = await a.client.from('user_tickets').insert({user_id:a.id,source:'admin',expires_at:expiry});
    expect(!!minted.error, 'Trainee cannot mint tickets');
    const stolen = await a.client.from('user_tickets').delete().eq('user_id',b.id).select('id');
    expect(!!stolen.error || stolen.data.length === 0, 'Trainee cannot remove another balance');
    const directLesson = await a.client.from('gym_sessions').insert({title:`[${runId}] forbidden-direct`,start_time:future.toISOString(),end_time:new Date(future.getTime()+3600000).toISOString(),max_capacity:1});
    expect(!!directLesson.error, 'Trainee cannot insert sessions');
    expect(data(await a.client.rpc('get_available_tickets',{p_user_id:b.id}), 'foreign balance').valueOf() === 0, 'Balance helper does not reveal another user balance');
    await removeLesson(id); await resetTickets(trainees, 0);
  });
  await phase('Bulk session creation and validation rollback', async () => {
    const made = await pool(Array.from({length:80},(_,i)=>()=>lesson(`bulk-${i}`, (i%20)+1)), 16);
    expect(new Set(made).size === 80, '80 concurrent session creations return unique records');
    expect(data(await service.from('gym_sessions').select('id').in('id',made),'bulk records').length === 80, 'All 80 created sessions persisted');
    const invalid = [ {p_title:' '}, {p_max_capacity:0}, {p_max_capacity:101}, {p_max_capacity:null}, {p_start_time:new Date(Date.now()-1000).toISOString()}, {p_end_time:future.toISOString()}, {p_user_ids:null}, {p_user_ids:[trainees[0].id,trainees[0].id]}, {p_max_capacity:1,p_user_ids:[trainees[0].id,trainees[1].id]}, {p_user_ids:[randomUUID()]}, {p_user_ids:[trainees[0].id]} ];
    for (let i=0;i<invalid.length;i++) {
      expect(denied(await rpc(manager.client,'admin_create_session',{...payload(`invalid-${i}`),...invalid[i]})), `Invalid session ${i} rejected atomically`);
    }
    expect(data(await service.from('gym_sessions').select('id').like('title',`[${runId}] invalid-%`),'rollback records').length === 0, 'Failed creations leave no session records');
    await pool(made.map(id=>()=>removeLesson(id)),16);
    expect((await bookings(made)).length === 0, 'Bulk deletion leaves no bookings');
  });
  await phase('Repeated capacity races: 24 identities, up to 48 simultaneous attempts', async () => {
    for (let wave=0;wave<12;wave++) {
      await resetTickets(trainees,1);
      const cap = [1,3,7,12][wave%4], id = await lesson(`capacity-${wave}`,cap);
      const attempts = wave%2 ? [...trainees,...trainees] : trainees;
      const results = await Promise.all(attempts.map(u=>rpc(u.client,'book_session',{p_session_id:id})));
      const {bs} = await invariant(`Capacity wave ${wave}`, [id], trainees);
      expect(results.every(r=>!r.error), `Capacity wave ${wave}: no transport/database exceptions`);
      expect(results.filter(good).length === cap && bs.length === cap, `Capacity wave ${wave}: fills exactly ${cap} spots`, {successes:results.filter(good).length, bookings:bs.length});
      const visible = data(await trainees[0].client.from('bookings').select('user_id').eq('session_id',id),'private bookings');
      expect(visible.every(b=>b.user_id===trainees[0].id), `Capacity wave ${wave}: attendee identities private`);
      const counts = data(await trainees[1].client.from('gym_sessions_with_counts').select('current_bookings').eq('id',id).single(),'occupancy view');
      expect(Number(counts.current_bookings) === cap, `Capacity wave ${wave}: public count correct`, counts);
      const deleted = await removeLesson(id);
      expect(deleted.tickets_refunded === cap, `Capacity wave ${wave}: deletion refunds exactly winners`);
      expect((await tickets(trainees.map(u=>u.id))).every(t=>!t.used_at && !t.used_for_session), `Capacity wave ${wave}: balances restored`);
    }
  });
  await phase('Cross-session spending, cancellation, retry and turnover races', async () => {
    const a = trainees[0];
    for(let wave=0;wave<8;wave++) {
      await resetTickets(trainees,0); await grant(a,1);
      const ids = await Promise.all(Array.from({length:8},(_,i)=>lesson(`double-spend-${wave}-${i}`,1)));
      const results = await Promise.all(ids.map(id=>rpc(a.client,'book_session',{p_session_id:id})));
      const {bs} = await invariant(`Double spend ${wave}`,ids,[a]);
      expect(results.filter(good).length===1 && bs.length===1, `Double spend ${wave}: one ticket buys one booking`);
      await pool(ids.map(id=>()=>removeLesson(id)),8);
    }
    await resetTickets(trainees,1);
    const id = await lesson('duplicate-book-cancel',1);
    const book = await Promise.all(Array.from({length:32},()=>rpc(a.client,'book_session',{p_session_id:id})));
    expect(book.filter(good).length===1, '32 duplicate booking attempts consume one ticket');
    await invariant('Duplicate booking',[id],[a]);
    const cancels = await Promise.all(Array.from({length:32},()=>rpc(a.client,'cancel_booking',{p_session_id:id})));
    expect(cancels.filter(good).length===1, '32 duplicate cancellations refund once');
    expect((await tickets([a.id])).filter(t=>!t.used_at).length===1 && (await bookings([id])).length===0, 'Duplicate cancellation preserves exact balance');
    for(let wave=0;wave<12;wave++) {
      const r = await rpc(a.client,'book_session',{p_session_id:id}); if(!good(r)) throw new Error('Pre-book turnover fixture failed');
      const results = await Promise.all([rpc(a.client,'cancel_booking',{p_session_id:id}), ...trainees.slice(1,9).map(u=>rpc(u.client,'book_session',{p_session_id:id}))]);
      expect(good(results[0]), `Turnover ${wave}: owner cancellation succeeds`);
      const {bs} = await invariant(`Turnover ${wave}`,[id],trainees);
      expect(bs.length<=1 && results.slice(1).filter(good).length===bs.length, `Turnover ${wave}: serializable slot handoff`);
      // All contenders may legally observe the full session before cancellation.
      for(const b of bs) data(await rpc(manager.client,'admin_cancel_booking',{p_booking_id:b.id}), 'clear turnover winner');
    }
    await removeLesson(id);
  });
  await phase('Ticket adjustment bounds, expiry and concurrent conservation', async () => {
    const a=trainees[0]; await resetTickets(trainees,0);
    for(const q of [0,101,-101,null,-1]) expect(denied(await rpc(manager.client,'admin_grant_tickets',{p_user_id:a.id,p_quantity:q})), `Invalid adjustment ${q} rejected`);
    expect(denied(await rpc(manager.client,'admin_grant_tickets',{p_user_id:randomUUID(),p_quantity:1})), 'Adjustment to missing user rejected');
    expect(denied(await rpc(manager.client,'admin_grant_tickets',{p_user_id:a.id,p_quantity:1,p_expires_at:new Date(Date.now()-1000).toISOString()})), 'Past expiry grant rejected');
    await grant(a,100); expect((await tickets([a.id])).length===100,'Maximum grant creates exactly 100 tickets');
    await grant(a,-100); expect((await tickets([a.id])).length===0,'Maximum reduction removes exactly 100 tickets');
    await grant(a,30);
    const operations=Array.from({length:48},(_,i)=>({q:i%2?1:-1,client:i%3?manager.client:manager2.client}));
    const results=await Promise.all(operations.map(o=>rpc(o.client,'admin_grant_tickets',{p_user_id:a.id,p_quantity:o.q,p_expires_at:expiry})));
    expect(results.every(good), '48 concurrent mixed adjustments succeed with sufficient reserve', results.filter(r=>!good(r)).map(r=>r.error?.message));
    expect((await tickets([a.id])).length===30,'Mixed concurrent adjustments conserve balance');
    await resetTickets([a],1);
    const reductions=await Promise.all(Array.from({length:24},()=>rpc(manager.client,'admin_grant_tickets',{p_user_id:a.id,p_quantity:-1})));
    expect(reductions.filter(good).length===1 && (await tickets([a.id])).length===0,'24 reductions cannot overdraw one ticket');
    for(let wave=0;wave<12;wave++) {
      await resetTickets([a],1); const id=await lesson(`reduce-v-book-${wave}`,1);
      const [b,r]=await Promise.all([rpc(a.client,'book_session',{p_session_id:id}),rpc(manager2.client,'admin_grant_tickets',{p_user_id:a.id,p_quantity:-1})]);
      expect(Number(good(b))+Number(good(r))===1,`Book/reduce ${wave}: exactly one spends final ticket`, {booking:b.data,error:b.error?.message, reduction:r.data, reductionError:r.error?.message});
      await invariant(`Book/reduce ${wave}`,[id],[a]); await removeLesson(id);
    }
    await resetTickets([a],0);
    data(await service.from('user_tickets').insert({user_id:a.id,source:'admin',expires_at:new Date(Date.now()-86400000).toISOString()}),'seed expired ticket');
    const id=await lesson('expired-ticket',1);
    expect(denied(await rpc(a.client,'book_session',{p_session_id:id})),'Expired ticket cannot book');
    expect(denied(await rpc(manager.client,'admin_grant_tickets',{p_user_id:a.id,p_quantity:-1})),'Expired ticket does not count toward reduction');
    expect(data(await a.client.rpc('get_available_tickets',{p_user_id:a.id}),'expired count')===0,'Displayed available balance excludes expired ticket');
    await grant(a,2);
    const used = await rpc(a.client,'book_session',{p_session_id:id}); expect(good(used),'Valid tickets remain usable alongside expired ticket');
    await grant(a,-1);
    expect(denied(await rpc(manager.client,'admin_grant_tickets',{p_user_id:a.id,p_quantity:-1})),'Reduction cannot remove already booked ticket');
    await invariant('Expiry and reduction',[id],[a]); await removeLesson(id);
  });
  await phase('Concurrent private invitations and many lessons per trainee', async () => {
    const [a,b]=trainees; await resetTickets(trainees,0);
    await grant(a,100); await grant(b,100);
    const requests=Array.from({length:32},(_,i)=>({ ...payload(`private-race-${i}`,2,i%2?[b.id,a.id]:[a.id,b.id]) }));
    const results=await Promise.all(requests.map(p=>rpc(manager.client,'admin_create_session',p)));
    const ids=results.filter(good).map(r=>r.data.session_id); sessions.push(...ids); await persist();
    expect(results.every(good),'32 private creations with reversed invitation order all succeed',results.filter(r=>!good(r)).map(r=>({code:r.error?.code,message:r.error?.message,data:r.data})));
    await invariant('Concurrent private creations',ids,[a,b]);
    expect((await bookings(ids)).length===64,'Concurrent private creation persists every invitation');
    await pool(ids.map(id=>()=>removeLesson(id)),16);
    expect((await tickets([a.id,b.id])).filter(t=>!t.used_at).length===200,'Concurrent private deletion refunds every balance');
    const many=await Promise.all(Array.from({length:32},(_,i)=>lesson(`many-for-one-${i}`,1)));
    const booked=await Promise.all(many.map(id=>rpc(a.client,'book_session',{p_session_id:id})));
    expect(booked.every(good),'One trainee with enough tickets can book 32 different lessons concurrently',booked.filter(r=>!good(r)).map(r=>r.error?.message||r.data));
    await invariant('Many lessons per trainee',many,[a]);
    await pool(many.map(id=>()=>removeLesson(id)),16);
    expect((await tickets([a.id])).filter(t=>!t.used_at).length===100,'All 32 cross-session refunds conserve balance');
  });
  await phase('Private invitations, atomic rollback and cancellation cutoff', async () => {
    const [a,b]=trainees; await resetTickets(trainees,0); await grant(a,1);
    const bad=await rpc(manager.client,'admin_create_session',payload('partial-invite',2,[a.id,b.id]));
    expect(denied(bad),'Invitation with one insufficient balance fails');
    expect((await tickets([a.id])).every(t=>!t.used_at),'Failed second invitation rolls back first ticket consumption');
    expect(data(await service.from('gym_sessions').select('id').eq('title',payload('partial-invite').p_title),'failed invite').length===0,'Failed partial invitation leaves no lesson');
    await grant(b,1); const id=await lesson('private-valid',2,[a.id,b.id]); await invariant('Private invitation',[id],[a,b]);
    const bs=await bookings([id]);
    const cancellations=await Promise.all([rpc(manager.client,'admin_cancel_booking',{p_booking_id:bs[0].id}),rpc(a.client,'cancel_booking',{p_session_id:id}),rpc(manager2.client,'admin_delete_session',{p_session_id:id})]);
    expect(cancellations.some(good),'Concurrent admin/member cancellation and deletion progresses');
    expect((await bookings([id])).length===0 && (await tickets([a.id,b.id])).every(t=>!t.used_at),'Concurrent deletion/cancellation refunds both exactly once');
    for(const hours of [-1,5,9.99,10.01,24]) {
      await resetTickets([a],1);
      const sid=await lesson(`cutoff-${hours}`,1); const booked=await rpc(a.client,'book_session',{p_session_id:sid}); if(!good(booked)) throw new Error('Cutoff seed failed');
      const start=new Date(Date.now()+hours*3600000);
      data(await service.from('gym_sessions').update({start_time:start.toISOString(),end_time:new Date(start.getTime()+3600000).toISOString()}).eq('id',sid),'set cutoff fixture');
      const c=await rpc(a.client,'cancel_booking',{p_session_id:sid});
      expect(hours>10 ? good(c) : denied(c),`Cancellation cutoff ${hours} hours`,c.error?.message||c.data);
      if(hours<0) expect(denied(await rpc(b.client,'book_session',{p_session_id:sid})),'Started lesson cannot be booked');
      await removeLesson(sid);
    }
    expect(denied(await rpc(a.client,'book_session',{p_session_id:randomUUID()})),'Booking missing session rejected');
    expect(denied(await rpc(a.client,'cancel_booking',{p_session_id:randomUUID()})),'Cancellation missing session rejected');
  });
  await phase('Production HTTP authorization and bounded parallel page load', async () => {
    const a=trainees[0];
    for(const path of ['/admin','/admin/schedule','/admin/trainees']) {
      expect(redirects(await web(path),'/auth/login'),`Anonymous ${path} blocked`);
      expect(redirects(await web(path,a),'/dashboard'),`Trainee ${path} blocked`);
      const r=await web(path,manager); expect(r.status===200&&!redirects(r,'/auth/login')&&!redirects(r,'/dashboard'),`Administrator ${path} allowed`,{status:r.status,location:r.location});
    }
    for(const path of ['/api/notifications','/api/notifications/grant-tickets']) {
      expect((await web(path,null,'POST',{})).status===401,`Anonymous ${path} denied`);
    }
    expect((await web('/api/notifications',a,'POST',{title:'test',message:'test',targetUserIds:[manager.id]})).status===403,'Trainee cannot notify another user');
    expect((await web('/api/notifications/grant-tickets',a,'POST',{userId:a.id,amount:1})).status===403,'Trainee grant notification denied');
    expect((await web('/api/notifications',manager,'POST',{title:'',message:'test'})).status===400,'Malformed notification rejected before provider call');
    expect((await web('/api/notifications/grant-tickets',manager,'POST',{userId:a.id,amount:101})).status===400,'Invalid grant notification rejected before provider call');
    const routes=['/','/auth/login','/dashboard','/book','/my-bookings','/profile','/subscription','/admin','/admin/schedule','/admin/trainees','/api/app-version','/manifest.webmanifest'];
    for(const concurrency of [8,16,32]) {
      const results=await pool(Array.from({length:concurrency*3},(_,i)=>async()=>{
        const path=routes[i%routes.length], u=path.startsWith('/admin')?manager:path==='/auth/login'||path==='/manifest.webmanifest'||path==='/api/app-version'?null:trainees[i%24];
        const r=await web(path,u); return {path,status:r.status,ok:path==='/'?redirects(r,'/dashboard'):r.status===200&&!r.text.includes('NEXT_REDIRECT')};
      }),concurrency);
      expect(results.every(r=>r.ok),`HTTP concurrency ${concurrency}: all ${results.length} pages correct`,results.filter(r=>!r.ok));
    }
  });
  await phase('Session refresh and sign-out lifecycle',async()=>{
    const a=trainees[23];
    expect(! (await a.client.auth.refreshSession()).error,'Session refresh succeeds');
    expect(data(await a.client.auth.getUser(),'refreshed user').user.id===a.id,'Refreshed session keeps identity');
    expect(!(await a.client.auth.signOut()).error,'Sign-out succeeds');
    expect(!(await a.client.auth.getSession()).data.session,'Sign-out removes local session');
    expect(denied(await rpc(a.client,'book_session',{p_session_id:randomUUID()})),'Signed-out client cannot book');
    const account=data(await service.auth.admin.getUserById(a.id),'load own fixture email').user;
    const link=data(await service.auth.admin.generateLink({type:'magiclink',email:account.email}),'generate undelivered OTP');
    const otp=link.properties.email_otp;
    const wrong=otp[0]==='9'?'0'+otp.slice(1):'9'+otp.slice(1);
    const isolated=createClient(url,key,options);
    expect(!!(await isolated.auth.verifyOtp({email:account.email,token:wrong,type:'email'})).error,'Invalid OTP is rejected');
    const verified=await isolated.auth.verifyOtp({email:account.email,token:otp,type:'email'});
    expect(!verified.error&&verified.data.user?.id===a.id,'Valid generated OTP authenticates the intended user');
    const replay=await createClient(url,key,options).auth.verifyOtp({email:account.email,token:otp,type:'email'});
    expect(!!replay.error,'Consumed OTP cannot be replayed');
    await isolated.auth.signOut();
  });
} catch(e) { expect(false,'Campaign completed',e.message); }
finally {
  await phase('Cleanup and independent residue verification',async()=>{
    const cleanupErrors=[];
    const attempt=async(label,fn)=>{try{return await fn();}catch(e){cleanupErrors.push(`${label}: ${e.message}`);return null;}};
    // Recover any account whose creation succeeded but whose response was lost.
    for(let page=1;page<=100;page++){
      const listed=await attempt('discover tagged Auth fixtures',async()=>data(await service.auth.admin.listUsers({page,perPage:1000}),'list fixture candidates'));
      if(!listed)break;
      for(const u of listed.users.filter(u=>u.user_metadata?.stress_run===runId))if(!users.some(x=>x.id===u.id))users.push({id:u.id});
      if(listed.users.length<1000)break;
    }
    // Discover by exact unique run marker as well as manifest (covers lost RPC replies).
    const found=data(await service.from('gym_sessions').select('id').like('title',`[${runId}]%`),'discover fixture sessions');
    const ids=[...new Set([...sessions,...found.map(s=>s.id)])];
    if(ids.length) {
      await attempt('bookings',async()=>data(await service.from('bookings').delete().in('session_id',ids),'cleanup fixture bookings'));
      await attempt('ticket links',async()=>data(await service.from('user_tickets').update({used_at:null,used_for_session:null}).in('used_for_session',ids),'unlink fixture tickets'));
      await attempt('sessions',async()=>data(await service.from('gym_sessions').delete().in('id',ids),'cleanup fixture sessions'));
    }
    if(users.length) {
      const userIds=users.map(u=>u.id);
      for(const [table,col] of [['bookings','user_id'],['user_tickets','user_id'],['user_subscriptions','user_id'],['health_declarations','id']])await attempt(table,async()=>data(await service.from(table).delete().in(col,userIds),`cleanup ${table}`));
      for(const u of users)await attempt('Auth user',async()=>data(await service.auth.admin.deleteUser(u.id),'delete disposable auth account'));
      for(const [table,col] of [['profiles','id'],['health_declarations','id'],['user_tickets','user_id'],['user_subscriptions','user_id'],['user_credits','user_id'],['bookings','user_id']]) {
        expect(data(await service.from(table).select(col).in(col,userIds),`verify ${table}`).length===0,`Cleanup leaves zero fixture ${table}`);
      }
      const removed=await pool(users.map(u=>()=>service.auth.admin.getUserById(u.id)),4);
      expect(removed.every(r=>r.error?.status===404||r.error?.code==='user_not_found'),'All fixture Auth accounts independently confirmed absent');
    }
    expect(data(await service.from('gym_sessions').select('id').like('title',`[${runId}]%`),'verify session residue').length===0,'Cleanup leaves zero tagged sessions');
    if(ids.length) expect((await bookings(ids)).length===0,'Cleanup leaves zero fixture session bookings');
    data(await service.from('subscription_tiers').delete().eq('name',`${runId}-catalog-probe`),'cleanup catalog fallback');
    expect(cleanupErrors.length===0,'All cleanup operations succeeded',cleanupErrors);
  });
  report.completedAt=new Date().toISOString();
  report.summary={checks:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,users:users.length,sessionsCreated:sessions.length,rpcCalls:rpcCount,httpRequests:httpCount};
  report.latency=Object.fromEntries([...new Set(timings.map(t=>t.name))].map(name=>{
    const xs=timings.filter(t=>t.name===name).map(t=>t.ms).sort((a,b)=>a-b);
    return [name,{count:xs.length,p50:xs[Math.floor(xs.length*.5)],p95:xs[Math.floor(xs.length*.95)],max:xs.at(-1)}];
  }));
  await persist(); console.log(JSON.stringify({runId,dir,summary:report.summary,failures:checks.filter(c=>!c.passed),latency:report.latency},null,2));
  if(report.summary.failed) process.exitCode=1;
}

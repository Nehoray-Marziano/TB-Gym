// Actual production UI, authenticated member requests and disposable real writes.
// Only catalog reads are narrowed to fixtures; push delivery is intercepted.
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { config } from 'dotenv';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './lib/browser-check.mjs';

config({ path: '.env.local', quiet: true });
config({ path: '.env.stress.local', override: true, quiet: true });
if (process.env.ALLOW_LIVE_CORRECTNESS !== '1') throw Error('Disposable live testing authorization required');
const base = process.env.BASE_URL || 'http://localhost:3137';
if (!['localhost', '127.0.0.1', 'tb-gym.vercel.app'].includes(new URL(base).hostname)) throw Error('Unapproved target');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const runId = `member-ui-${Date.now()}-${randomUUID().slice(0, 8)}`;
const dir = `scratch/final-stress/${runId}`, prefix = `[${runId.split('-').at(-1)}]`;
const users = [], sessions = [], checks = [], writes = [];
let browser, current, readFault = false, writeFault = false, notifications = 0;
await mkdir(dir, { recursive: true });
const data = (r, label) => { if (r.error) throw Error(`${label}: ${r.error.message}`); return r.data; };
const expect = (name, passed, evidence) => { checks.push({ name, passed: !!passed, evidence }); console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`); };
const persist = () => writeFile(`${dir}/report.json`, JSON.stringify({ runId, base, userIds: users.map(u => u.id), sessionIds: sessions, checks, writes, notifications }, null, 2));
const profile = u => service.from('profiles').select('full_name,phone').eq('id', u.id).single().then(r => data(r, 'fixture profile'));
const health = u => service.from('health_declarations').select('is_healthy,medical_conditions').eq('id', u.id).single().then(r => data(r, 'fixture health'));
const balance = async u => {
  // Independent observer: never refresh a browser session from a second client.
  const r = await service.from('user_tickets').select('id', { count: 'exact', head: true }).eq('user_id', u.id).is('used_at', null).gt('expires_at', new Date().toISOString());
  data(r, 'persisted member balance'); return r.count;
};
const booked = async u => data(await service.from('bookings').select('session_id').eq('user_id', u.id).eq('status', 'confirmed'), 'fixture bookings');
const nameSelector = 'input[aria-label="שם מלא"]';
const editing = `!!document.querySelector(${JSON.stringify(nameSelector)})`;
async function navigate(path) { await browser.call('Page.navigate', { url: base + path }); }
async function switchUser(u) {
  current = u;
  await browser.call('Page.navigate', { url: 'about:blank' });
  await browser.call('Network.clearBrowserCookies');
  // Keep tab storage deliberately: the app must key personal state by identity.
  await browser.call('Storage.clearDataForOrigin', { origin: base, storageTypes: 'local_storage' });
  await browser.call('Network.setCookies', { cookies: [...u.cookies].map(([name, value]) => ({ name, value: encodeURIComponent(value), url: base, path: '/', secure: new URL(base).protocol === 'https:', sameSite: 'Lax' })) });
}
async function tripleSave() {
  await browser.wait("!document.querySelector('main header button').disabled", 'save enabled');
  await browser.evaluate("(()=>{const b=document.querySelector('main header button');b.click();b.click();b.click();})()");
}
async function cardButton(title, text) {
  await browser.evaluate(`(()=>{document.querySelector('[data-fixture-action]')?.removeAttribute('data-fixture-action');const a=[...document.querySelectorAll('article')].find(a=>a.innerText.includes(${JSON.stringify(title)}));const b=[...a.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw Error('Missing enabled fixture action');b.setAttribute('data-fixture-action','');})()`);
  await browser.click('[data-fixture-action]');
}
try {
  const version = await fetch(base + '/api/app-version').then(r => r.json());
  expect('Current production build is the approved test target', version.version === process.env.EXPECTED_APP_VERSION);
  if (version.version !== process.env.EXPECTED_APP_VERSION) throw Error('Unexpected application version');
  for (let i = 0; i < 4; i++) {
    const email = `${runId}-${i}@example.invalid`;
    const user = data(await service.auth.admin.createUser({ email, password: randomBytes(24).toString('base64url'), email_confirm: true, user_metadata: { stress_run: runId } }), 'fixture account').user;
    const cookies = new Map();
    const client = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false }, cookies: { getAll: () => [...cookies].map(([name, value]) => ({ name, value })), setAll: items => items.forEach(c => cookies.set(c.name, c.value)) } });
    const u = { id: user.id, client, cookies, index: i }; users.push(u); await persist();
    const link = data(await service.auth.admin.generateLink({ type: 'magiclink', email }), 'undelivered code');
    data(await client.auth.verifyOtp({ email, token: link.properties.email_otp, type: 'email' }), 'fixture auth');
    data(await service.from('profiles').update({ onboarding_completed: true, full_name: `${prefix} Member ${i}`, phone: '0500000000' }).eq('id', u.id), 'fixture readiness');
    data(await service.from('health_declarations').upsert({ id: u.id, is_healthy: true, medical_conditions: null }), 'fixture declaration');
    data(await service.from('user_tickets').insert(Array.from({ length: 3 }, () => ({ user_id: u.id, source: 'admin', expires_at: new Date(Date.now() + 365 * 86400000).toISOString() }))), 'fixture tickets');
  }
  for (let i = 0; i < 2; i++) {
    const start = new Date(Date.now() + (48 + i * 2) * 3600000);
    const session = data(await service.from('gym_sessions').insert({ title: `${prefix} Member class ${i}`, description: 'Disposable browser correctness fixture', start_time: start.toISOString(), end_time: new Date(+start + 3600000).toISOString(), max_capacity: 3 }).select('id').single(), 'fixture class');
    sessions.push(session.id); await persist();
  }
  browser = await openBrowser(dir);
  await browser.call('Page.addScriptToEvaluateOnNewDocument', { source: `if(location.origin===${JSON.stringify(base)})localStorage.setItem('talia_pwa_installed','1')` });
  await browser.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await browser.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await browser.call('Network.setBlockedURLs', { urls: ['*onesignal.com*'] });
  browser.on('Fetch.requestPaused', async ({ requestId, request }) => {
    const target = new URL(request.url), table = target.pathname.split('/').at(-1), method = request.method;
    const fulfill = (status, body) => browser.call('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'content-type', value: 'application/json' }, { name: 'access-control-allow-origin', value: base }, { name: 'access-control-allow-credentials', value: 'true' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
    if (target.origin === base && target.pathname.startsWith('/api/notifications')) { notifications++; await fulfill(200, { success: true, id: 'fixture-only', recipients: 1 }); return; }
    if (target.origin === new URL(url).origin && target.pathname.startsWith('/rest/v1/') && method !== 'OPTIONS') {
      if (method === 'GET' && table === 'gym_sessions_with_counts') {
        target.searchParams.set('id', `in.(${sessions.join(',')})`);
        const response = await fetch(target, { headers: request.headers });
        await fulfill(response.status, await response.json()); return;
      }
      if (method === 'GET' && table === 'health_declarations' && readFault) { readFault = false; await fulfill(403, { code: '42501', message: 'Fixture read rejection' }); return; }
      if (['POST', 'PATCH', 'DELETE'].includes(method) && !['get_available_tickets', 'get_user_subscription'].includes(table)) {
        const args = JSON.parse(request.postData || '{}');
        const safe = table === 'profiles' && method === 'PATCH' && target.searchParams.get('id') === `eq.${current.id}` || table === 'health_declarations' && method === 'POST' && args.id === current.id || ['book_session', 'cancel_booking'].includes(table) && sessions.includes(args.p_session_id);
        if (!safe) { expect('Mutation outside disposable fixtures blocked', false, { table, method }); await fulfill(403, { message: 'Fixture safety guard' }); return; }
        writes.push({ userId: current.id, table, sessionId: args.p_session_id, rejected: table === 'health_declarations' && writeFault });
        if (table === 'health_declarations' && writeFault) { writeFault = false; await fulfill(403, { code: '42501', message: 'Fixture write rejection' }); return; }
        await browser.delay(250);
      }
    }
    await browser.call('Fetch.continueRequest', { requestId });
  });
  await browser.call('Fetch.enable', { patterns: [{ urlPattern: url + '/rest/v1/*', requestStage: 'Request' }, { urlPattern: base + '/api/notifications*', requestStage: 'Request' }] });
  for (const u of users) {
    await switchUser(u);
    if (u.index === 0) readFault = true;
    await navigate('/profile');
    if (u.index === 0) {
      await browser.wait("!!document.querySelector('main')===false&&!!document.querySelector('[role=alert] button')", 'failed health read recovery', 60000);
      expect('Failed declaration read prevents editing empty defaults', !(await browser.evaluate(editing)) && await browser.evaluate("!document.querySelector('input,textarea')"));
      await browser.click('[role=alert] button');
    }
    await browser.wait("!!document.querySelector('main header button')", 'member profile loaded', 60000);
    for (let edit = 0; edit < 3; edit++) {
      await browser.click('main header button'); await browser.wait(editing, 'edit form');
      await browser.evaluate("document.querySelector('details').open=true");
      if (edit === 0) {
        const before = writes.length;
        await browser.input(nameSelector, '   '); await browser.delay(100); await tripleSave(); await browser.delay(300);
        expect(`Member ${u.index}: blank name stays editable without writes`, await browser.evaluate(editing) && writes.length === before);
      }
      const name = `${prefix} Member ${u.index} Edit ${edit}`, phone = `05000000${u.index}${edit}`, healthy = edit === 2;
      await browser.input(nameSelector, name); await browser.input('input[type=tel]', phone);
      await browser.textClick(healthy ? 'תקינה' : 'יש מגבלות');
      if (!healthy) { await browser.wait("!!document.querySelector('textarea')", 'medical details field'); await browser.input('textarea', `Fixture limitation ${u.index}/${edit}`); }
      await browser.delay(100);
      if (u.index === 0 && edit === 0) {
        writeFault = true; const before = writes.length; await tripleSave();
        await browser.wait("!!document.querySelector('main header button')&&!document.querySelector('main header button').disabled", 'rejected save unlocks');
        expect('Rejected declaration save retains entered profile and health form', await browser.evaluate(`${editing}&&document.querySelector(${JSON.stringify(nameSelector)}).value===${JSON.stringify(name)}`) && writes.length === before + 2 && (await health(u)).is_healthy);
      }
      const before = writes.length; await tripleSave(); await browser.wait(`!(${editing})`, 'save acknowledged');
      const p = await profile(u), h = await health(u);
      expect(`Member ${u.index} edit ${edit}: triple submit commits one profile/declaration pair`, writes.length === before + 2);
      expect(`Member ${u.index} edit ${edit}: exact persisted fields and health`, p.full_name === name && p.phone === phone && h.is_healthy === healthy && h.medical_conditions === (healthy ? null : `Fixture limitation ${u.index}/${edit}`));
      await browser.call('Page.reload'); await browser.wait("!!document.querySelector('main h2')", 'reloaded profile');
      expect(`Member ${u.index} edit ${edit}: reload shows current identity`, await browser.evaluate(`document.querySelector('main h2').textContent===${JSON.stringify(name)}`));
    }
    await browser.shot(`member-${u.index}-profile`);
    for (let cycle = 0; cycle < 2; cycle++) {
      const title = `${prefix} Member class ${cycle}`;
      await navigate('/book'); await browser.wait("document.querySelectorAll('article').length===2", 'fixture catalog loaded', 60000);
      await cardButton(title, 'שמרי לי מקום'); await browser.wait("!!document.querySelector('dialog:modal')", 'booking confirmation');
      const before = writes.length;
      await browser.evaluate("(()=>{const b=document.querySelector('.studio-modal-actions button');b.click();b.click();b.click();})()");
      await browser.wait("!document.querySelector('dialog:modal')", 'booking acknowledged');
      expect(`Member ${u.index} booking ${cycle}: one request, one ticket and booking`, writes.length === before + 1 && writes.at(-1).table === 'book_session' && await balance(u) === 2 && (await booked(u)).some(b => b.session_id === sessions[cycle]));
      await browser.call('Page.reload'); await browser.wait("document.querySelectorAll('article').length===2", 'booked catalog reload');
      await cardButton(title, 'ביטול הרשמה'); await browser.wait("!!document.querySelector('dialog:modal')", 'cancellation confirmation');
      const cancelBefore = writes.length;
      await browser.evaluate("(()=>{const b=document.querySelector('.studio-modal-actions button');b.click();b.click();b.click();})()");
      await browser.wait("!document.querySelector('dialog:modal')", 'cancellation acknowledged');
      expect(`Member ${u.index} cancellation ${cycle}: one request and exact refund`, writes.length === cancelBefore + 1 && writes.at(-1).table === 'cancel_booking' && await balance(u) === 3 && (await booked(u)).length === 0);
      await browser.call('Page.reload'); await browser.wait("document.querySelectorAll('article').length===2", 'cancelled catalog reload');
      expect(`Member ${u.index} cancellation ${cycle}: reload offers booking again`, await browser.evaluate(`[...document.querySelectorAll('article')].find(a=>a.innerText.includes(${JSON.stringify(title)})).innerText.includes('שמרי לי מקום')`));
    }
  }
  await switchUser(users[0]); await navigate('/profile'); await browser.wait("!!document.querySelector('main h2')", 'first account restored', 60000);
  expect('Switching back restores the first account without the previous account name', await browser.evaluate(`document.querySelector('main h2').textContent===${JSON.stringify(`${prefix} Member 0 Edit 2`)}`));
  await browser.textClick('התנתקות'); await browser.wait("location.pathname==='/auth/login'||location.pathname==='/'", 'logout completed', 60000);
  await navigate('/profile'); await browser.wait("location.pathname==='/auth/login'", 'signed-out personal route blocked', 60000);
  expect('Sign-out clears access to the personal profile', true);
  expect('All booking/cancellation notifications were intercepted', notifications === 16, { notifications });
  expect('No unhandled browser exceptions', browser.errors.length === 0, browser.errors.map(e => ({ event: e.event, message: e.message, text: e.text, description: e.exception?.description?.slice(0, 500) })));
} catch (error) {
  expect('Member browser campaign completed', false, error.message);
  if (browser) { try { await browser.shot('failure'); console.log(JSON.stringify(await browser.evaluate("({path:location.pathname,buttons:[...document.querySelectorAll('button')].map(b=>({text:b.textContent.trim(),disabled:b.disabled})),alerts:[...document.querySelectorAll('[role=alert]')].map(e=>e.textContent)})"))); } catch { /* retain original failure */ } }
} finally {
  if (browser) await browser.close();
  const errors = [], attempt = async fn => { try { data(await fn(), 'fixture cleanup'); } catch (e) { errors.push(e.message); } };
  const ids = users.map(u => u.id);
  if (sessions.length) {
    await attempt(() => service.from('bookings').delete().in('session_id', sessions));
    await attempt(() => service.from('user_tickets').update({ used_at: null, used_for_session: null }).in('used_for_session', sessions));
    await attempt(() => service.from('gym_sessions').delete().in('id', sessions));
    expect('No member fixture sessions remain', data(await service.from('gym_sessions').select('id').in('id', sessions), 'session residue').length === 0);
  }
  if (ids.length) {
    await attempt(() => service.from('user_tickets').delete().in('user_id', ids));
    await attempt(() => service.from('health_declarations').delete().in('id', ids));
    for (const u of users) await attempt(() => service.auth.admin.deleteUser(u.id));
    for (const [table, column] of [['profiles', 'id'], ['health_declarations', 'id'], ['bookings', 'user_id'], ['user_tickets', 'user_id']]) expect(`No member fixture ${table} remain`, data(await service.from(table).select(column).in(column, ids), 'residue').length === 0);
    expect('All member Auth fixtures independently absent', (await Promise.all(users.map(u => service.auth.admin.getUserById(u.id)))).every(r => r.error?.status === 404 || r.error?.code === 'user_not_found'));
  }
  expect('All member cleanup operations succeeded', errors.length === 0, errors);
  await persist(); console.log(JSON.stringify({ runId, dir, passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length }));
  if (checks.some(c => !c.passed)) process.exitCode = 1;
}

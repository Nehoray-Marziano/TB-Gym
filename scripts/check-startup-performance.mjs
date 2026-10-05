// Read-only launch benchmark using an existing synthetic trainee account.
// node scripts/check-startup-performance.mjs <baseUrl> <label> [--baseline]
// --baseline records the old implementation without enforcing the fast redirect.
// Reports contain timings only, never cookies or tokens; browser cookies are cleared.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServerClient } from '@supabase/ssr';
import { config } from 'dotenv';
import { openBrowser } from './lib/browser-check.mjs';

config({ path: '.env.local', quiet: true });
const base = process.argv[2] || 'http://127.0.0.1:3124';
const label = process.argv[3] || 'local';
assert.match(label, /^[a-zA-Z0-9_-]+$/);
const baseline = process.argv.includes('--baseline');
const output = `scratch/startup-performance/${label}`;
await mkdir(output, { recursive: true });
const jar = new Map();
const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: items => items.forEach(({ name, value }) => jar.set(name, value)),
  },
});
const users = JSON.parse(await readFile('.dummy-users.json', 'utf8')).users;
const user = users.find(user => user.role === 'trainee');
assert.match(user.email, /^dummy_.*@test\.talia\.club$/, 'Use only the existing synthetic account');
const { data: auth, error } = await supabase.auth.signInWithPassword({ email: user.email, password: user.password });
if (error) throw new Error(error.message);
const { data: profile, error: profileError } = await supabase.from('profiles').select('full_name,onboarding_completed').eq('id', user.id).single();
if (profileError) throw profileError;
assert.equal(profile.onboarding_completed, true, 'Benchmark requires an onboarded test account');
const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
const sessionKey = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
const report = { base, label, tokenAlgorithm: JSON.parse(Buffer.from(auth.session.access_token.split('.')[0], 'base64url')).alg, http: [], browser: [] };

async function request(path, sessionCookie) {
  const started = performance.now();
  const response = await fetch(new URL(path, base), {
    redirect: 'manual', headers: sessionCookie ? { Cookie: sessionCookie } : {},
    signal: AbortSignal.timeout(30000),
  });
  const headersMs = Math.round(performance.now() - started);
  const body = await response.text();
  return { response, body, timing: { path, status: response.status, headersMs, totalMs: Math.round(performance.now() - started), bytes: Buffer.byteLength(body), vercelId: response.headers.get('x-vercel-id') } };
}

// Public entry remains public; protected routes still enforce authentication.
assert.match((await request('/')).body, /class="studio-welcome /);
const guest = await request('/dashboard');
assert.equal(guest.response.status, 307);
assert.equal(new URL(guest.response.headers.get('location'), base).pathname, '/auth/login');

if (!baseline) {
  // These are intentionally invalid routing hints. No auth or account request
  // should be needed for the initial redirect, and they must never grant access.
  for (const key of [sessionKey, `${sessionKey}.0`]) {
    const hint = `${key}=invalid-test-session`;
    const entry = await request('/', hint);
    assert.equal(entry.response.status, 307);
    assert.equal(new URL(entry.response.headers.get('location'), base).pathname, '/dashboard');
    assert.ok(entry.body.length < 256, 'Redirect must bypass the React account bootstrap');
    const denied = await request('/dashboard', hint);
    assert.equal(denied.response.status, 307);
    assert.equal(new URL(denied.response.headers.get('location'), base).pathname, '/auth/login');
    const login = await request('/auth/login', hint);
    assert.equal(login.response.status, 200, 'Invalid cookie cannot create a redirect loop');
    assert.match(login.body, /class="studio-welcome /);
  }
  assert.match((await request('/', `${sessionKey}-code-verifier=unrelated`)).body, /class="studio-welcome /);
}

for (let run = 0; run < 3; run++) {
  const entry = await request('/', cookie);
  assert.equal(entry.response.status, 307);
  assert.equal(new URL(entry.response.headers.get('location'), base).pathname, '/dashboard');
  if (!baseline) assert.ok(entry.body.length < 256, 'No account bootstrap before redirect');
  const dashboard = await request('/dashboard', cookie);
  assert.equal(dashboard.response.status, 200);
  assert.match(dashboard.body, /class="studio-home /);
  assert.ok(dashboard.body.includes(profile.full_name.trim().split(/\s+/)[0]), 'Profile is present in server HTML');
  assert.doesNotMatch(dashboard.body, /aria-busy="true"/, 'Initial dashboard already has its data');
  const result = { run, entry: entry.timing, dashboard: dashboard.timing, toDashboardHeadersMs: entry.timing.headersMs + dashboard.timing.headersMs };
  report.http.push(result);
  console.log(JSON.stringify(result));
}

console.log('HTTP checks complete; measuring mobile browser launch.');
const browser = await openBrowser(output);
try {
  // Establish the origin before accessing Chrome's cookie store.
  await browser.call('Page.navigate', { url: `${base}/api/app-version` });
  await browser.call('Network.setCookies', { cookies: [...jar].map(([name, value]) => ({ name, value, url: base, path: '/', sameSite: 'Lax', secure: base.startsWith('https:') })) });
  await browser.call('Network.setBlockedURLs', { urls: ['*onesignal.com*'] });
  await browser.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await browser.call('Emulation.setCPUThrottlingRate', { rate: 4 });
  await browser.call('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: 1_100_000, uploadThroughput: 190_000 });
  await browser.call('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__startup = { homeAt: null, incompleteAtFirstDOM: null };
    new MutationObserver((_, observer) => {
      const home = document.querySelector('.studio-home');
      if (home && home.querySelector('.studio-home-name') && home.querySelector('.studio-home-workout')) {
        window.__startup.homeAt = performance.now();
        window.__startup.incompleteAtFirstDOM = !!home.querySelector('[aria-busy="true"]');
        observer.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  ` });
  for (let run = 0; run < 3; run++) {
    await browser.call('Page.navigate', { url: 'about:blank' });
    await browser.call('Network.setCacheDisabled', { cacheDisabled: run === 0 });
    await browser.call('Page.navigate', { url: `${base}/` });
    await browser.wait(`location.pathname === '/dashboard' && document.querySelector('.studio-home') && !document.querySelector('.studio-home [aria-busy="true"]') && performance.getEntriesByType('paint').length > 0`, 'complete dashboard', 45000);
    const result = await browser.evaluate(`(() => {
      const n = performance.getEntriesByType('navigation')[0];
      return { redirectMs: Math.round(n.redirectEnd - n.redirectStart), responseStartMs: Math.round(n.responseStart), responseEndMs: Math.round(n.responseEnd), paints: performance.getEntriesByType('paint').map(p => ({ name: p.name, ms: Math.round(p.startTime) })), home: window.__startup };
    })()`);
    assert.equal(result.home.incompleteAtFirstDOM, false, 'First dashboard DOM has all initial data');
    report.browser.push({ run, cache: run === 0 ? 'cold' : 'warm', ...result });
    console.log(JSON.stringify(report.browser.at(-1)));
    if (run === 2) await browser.shot('dashboard');
  }
  assert.equal(browser.errors.length, 0, 'No browser runtime errors');
} finally {
  await browser.call('Network.clearBrowserCookies').catch(() => {});
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
}
console.log(`PASS: authenticated launch, complete initial data, guest routing${baseline ? '' : ', invalid-cookie access denial and loop protection'}. Evidence: ${output}`);

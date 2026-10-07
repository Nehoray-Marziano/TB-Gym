import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModule, flush } from './lib/notification-test-runtime.mjs';

async function runtime({ permission = 'granted', prompt = 'granted', init, login, optIn, environment = 'production', supported = true } = {}) {
    const calls = [], listeners = new Set(), scripts = [], timers = new Map();
    const native = { permission };
    const window = supported ? { Notification: native } : {};
    const client = {
        init: async options => { calls.push(['init', options]); await init?.(); },
        login: async id => { calls.push(['login', id]); await login?.(id); },
        logout: async () => calls.push(['logout']),
        User: {
            addTag: async (key, value) => calls.push(['tag', key, value]),
            addEmail: async email => calls.push(['email', email]),
            PushSubscription: { optedIn: false, optIn: async () => {
                calls.push(['optIn']);
                if (optIn) await optIn(); else client.User.PushSubscription.optedIn = true;
            } },
        },
        Notifications: {
            requestPermission: async () => { calls.push(['permission']); native.permission = prompt; return prompt === 'granted'; },
            addEventListener: (_, listener) => listeners.add(listener),
            removeEventListener: (_, listener) => listeners.delete(listener),
        },
    };
    const document = {
        querySelector: () => scripts[0],
        createElement: () => ({ dataset: {}, events: {}, addEventListener(name, fn) { this.events[name] = fn; }, remove() { scripts.splice(scripts.indexOf(this), 1); } }),
        head: { appendChild: script => scripts.push(script) },
    };
    let timerId = 0;
    const { api } = await loadModule('src/lib/oneSignalClient.ts', {
        window, document, Notification: native, process: { env: { NODE_ENV: environment } },
        setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
    });
    const drain = async () => {
        await flush();
        const queue = window.OneSignalDeferred || [];
        const pending = queue.splice(0);
        await Promise.all(pending.map(fn => fn(client)));
        queue.push = fn => { void fn(client); return 0; };
        await flush();
    };
    return { api, calls, client, window, scripts, timers, listeners, drain };
}

test('startup waits for SDK initialization before login and role tagging', async () => {
    let finish;
    const gate = new Promise(resolve => { finish = resolve; });
    const r = await runtime({ init: () => gate });
    const sync = r.api.syncOneSignalIdentity('member', 'TRAINEE', 'qa@example.invalid');
    const draining = r.drain();
    await flush();
    assert.deepEqual(r.calls.map(call => call[0]), ['init']);
    finish(); await draining; await sync;
    assert.deepEqual(r.calls.slice(1), [['login', 'member'], ['tag', 'role', 'trainee'], ['email', 'qa@example.invalid']]);
});

test('concurrent callers initialize SDK and load script once', async () => {
    const r = await runtime();
    const first = r.api.getOneSignalClient(), second = r.api.getOneSignalClient();
    assert.equal(first, second);
    await r.drain(); await first;
    assert.equal(r.scripts.length, 1);
    assert.equal(r.calls.filter(c => c[0] === 'init').length, 1);
});

test('logout during a pending login wins and skips stale role and email', async () => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const r = await runtime({ login: () => gate });
    const first = r.api.syncOneSignalIdentity('old', 'administrator', 'old@example.invalid');
    await r.drain();
    const logout = r.api.syncOneSignalIdentity();
    release(); await first; await logout;
    assert.deepEqual(r.calls.slice(1), [['login', 'old'], ['logout']]);
});

test('account switch during startup never tags the obsolete identity', async () => {
    const r = await runtime();
    const first = r.api.syncOneSignalIdentity('old', 'administrator');
    await flush();
    const next = r.api.syncOneSignalIdentity('new', 'trainee');
    await r.drain(); await first; await next;
    assert.deepEqual(r.calls.slice(1), [['login', 'new'], ['tag', 'role', 'trainee']]);
});

test('signed-out startup does not load SDK', async () => {
    const r = await runtime(); await r.api.syncOneSignalIdentity();
    assert.equal(r.scripts.length, 0);
});

test('failed initialization can be retried', async () => {
    let attempts = 0;
    const r = await runtime({ init: () => { if (++attempts === 1) throw new Error('Offline'); } });
    const first = r.api.getOneSignalClient(); const rejected = assert.rejects(first, /Offline/);
    await r.drain(); await rejected;
    const second = r.api.getOneSignalClient(); await r.drain(); await second;
    assert.equal(attempts, 2);
});

test('script load failure is visible and reloadable', async () => {
    const r = await runtime();
    const first = r.api.getOneSignalClient(); const rejected = assert.rejects(first, /did not load/);
    r.scripts[0].events.error(); await rejected;
    const second = r.api.getOneSignalClient(); await r.drain(); await second;
    assert.equal(r.scripts.length, 1);
    assert.equal(r.calls.filter(c => c[0] === 'init').length, 1);
});

test('SDK timeout rejects instead of leaving permission button pending forever', async () => {
    const r = await runtime();
    const pending = r.api.enablePushNotifications(); const rejected = assert.rejects(pending, /did not load/);
    for (const timeout of r.timers.values()) timeout();
    await rejected;
});

for (const [name, options, expected, expectedCalls] of [
    ['unsupported browser', { supported: false }, 'unsupported', []],
    ['blocked permission', { permission: 'denied' }, 'denied', []],
    ['granted browser permission repairs inactive subscription', {}, 'granted', ['init', 'optIn']],
    ['allow prompt activates subscription', { permission: 'default' }, 'granted', ['init', 'permission', 'optIn']],
    ['deny prompt does not opt in', { permission: 'default', prompt: 'denied' }, 'denied', ['init', 'permission']],
    ['dismiss prompt does not claim success', { permission: 'default', prompt: 'default' }, 'default', ['init', 'permission']],
]) test(name, async () => {
    const r = await runtime(options);
    const pending = r.api.enablePushNotifications(); await r.drain();
    assert.equal(await pending, expected);
    assert.deepEqual(r.calls.map(c => c[0]), expectedCalls);
});

test('failed subscription activation never reports enabled', async () => {
    const r = await runtime({ optIn: async () => {} });
    const pending = r.api.enablePushNotifications(); const rejected = assert.rejects(pending, /inactive/);
    await r.drain(); await rejected;
});

test('foreground listener renders actual provider toast and detaches on unmount', async () => {
    const r = await runtime();
    const effects = [], toasts = [];
    const { api } = await loadModule('src/providers/OneSignalProvider.tsx', { process: { env: { NODE_ENV: 'production' } } }, {
        react: { useEffect: effect => effects.push(effect) },
        '@/components/ui/use-toast': { useToast: () => ({ toast: value => toasts.push(value) }) },
        '@/lib/oneSignalClient': r.api,
    });
    api.default({ userId: 'member', userRole: 'trainee' });
    const cleanups = effects.map(effect => effect());
    await r.drain();
    for (const listener of r.listeners) listener({ notification: { body: 'בדיקת תוכן' } });
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0].title, 'הודעה חדשה');
    assert.equal(toasts[0].description, 'בדיקת תוכן');
    for (const cleanup of cleanups) cleanup?.();
    assert.equal(r.listeners.size, 0);
});

test('development mode cannot silently initialize production push', async () => {
    const r = await runtime({ environment: 'development' });
    await assert.rejects(r.api.getOneSignalClient(), /published app/);
    assert.equal(r.scripts.length, 0);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { loadModule, loadHandler, flush } from './lib/notification-test-runtime.mjs';

const USER = '11111111-2222-3333-4444-555555555555';
const session = { id: 'test-session', title: 'אימון בדיקה', isRegistered: false, current_bookings: 1 };
const attendee = { id: 'test-booking', user_id: USER, session, users: { full_name: 'בדיקה' } };
const flows = [
    ['member booking', 'src/components/book/BookingExperience.tsx', 'handleBook', [session.id], 'administrator'],
    ['member cancellation in schedule', 'src/components/book/BookingExperience.tsx', 'confirmCancel', [], 'administrator'],
    ['member cancellation in my bookings', 'src/app/(trainee)/my-bookings/page.tsx', 'confirmCancel', [], 'administrator'],
    ['schedule broadcast', 'src/app/admin/schedule/page.tsx', 'notifyTrainees', [], 'trainee'],
    ['delete class notifies booked users', 'src/app/admin/schedule/page.tsx', 'executeDeleteSession', [], 'users'],
    ['schedule removes attendee', 'src/app/admin/schedule/page.tsx', 'handleCancelBooking', [attendee], 'users'],
    ['trainee page ticket adjustment', 'src/app/admin/trainees/page.tsx', 'handleGrantTickets', [USER, 4], 'tickets'],
    ['quick broadcast', 'src/components/admin/QuickBroadcastModal.tsx', 'handleSend', [{ preventDefault() {} }], 'trainee'],
    ['quick ticket adjustment', 'src/components/admin/QuickGrantModal.tsx', 'handleGrant', [{ preventDefault() {} }], 'tickets'],
    ['quick roster removal', 'src/components/admin/QuickRosterModal.tsx', 'handleConfirmCancel', [], 'users'],
];

async function setup(flow, { mutationFails = false, deliveryFails = false, noRecipients = false, quantity = 4 } = {}) {
    const requests = [], toasts = [], rpcCalls = [], errors = [];
    let closed = false, changed = false;
    const { api } = await loadModule('src/lib/notificationRequest.ts', {
        fetch: async (url, options) => {
            requests.push({ url, payload: JSON.parse(options.body) });
            return Response.json(deliveryFails ? { error: 'No subscribed recipients' } : { success: true, id: 'mock-id' }, { status: deliveryFails ? 400 : 200 });
        },
    });
    const globals = {
        sendNotificationRequest: api.sendNotificationRequest,
        supabase: {
            auth: { getSession: async () => ({ data: { session: { user: { id: 'admin' } } } }) },
            rpc: async name => {
                rpcCalls.push(name);
                return { error: mutationFails ? new Error('Mutation failed') : null, data: { success: !mutationFails, user_ids: noRecipients ? [] : [USER] } };
            },
        },
        globalCancel: async () => ({ success: !mutationFails, message: 'Mutation failed' }),
        console: { error: (...args) => errors.push(args) },
        toast: value => toasts.push(value),
        mutationLock: { current: false }, updateLock: { current: false },
        sendLock: { current: false },
        isCancelling: false, isSending: false, submitting: false, bookingId: null,
        userId: USER, sessions: [session], bookings: [attendee], sessionBookings: [attendee],
        session, sessionToCancel: session, viewBookingsSession: session,
        cancellingBooking: attendee, deleteConfirmation: { session },
        selectedTrainee: { id: USER, tickets: 8 }, quantity, isValidAmount: true,
        requestId: { current: 0 },
        title: 'בדיקת הודעה', message: 'בדיקת שידור למתאמנות',
        sessionStorage: { removeItem() {} }, navigator: { vibrate() {} },
        triggerCelebration() {}, bookingMessage: value => value,
        refreshData: async () => {}, fetchSessions: async () => {}, fetchBookings: async () => {},
        fetchTrainees: async () => {}, loadBookings: async () => {},
        getAdminMutationRequestId: async () => 'request-id', completeAdminMutationIntent() {},
        closeDelete() {}, onClose: () => { closed = true; }, onGranted: () => { changed = true; }, onRosterChanged: () => { changed = true; },
    };
    const handler = await loadHandler(flow[1], flow[2], globals);
    const run = async () => {
        try { await handler.invoke(...flow[3]); } catch (error) { errors.push(error); }
        await flush(); await flush();
    };
    return { ...handler, run, globals, requests, toasts, errors, rpcCalls, closed: () => closed, changed: () => changed };
}

for (const flow of flows) {
    const [name, , , , target] = flow;
    test(`${name}: successful flow sends exactly once to correct recipient`, async () => {
        const r = await setup(flow); await r.run();
        assert.equal(r.requests.length, 1);
        const { url, payload } = r.requests[0];
        if (target === 'tickets') {
            assert.equal(url, '/api/notifications/grant-tickets');
            assert.equal(payload.userId, USER); assert.equal(payload.amount, 4);
        } else if (target === 'users') assert.deepEqual(payload.targetUserIds, [USER]);
        else assert.equal(payload.targetRole, target);
        assert.equal(r.errors.length, 0);
    });
    test(`${name}: provider failure is detected and never duplicates domain mutation`, async () => {
        const r = await setup(flow, { deliveryFails: true }); await r.run();
        assert.equal(r.requests.length, 1);
        assert.equal(r.rpcCalls.length, name === 'member booking' || !['trainee', 'administrator'].includes(target) ? 1 : 0, name);
        assert.ok(r.errors.length > 0, 'HTTP failure must not disappear');
        if (name.includes('broadcast')) {
            assert.equal(r.toasts.filter(t => t.type === 'success').length, 0);
            assert.equal(r.closed(), false);
            assert.ok(Object.values(r.state).some(v => typeof v === 'string' && v.includes('לא הצלחנו')));
        } else {
            assert.ok(r.toasts.some(t => t.type === 'success'), 'Committed booking or balance stays successful');
            if (!name.startsWith('member')) assert.ok(r.toasts.some(t => t.type === 'error'), 'Admin sees separate notification failure');
        }
    });
    if (!name.includes('broadcast')) test(`${name}: failed domain mutation sends no notification`, async () => {
        const r = await setup(flow, { mutationFails: true }); await r.run();
        assert.equal(r.requests.length, 0);
    });
}

test('class deletion with no booked users sends no notification', async () => {
    const r = await setup(flows.find(f => f[2] === 'executeDeleteSession'), { noRecipients: true }); await r.run();
    assert.equal(r.requests.length, 0);
});

test('negative ticket adjustment sends balance update for the same user', async () => {
    const r = await setup(flows.find(f => f[2] === 'handleGrant'), { quantity: -2 }); await r.run();
    assert.equal(r.requests[0].payload.amount, -2);
    assert.equal(r.requests[0].payload.userId, USER);
});

test('double broadcast submit sends only once before React rerenders', async () => {
    const r = await setup(flows.find(f => f[2] === 'handleSend'));
    await Promise.all([r.run(), r.run()]);
    assert.equal(r.requests.length, 1);
});

test('every notification trigger is covered by an actual-handler test', async () => {
    for (const path of new Set(flows.map(f => f[1]))) {
        const source = await readFile(path, 'utf8');
        const triggers = source.match(/sendNotificationRequest\(["']\/api\/notifications/g) || [];
        assert.equal(triggers.length, flows.filter(f => f[1] === path).length, `Add coverage for new trigger in ${path}`);
    }
});

for (const [name, status, body] of [['HTTP failure', 503, {}], ['HTTP success without acceptance', 200, {}]]) {
    test(`shared client detects ${name}`, async () => {
        const { api } = await loadModule('src/lib/notificationRequest.ts', { fetch: async () => Response.json(body, { status }) });
        await assert.rejects(api.sendNotificationRequest('/api/notifications', { method: 'POST' }));
    });
}

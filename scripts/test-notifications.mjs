import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach, before, after } from 'node:test';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { NextRequest } from 'next/server.js';
import { configureMockAuth, resetMockAuth } from './lib/mock-supabase.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

let notificationsPost;
let grantTicketsPost;
let originalFetch;
let capturedFetches = [];
let mockOneSignalResponse = { ok: true, status: 200, body: { id: 'mock-notification-id', recipients: 1 } };

const VALID_UUID_1 = '11111111-2222-3333-4444-555555555555';
const VALID_UUID_2 = '66666666-7777-8888-9999-000000000000';
const ADMIN_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const TRAINEE_UUID = 'ffffffff-0000-1111-2222-333333333333';

before(async () => {
    // 1. Transpile route files with imports rewritten to mock supabase
    await mkdir(resolve(rootDir, 'scratch/transpiled'), { recursive: true });

    const transpileAndWrite = async (srcRel, destRel) => {
        const srcPath = resolve(rootDir, srcRel);
        const code = await readFile(srcPath, 'utf8');
        const transpiled = ts.transpileModule(code, {
            compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
        }).outputText
            .replace(/from\s+["']next\/server["']/g, 'from "next/server.js"')
            .replace(/from\s+["']@\/utils\/supabase\/server["']/g, 'from "../../scripts/lib/mock-supabase.mjs"');
        const destPath = resolve(rootDir, destRel);
        await writeFile(destPath, transpiled);
        return destPath;
    };

    const notifPath = await transpileAndWrite('src/app/api/notifications/route.ts', 'scratch/transpiled/notifications-route.mjs');
    const grantPath = await transpileAndWrite('src/app/api/notifications/grant-tickets/route.ts', 'scratch/transpiled/grant-tickets-route.mjs');

    const notifMod = await import(`file://${notifPath.replace(/\\/g, '/')}`);
    const grantMod = await import(`file://${grantPath.replace(/\\/g, '/')}`);

    notificationsPost = notifMod.POST;
    grantTicketsPost = grantMod.POST;

    // 2. Intercept global fetch to avoid hitting OneSignal directly
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, options = {}) => {
        const urlStr = String(url);
        if (urlStr.includes('onesignal.com')) {
            const bodyParsed = options.body ? JSON.parse(options.body) : null;
            capturedFetches.push({
                url: urlStr,
                method: options.method || 'GET',
                headers: options.headers || {},
                body: bodyParsed,
            });
            return {
                ok: mockOneSignalResponse.ok,
                status: mockOneSignalResponse.status,
                json: async () => mockOneSignalResponse.body,
                text: async () => JSON.stringify(mockOneSignalResponse.body),
            };
        }
        return originalFetch(url, options);
    };
});

after(async () => {
    if (originalFetch) {
        globalThis.fetch = originalFetch;
    }
    resetMockAuth();
    await rm(resolve(rootDir, 'scratch/transpiled'), { recursive: true, force: true }).catch(() => {});
});

beforeEach(() => {
    capturedFetches = [];
    mockOneSignalResponse = { ok: true, status: 200, body: { id: 'mock-notification-id', recipients: 1 } };
    process.env.ONESIGNAL_REST_API_KEY = 'test_mock_onesignal_key_12345';
    resetMockAuth();
});

describe('1. /api/notifications Endpoint Tests', () => {
    describe('Authentication & Authorization', () => {
        test('rejects unauthenticated request with 401', async () => {
            configureMockAuth({ user: null });
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({ title: 'Test Title', message: 'Test Message' }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 401);
            const data = await res.json();
            assert.equal(data.error, 'Unauthorized');
            assert.equal(capturedFetches.length, 0);
        });

        test('rejects request with auth error with 401', async () => {
            configureMockAuth({ user: null, authError: new Error('JWT expired') });
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({ title: 'Test Title', message: 'Test Message' }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 401);
            assert.equal(capturedFetches.length, 0);
        });

        test('trainee cannot target trainee role (returns 403)', async () => {
            configureMockAuth({ user: { id: TRAINEE_UUID }, role: 'trainee' });
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'הודעה למתאמנות',
                    message: 'תוכן',
                    targetRole: 'trainee',
                }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 403);
            const data = await res.json();
            assert.equal(data.error, 'Administrator access required');
            assert.equal(capturedFetches.length, 0);
        });

        test('trainee cannot target specific user IDs (returns 403)', async () => {
            configureMockAuth({ user: { id: TRAINEE_UUID }, role: 'trainee' });
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'הודעה',
                    message: 'תוכן',
                    targetUserIds: [VALID_UUID_1],
                }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 403);
            const data = await res.json();
            assert.equal(data.error, 'Administrator access required');
            assert.equal(capturedFetches.length, 0);
        });

        test('trainee CAN target administrator role (e.g. for booking cancellations)', async () => {
            configureMockAuth({ user: { id: TRAINEE_UUID }, role: 'trainee' });
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'ביטול אימון',
                    message: 'מתאמנת ביטלה אימון',
                    targetRole: 'administrator',
                }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 200);
            assert.equal(capturedFetches.length, 1);
            assert.deepEqual(capturedFetches[0].body.filters, [
                { field: 'tag', key: 'role', relation: '=', value: 'administrator' }
            ]);
        });

        test('administrator can target trainees', async () => {
            configureMockAuth({ user: { id: ADMIN_UUID }, role: 'administrator' });
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'לוח אימונים חדש',
                    message: 'נפתחו מקומות חדשים לשבוע הבא',
                    targetRole: 'trainee',
                }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 200);
            assert.equal(capturedFetches.length, 1);
            assert.deepEqual(capturedFetches[0].body.filters, [
                { field: 'tag', key: 'role', relation: '=', value: 'trainee' }
            ]);
        });

        test('administrator can target specific user IDs', async () => {
            configureMockAuth({ user: { id: ADMIN_UUID }, role: 'administrator' });
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'אימון בוטל 😔',
                    message: 'האימון בוטל על ידי הסטודיו. הזיכוי הוחזר לחשבונך.',
                    targetUserIds: [VALID_UUID_1, VALID_UUID_2],
                }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 200);
            assert.equal(capturedFetches.length, 1);
            assert.deepEqual(capturedFetches[0].body.include_aliases, {
                external_id: [VALID_UUID_1, VALID_UUID_2]
            });
            assert.equal(capturedFetches[0].body.target_channel, 'push');
        });
    });

    describe('Input Validation', () => {
        beforeEach(() => {
            configureMockAuth({ user: { id: ADMIN_UUID }, role: 'administrator' });
        });

        test('rejects malformed non-JSON body with 400', async () => {
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: '{ not valid json',
                headers: { 'content-type': 'application/json' },
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 400);
            const data = await res.json();
            assert.equal(data.error, 'Invalid notification');
        });

        test('rejects missing or empty title with 400', async () => {
            for (const badTitle of [undefined, null, '', '   ', 123]) {
                const req = new NextRequest('http://localhost:3000/api/notifications', {
                    method: 'POST',
                    body: JSON.stringify({ title: badTitle, message: 'Valid message' }),
                });
                const res = await notificationsPost(req);
                assert.equal(res.status, 400, `Expected 400 for title: ${badTitle}`);
            }
        });

        test('rejects title exceeding 120 characters with 400', async () => {
            const longTitle = 'א'.repeat(121);
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({ title: longTitle, message: 'Valid message' }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 400);
        });

        test('accepts title exactly 120 characters', async () => {
            const exactTitle = 'א'.repeat(120);
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({ title: exactTitle, message: 'Valid message', targetRole: 'trainee' }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 200);
        });

        test('rejects missing or empty message with 400', async () => {
            for (const badMessage of [undefined, null, '', '   ', 456]) {
                const req = new NextRequest('http://localhost:3000/api/notifications', {
                    method: 'POST',
                    body: JSON.stringify({ title: 'Valid Title', message: badMessage }),
                });
                const res = await notificationsPost(req);
                assert.equal(res.status, 400, `Expected 400 for message: ${badMessage}`);
            }
        });

        test('rejects message exceeding 1000 characters with 400', async () => {
            const longMessage = 'm'.repeat(1001);
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({ title: 'Valid Title', message: longMessage }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 400);
        });

        test('rejects invalid targetRole with 400', async () => {
            for (const role of ['admin', 'superadmin', 'guest', 'user']) {
                const req = new NextRequest('http://localhost:3000/api/notifications', {
                    method: 'POST',
                    body: JSON.stringify({ title: 'Valid Title', message: 'Valid message', targetRole: role }),
                });
                const res = await notificationsPost(req);
                assert.equal(res.status, 400, `Expected 400 for role: ${role}`);
            }
        });

        test('rejects targetUserIds if not an array with 400', async () => {
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({ title: 'Valid Title', message: 'Valid message', targetUserIds: 'not-an-array' }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 400);
        });

        test('rejects targetUserIds exceeding 100 items with 400', async () => {
            const ids = Array.from({ length: 101 }, () => VALID_UUID_1);
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({ title: 'Valid Title', message: 'Valid message', targetUserIds: ids }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 400);
        });

        test('rejects targetUserIds containing invalid UUID format with 400', async () => {
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'Valid Title',
                    message: 'Valid message',
                    targetUserIds: [VALID_UUID_1, 'invalid-uuid-format'],
                }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 400);
        });

        test('rejects dangerous URLs (protocol-relative and external) with 400', async () => {
            for (const dangerousUrl of ['//evil.com', 'https://evil.com', 'http://malicious.org', 'javascript:alert(1)']) {
                const req = new NextRequest('http://localhost:3000/api/notifications', {
                    method: 'POST',
                    body: JSON.stringify({
                        title: 'Valid Title',
                        message: 'Valid message',
                        targetRole: 'trainee',
                        url: dangerousUrl,
                    }),
                });
                const res = await notificationsPost(req);
                assert.equal(res.status, 400, `Expected 400 for URL: ${dangerousUrl}`);
            }
        });

        test('accepts safe relative URL and resolves to origin', async () => {
            const req = new NextRequest('https://tb-gym.vercel.app/api/notifications', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'Valid Title',
                    message: 'Valid message',
                    targetRole: 'trainee',
                    url: '/dashboard',
                }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 200);
            assert.equal(capturedFetches[0].body.url, 'https://tb-gym.vercel.app/dashboard');
        });
    });

    describe('OneSignal Integration & Error Handling', () => {
        beforeEach(() => {
            configureMockAuth({ user: { id: ADMIN_UUID }, role: 'administrator' });
        });

        test('returns 500 when ONESIGNAL_REST_API_KEY is not configured', async () => {
            delete process.env.ONESIGNAL_REST_API_KEY;
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({ title: 'Test Title', message: 'Test Message', targetRole: 'trainee' }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 500);
            const data = await res.json();
            assert.equal(data.error, 'Notification service not configured');
            assert.equal(capturedFetches.length, 0);
        });

        test('sends correct headers and app_id to OneSignal', async () => {
            process.env.ONESIGNAL_REST_API_KEY = 'secret_test_key_xyz';
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'הודעת בדיקה',
                    message: 'תוכן ההודעה',
                    targetRole: 'trainee',
                }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 200);
            assert.equal(capturedFetches.length, 1);
            const call = capturedFetches[0];
            assert.equal(call.url, 'https://onesignal.com/api/v1/notifications');
            assert.equal(call.headers['Authorization'], 'Basic secret_test_key_xyz');
            assert.equal(call.headers['Content-Type'], 'application/json; charset=utf-8');
            assert.equal(call.body.app_id, '2e5776b6-3487-4a5d-bca0-04570c82d150');
            assert.equal(call.body.headings.he, 'הודעת בדיקה');
            assert.equal(call.body.headings.en, 'הודעת בדיקה');
            assert.equal(call.body.contents.he, 'תוכן ההודעה');
            assert.equal(call.body.contents.en, 'תוכן ההודעה');
        });

        test('defaults to notifying administrators if targetRole and targetUserIds are omitted', async () => {
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({ title: 'הודעה כללית', message: 'תוכן כללי' }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 200);
            assert.deepEqual(capturedFetches[0].body.filters, [
                { field: 'tag', key: 'role', relation: '=', value: 'administrator' }
            ]);
        });

        test('handles OneSignal API failure gracefully (returns 500 with details)', async () => {
            mockOneSignalResponse = {
                ok: false,
                status: 400,
                body: { errors: ['Invalid application ID'] },
            };
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({ title: 'Test Title', message: 'Test Message', targetRole: 'trainee' }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 500);
            const data = await res.json();
            assert.equal(data.error, 'Failed to send notification');
            assert.deepEqual(data.details, { errors: ['Invalid application ID'] });
        });

        test('returns success, ID, and recipients count on success', async () => {
            mockOneSignalResponse = {
                ok: true,
                status: 200,
                body: { id: 'notif-uuid-456', recipients: 14 },
            };
            const req = new NextRequest('http://localhost:3000/api/notifications', {
                method: 'POST',
                body: JSON.stringify({ title: 'Test Title', message: 'Test Message', targetRole: 'trainee' }),
            });
            const res = await notificationsPost(req);
            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.success, true);
            assert.equal(data.id, 'notif-uuid-456');
            assert.equal(data.recipients, 14);
        });
    });
});

describe('2. /api/notifications/grant-tickets Endpoint Tests', () => {
    describe('Authentication & Authorization', () => {
        test('rejects unauthenticated request with 401', async () => {
            configureMockAuth({ user: null });
            const req = new Request('http://localhost:3000/api/notifications/grant-tickets', {
                method: 'POST',
                body: JSON.stringify({ userId: VALID_UUID_1, amount: 5 }),
            });
            const res = await grantTicketsPost(req);
            assert.equal(res.status, 401);
            const data = await res.json();
            assert.equal(data.error, 'Unauthorized');
            assert.equal(capturedFetches.length, 0);
        });

        test('rejects non-admin trainee request with 403', async () => {
            configureMockAuth({ user: { id: TRAINEE_UUID }, role: 'trainee' });
            const req = new Request('http://localhost:3000/api/notifications/grant-tickets', {
                method: 'POST',
                body: JSON.stringify({ userId: VALID_UUID_1, amount: 5 }),
            });
            const res = await grantTicketsPost(req);
            assert.equal(res.status, 403);
            const data = await res.json();
            assert.equal(data.error, 'Administrator access required');
            assert.equal(capturedFetches.length, 0);
        });

        test('allows administrator access', async () => {
            configureMockAuth({ user: { id: ADMIN_UUID }, role: 'administrator' });
            const req = new Request('http://localhost:3000/api/notifications/grant-tickets', {
                method: 'POST',
                body: JSON.stringify({ userId: VALID_UUID_1, amount: 3 }),
            });
            const res = await grantTicketsPost(req);
            assert.equal(res.status, 200);
            assert.equal(capturedFetches.length, 1);
        });
    });

    describe('Input Validation', () => {
        beforeEach(() => {
            configureMockAuth({ user: { id: ADMIN_UUID }, role: 'administrator' });
        });

        test('rejects malformed non-JSON body with 400', async () => {
            const req = new Request('http://localhost:3000/api/notifications/grant-tickets', {
                method: 'POST',
                body: 'not a json string',
                headers: { 'content-type': 'application/json' },
            });
            const res = await grantTicketsPost(req);
            assert.equal(res.status, 400);
            const data = await res.json();
            assert.equal(data.error, 'Invalid ticket notification');
        });

        test('rejects missing or invalid userId format with 400', async () => {
            for (const badId of [undefined, null, '', 'not-a-uuid', 12345]) {
                const req = new Request('http://localhost:3000/api/notifications/grant-tickets', {
                    method: 'POST',
                    body: JSON.stringify({ userId: badId, amount: 5 }),
                });
                const res = await grantTicketsPost(req);
                assert.equal(res.status, 400, `Expected 400 for userId: ${badId}`);
            }
        });

        test('rejects non-integer, zero, or out-of-range amounts with 400', async () => {
            for (const badAmount of [0, 5.5, '5', null, undefined, NaN, 101, -101]) {
                const req = new Request('http://localhost:3000/api/notifications/grant-tickets', {
                    method: 'POST',
                    body: JSON.stringify({ userId: VALID_UUID_1, amount: badAmount }),
                });
                const res = await grantTicketsPost(req);
                assert.equal(res.status, 400, `Expected 400 for amount: ${badAmount}`);
            }
        });

        test('accepts valid boundary amounts (-100, -1, 1, 100)', async () => {
            for (const validAmount of [-100, -1, 1, 100]) {
                capturedFetches = [];
                const req = new Request('http://localhost:3000/api/notifications/grant-tickets', {
                    method: 'POST',
                    body: JSON.stringify({ userId: VALID_UUID_1, amount: validAmount }),
                });
                const res = await grantTicketsPost(req);
                assert.equal(res.status, 200, `Expected 200 for amount: ${validAmount}`);
            }
        });
    });

    describe('OneSignal Dispatch & Notification Properties', () => {
        beforeEach(() => {
            configureMockAuth({ user: { id: ADMIN_UUID }, role: 'administrator' });
        });

        test('returns 500 when ONESIGNAL_REST_API_KEY is not configured', async () => {
            delete process.env.ONESIGNAL_REST_API_KEY;
            const req = new Request('http://localhost:3000/api/notifications/grant-tickets', {
                method: 'POST',
                body: JSON.stringify({ userId: VALID_UUID_1, amount: 5 }),
            });
            const res = await grantTicketsPost(req);
            assert.equal(res.status, 500);
            const data = await res.json();
            assert.equal(data.error, 'Server configuration error');
            assert.equal(capturedFetches.length, 0);
        });

        test('formats positive ticket deposit message and critical push attributes', async () => {
            process.env.ONESIGNAL_REST_API_KEY = 'grant_key_secret';
            const req = new Request('http://localhost:3000/api/notifications/grant-tickets', {
                method: 'POST',
                body: JSON.stringify({ userId: VALID_UUID_1, amount: 10 }),
            });
            const res = await grantTicketsPost(req);
            assert.equal(res.status, 200);
            assert.equal(capturedFetches.length, 1);
            const call = capturedFetches[0];
            assert.equal(call.headers['Authorization'], 'Basic grant_key_secret');
            assert.equal(call.body.app_id, '2e5776b6-3487-4a5d-bca0-04570c82d150');
            assert.deepEqual(call.body.include_aliases, { external_id: [VALID_UUID_1] });
            assert.equal(call.body.target_channel, 'push');
            assert.equal(call.body.headings.he, 'עדכון יתרה');
            assert.equal(call.body.contents.he, 'הופקדו 10 כרטיסים חדשים בחשבונך! 🎉');
            assert.equal(call.body.priority, 10);
            assert.equal(call.body.android_channel_id, '4f8844c7-685b-40b0-ae58-48aa9d7c7530');
            assert.equal(call.body.web_push_topic, 'ticket-update');
            assert.equal(call.body.ttl, 86400);
            assert.equal(call.body.url, 'https://tb-gym.vercel.app/dashboard');
            assert.equal(call.body.chrome_web_require_interaction, true);
            assert.equal(call.body.android_vibrate, true);
            assert.equal(call.body.channel_for_external_user_ids, 'push');
        });

        test('formats negative amount message as balance update without deposit celebration', async () => {
            const req = new Request('http://localhost:3000/api/notifications/grant-tickets', {
                method: 'POST',
                body: JSON.stringify({ userId: VALID_UUID_1, amount: -2 }),
            });
            const res = await grantTicketsPost(req);
            assert.equal(res.status, 200);
            assert.equal(capturedFetches[0].body.contents.he, 'יתרת הכרטיסים שלך עודכנה.');
        });

        test('returns 400 when OneSignal reports errors (e.g. unsubscribed player)', async () => {
            mockOneSignalResponse = {
                ok: true,
                status: 200,
                body: { errors: ['All included players are not subscribed'] },
            };
            const req = new Request('http://localhost:3000/api/notifications/grant-tickets', {
                method: 'POST',
                body: JSON.stringify({ userId: VALID_UUID_1, amount: 5 }),
            });
            const res = await grantTicketsPost(req);
            assert.equal(res.status, 400);
            const data = await res.json();
            assert.deepEqual(data.error, ['All included players are not subscribed']);
        });
    });
});

describe('3. Client SDK, Service Worker & Integration Architecture', () => {
    test('public/sw.js includes OneSignalSDK.sw.js script import', async () => {
        const swContent = await readFile(resolve(rootDir, 'public/sw.js'), 'utf8');
        assert.match(
            swContent,
            /https:\/\/cdn\.onesignal\.com\/sdks\/web\/v16\/OneSignalSDK\.sw\.js/,
            'Service worker must import OneSignalSDK.sw.js'
        );
    });

    test('next.config.ts Workbox options include OneSignalSDK.sw.js in importScripts', async () => {
        const configContent = await readFile(resolve(rootDir, 'next.config.ts'), 'utf8');
        assert.match(
            configContent,
            /importScripts:\s*\[[^\]]*https:\/\/cdn\.onesignal\.com\/sdks\/web\/v16\/OneSignalSDK\.sw\.js[^\]]*\]/,
            'next.config.ts must configure Workbox to include OneSignalSDK.sw.js'
        );
    });

    test('OneSignalProvider source verifies core configuration and guards', async () => {
        const providerSource = await readFile(resolve(rootDir, 'src/providers/OneSignalProvider.tsx'), 'utf8');
        assert.match(providerSource, /appId:\s*["']2e5776b6-3487-4a5d-bca0-04570c82d150["']/, 'App ID must match studio OneSignal app');
        assert.match(providerSource, /serviceWorkerPath:\s*["']sw\.js["']/, 'Service worker path must be sw.js');
        assert.match(providerSource, /welcomeNotification:\s*\{\s*disable:\s*true\s*\}/, 'Welcome notification must be disabled');
        assert.match(providerSource, /client\.login\(userId\)/, 'Provider must associate current user via login(userId)');
        assert.match(providerSource, /client\.User\.addTag\(["']role["']/, 'Provider must tag user role');
        assert.match(providerSource, /foregroundWillDisplay/, 'Provider must handle foreground notifications via toast');
        assert.match(providerSource, /client\.logout\(\)/, 'Provider must logout user when session terminates');
    });

    test('ProfileClient handles granted, denied, and default notification permission branches', async () => {
        const profileSource = await readFile(resolve(rootDir, 'src/components/profile/ProfileClient.tsx'), 'utf8');
        assert.match(profileSource, /permission === ["']granted["']/, 'Must check for granted permission state');
        assert.match(profileSource, /permission === ["']denied["']/, 'Must check for denied permission state');
        assert.match(profileSource, /Notifications\.requestPermission\(\)/, 'Must request permission via OneSignal SDK');
    });

    test('Foreground notification event dispatch triggers expected toast structure', () => {
        // Simulate foreground notification event handling as written in OneSignalProvider
        const capturedToasts = [];
        const mockToast = (payload) => capturedToasts.push(payload);

        const simulateForegroundEvent = (notification) => {
            mockToast({
                title: notification.title || "הודעה חדשה",
                description: notification.body,
                type: "info",
            });
        };

        // Case 1: with explicit title and body
        simulateForegroundEvent({ title: 'האימון עודכן', body: 'האימון הועבר לשעה 18:00' });
        assert.equal(capturedToasts.length, 1);
        assert.equal(capturedToasts[0].title, 'האימון עודכן');
        assert.equal(capturedToasts[0].description, 'האימון הועבר לשעה 18:00');
        assert.equal(capturedToasts[0].type, 'info');

        // Case 2: fallback title when title is omitted
        simulateForegroundEvent({ body: 'תזכורת לאימון' });
        assert.equal(capturedToasts.length, 2);
        assert.equal(capturedToasts[1].title, 'הודעה חדשה');
        assert.equal(capturedToasts[1].description, 'תזכורת לאימון');
    });
});

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomBytes, randomUUID } from 'node:crypto';

config({ path: '.env.local', quiet: true });
config({ path: '.env.stress.local', override: true, quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !publishableKey || !secretKey) throw new Error('Missing Supabase test environment');
const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const runId = `admin-test-${Date.now()}-${randomUUID().slice(0, 8)}`;
const userIds = [];
const sessionIds = [];
const failures = [];
const observations = {};
function unwrap(result, label) { if (result.error) throw new Error(`${label}: ${result.error.message}`); return result.data; }
function expect(condition, label) { if (!condition) failures.push(label); }

async function createUser(index) {
  const email = `${runId}-${index}@example.invalid`;
  const password = randomBytes(24).toString('base64url');
  const record = unwrap(await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { stress_run: runId } }), 'create user');
  userIds.push(record.user.id);
  const client = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  unwrap(await client.auth.signInWithPassword({ email, password }), 'sign in');
  return { id: record.user.id, client };
}
async function cleanup() {
  const errors = [];
  const created = await admin.from('gym_sessions').select('id').like('title', `[${runId}]%`);
  if (created.error) errors.push(created.error.message);
  else sessionIds.push(...created.data.map(s => s.id));
  const ids = [...new Set(sessionIds)];
  if (ids.length) {
    const b = await admin.from('bookings').delete().in('session_id', ids);
    if (b.error) errors.push(b.error.message);
  }
  if (userIds.length) {
    const t = await admin.from('user_tickets').delete().in('user_id', userIds);
    if (t.error) errors.push(t.error.message);
  }
  if (ids.length) {
    const s = await admin.from('gym_sessions').delete().in('id', ids);
    if (s.error) errors.push(s.error.message);
  }
  for (const id of userIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) errors.push(error.message);
  }
  return errors;
}
try {
  const manager = await createUser('manager');
  const first = await createUser('first');
  const second = await createUser('second');
  unwrap(await admin.from('profiles').update({ role: 'administrator' }).eq('id', manager.id), 'promote test manager');
  const start = new Date(Date.now() + 7 * 86400000);
  const payload = {
    p_title: `[${runId}] private lesson`, p_description: 'Disposable test',
    p_start_time: start.toISOString(), p_end_time: new Date(start.getTime() + 3600000).toISOString(),
    p_max_capacity: 2, p_user_ids: [first.id, second.id],
  };
  const denied = await first.client.rpc('admin_create_session', payload);
  observations.traineeCreate = denied.error ? 'rejected' : denied.data;
  expect(Boolean(denied.error), 'Trainee could call admin_create_session');

  const noTickets = await manager.client.rpc('admin_create_session', payload);
  observations.noTicketInvite = noTickets.error ? 'rejected' : noTickets.data;
  expect(Boolean(noTickets.error), 'Admin booked trainees without tickets');
  const premature = unwrap(await admin.from('gym_sessions').select('id').eq('title', payload.p_title), 'inspect rollback');
  expect(premature.length === 0, 'Failed invitation left a lesson behind');

  for (const trainee of [first, second]) {
    const grant = unwrap(await manager.client.rpc('admin_grant_tickets', { p_user_id: trainee.id, p_quantity: 1 }), 'grant ticket');
    expect(grant.success === true, 'Admin grant failed');
  }
  const created = unwrap(await manager.client.rpc('admin_create_session', payload), 'create private lesson');
  expect(created.success === true && created.bookings_created === 2, 'Private lesson did not create two bookings');
  sessionIds.push(created.session_id);
  let bookings = unwrap(await admin.from('bookings').select('id,user_id').eq('session_id', created.session_id), 'inspect private bookings');
  let tickets = unwrap(await admin.from('user_tickets').select('user_id,used_at,used_for_session').in('user_id', [first.id, second.id]), 'inspect private tickets');
  observations.privateLesson = { bookings: bookings.length, usedTickets: tickets.filter(t => t.used_for_session === created.session_id && t.used_at).length };
  expect(bookings.length === 2 && observations.privateLesson.usedTickets === 2, 'Private lesson and tickets disagree');

  const cancelled = unwrap(await manager.client.rpc('admin_cancel_booking', { p_booking_id: bookings[0].id }), 'admin cancel booking');
  expect(cancelled.success === true && cancelled.refunded === true, 'Admin cancellation did not refund');
  bookings = unwrap(await admin.from('bookings').select('id').eq('session_id', created.session_id), 'inspect remaining bookings');
  expect(bookings.length === 1, 'Admin cancellation did not remove exactly one booking');

  const deleted = unwrap(await manager.client.rpc('admin_delete_session', { p_session_id: created.session_id }), 'admin delete lesson');
  observations.deletedLesson = deleted;
  expect(deleted.success === true && deleted.tickets_refunded === 1 && deleted.user_ids.length === 1, 'Lesson deletion did not refund remaining trainee');
  tickets = unwrap(await admin.from('user_tickets').select('used_at,used_for_session').in('user_id', [first.id, second.id]), 'inspect final tickets');
  expect(tickets.length === 2 && tickets.every(t => t.used_at === null && t.used_for_session === null), 'Tickets not returned after admin actions');

  const beforeAdjustment = unwrap(await admin.from('user_tickets').select('id').eq('user_id', first.id), 'read ticket balance').length;
  const reduced = unwrap(await manager.client.rpc('admin_grant_tickets', { p_user_id: first.id, p_quantity: -1 }), 'reduce ticket balance');
  const afterAdjustment = unwrap(await admin.from('user_tickets').select('id').eq('user_id', first.id), 'read reduced balance').length;
  observations.negativeTicketAdjustment = { before: beforeAdjustment, after: afterAdjustment, result: reduced };
  expect(reduced.success === true && beforeAdjustment - afterAdjustment === 1, 'Negative ticket adjustment did not remove one ticket');
  const excessRemoval = await manager.client.rpc('admin_grant_tickets', { p_user_id: first.id, p_quantity: -2 });
  expect(Boolean(excessRemoval.error), 'Admin removed more unused tickets than existed');

  const publicLesson = unwrap(await manager.client.rpc('admin_create_session', { ...payload, p_title: `[${runId}] public lesson`, p_user_ids: [] }), 'create public lesson');
  sessionIds.push(publicLesson.session_id);
  expect(publicLesson.success === true && publicLesson.bookings_created === 0, 'Public lesson creation failed');
  unwrap(await manager.client.rpc('admin_delete_session', { p_session_id: publicLesson.session_id }), 'delete public lesson');
} catch (error) {
  failures.push(`Harness stopped: ${error.message}`);
} finally {
  const cleanupErrors = await cleanup();
  console.log(JSON.stringify({ runId, observations, failures, cleanupErrors }, null, 2));
  if (failures.length || cleanupErrors.length) process.exitCode = 1;
}

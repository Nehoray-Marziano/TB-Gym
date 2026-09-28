import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomBytes, randomUUID } from 'node:crypto';

config({ path: '.env.local', quiet: true });
config({ path: '.env.stress.local', override: true, quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !publicKey || !secretKey) throw new Error('Missing Supabase test environment');
const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const runId = `edge-${Date.now()}-${randomUUID().slice(0, 8)}`;
const userIds = [];
const sessionIds = [];
const failures = [];
const observations = {};

function unwrap(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}
function expect(condition, message) { if (!condition) failures.push(message); }
async function user(index) {
  const email = `${runId}-${index}@example.invalid`;
  const password = randomBytes(24).toString('base64url');
  const created = unwrap(await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { stress_run: runId } }), 'create user');
  userIds.push(created.user.id);
  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  unwrap(await client.auth.signInWithPassword({ email, password }), 'sign in');
  return { id: created.user.id, client };
}
async function session(label, startHours) {
  const start = new Date(Date.now() + startHours * 3600000);
  const created = unwrap(await admin.from('gym_sessions').insert({
    title: `[${runId}] ${label}`, start_time: start.toISOString(), end_time: new Date(start.getTime() + 3600000).toISOString(), max_capacity: 2,
  }).select('id').single(), 'create session');
  sessionIds.push(created.id);
  return created.id;
}
async function cleanup() {
  const errors = [];
  if (sessionIds.length) {
    const b = await admin.from('bookings').delete().in('session_id', sessionIds);
    if (b.error) errors.push(`bookings: ${b.error.message}`);
  }
  if (userIds.length) {
    const t = await admin.from('user_tickets').delete().in('user_id', userIds);
    if (t.error) errors.push(`tickets: ${t.error.message}`);
    const s = await admin.from('user_subscriptions').delete().in('user_id', userIds);
    if (s.error) errors.push(`subscriptions: ${s.error.message}`);
  }
  if (sessionIds.length) {
    const s = await admin.from('gym_sessions').delete().in('id', sessionIds);
    if (s.error) errors.push(`sessions: ${s.error.message}`);
  }
  for (const id of userIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) errors.push(`auth user: ${error.message}`);
  }
  return errors;
}

try {
  const trainee = await user(1);
  const twin = await user(2);
  const [first, second, soon, past] = await Promise.all([
    session('first', 72), session('second', 96), session('soon', 5), session('past', -2),
  ]);
  unwrap(await admin.from('user_tickets').insert({ user_id: trainee.id, source: 'admin', expires_at: new Date(Date.now() + 30 * 86400000).toISOString() }), 'grant ticket');

  const pair = await Promise.all([first, second].map(p_session_id => trainee.client.rpc('book_session', { p_session_id })));
  const twinBookings = unwrap(await admin.from('bookings').select('id').eq('user_id', trainee.id).in('session_id', [first, second]), 'inspect double spend');
  const used = unwrap(await admin.from('user_tickets').select('id,used_at').eq('user_id', trainee.id), 'inspect ticket');
  observations.oneTicketTwoLessons = { successes: pair.filter(r => r.data?.success).length, bookings: twinBookings.length, usedTickets: used.filter(t => t.used_at).length };
  expect(observations.oneTicketTwoLessons.successes === 1 && twinBookings.length === 1 && used.filter(t => t.used_at).length === 1, 'One ticket was spent on multiple lessons');

  const soonBooking = unwrap(await admin.from('bookings').insert({ user_id: twin.id, session_id: soon, status: 'confirmed' }).select('id').single(), 'seed near-term booking');
  const soonCancel = await twin.client.rpc('cancel_booking', { p_session_id: soon });
  observations.cancelFiveHoursBefore = soonCancel.error?.message || soonCancel.data;
  expect(Boolean(soonCancel.error) || soonCancel.data?.success === false, 'Trainee cancelled within the advertised 10-hour cutoff');
  await admin.from('bookings').delete().eq('id', soonBooking.id);

  unwrap(await admin.from('bookings').insert({ user_id: twin.id, session_id: past, status: 'confirmed' }), 'seed past booking');
  const pastCancel = await twin.client.rpc('cancel_booking', { p_session_id: past });
  observations.cancelAfterClass = pastCancel.error?.message || pastCancel.data;
  expect(Boolean(pastCancel.error) || pastCancel.data?.success === false, 'Trainee cancelled a past lesson');

  const purchase = await twin.client.rpc('purchase_subscription', { p_tier_id: 1 });
  observations.unverifiedPurchase = purchase.error?.message || purchase.data;
  expect(Boolean(purchase.error) || purchase.data?.success === false, 'Trainee acquired subscription tickets without verified payment');

  const roleChange = await twin.client.from('profiles').update({ role: 'administrator' }).eq('id', twin.id).select('role').single();
  observations.selfPromotion = roleChange.error?.message || roleChange.data;
  expect(Boolean(roleChange.error) || roleChange.data?.role !== 'administrator', 'Trainee promoted their own profile to administrator');
} catch (error) {
  failures.push(`Harness stopped: ${error.message}`);
} finally {
  const cleanupErrors = await cleanup();
  console.log(JSON.stringify({ runId, observations, failures, cleanupErrors }, null, 2));
  if (failures.length || cleanupErrors.length) process.exitCode = 1;
}

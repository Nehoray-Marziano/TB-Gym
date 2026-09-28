import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomBytes, randomUUID } from 'node:crypto';

config({ path: '.env.local', quiet: true });
config({ path: '.env.stress.local', override: true, quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !publishableKey || !secretKey) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SECRET_KEY');
}

const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const createTraineeClient = () => createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
const runId = `stress-${Date.now()}-${randomUUID().slice(0, 8)}`;
const userCount = Math.min(30, Math.max(2, Number(process.argv[2] || 12)));
const capacity = Math.max(1, Math.min(userCount - 1, Number(process.argv[3] || 3)));
const createdUserIds = [];
let sessionId;
const failures = [];
const observations = {};

function requireData(result, context) {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data;
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

async function cleanup() {
  const errors = [];
  const { error: extraSessionError } = await admin.from('gym_sessions').delete().eq('title', `[${runId}] forbidden`);
  if (extraSessionError) errors.push(`extra gym session: ${extraSessionError.message}`);
  if (sessionId) {
    for (const [table, query] of [
      ['bookings', admin.from('bookings').delete().eq('session_id', sessionId)],
      ['gym_sessions', admin.from('gym_sessions').delete().eq('id', sessionId)],
    ]) {
      const { error } = await query;
      if (error) errors.push(`${table}: ${error.message}`);
    }
  }
  if (createdUserIds.length) {
    const { error } = await admin.from('user_tickets').delete().in('user_id', createdUserIds);
    if (error) errors.push(`user_tickets: ${error.message}`);
  }
  for (const id of createdUserIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) errors.push(`auth user ${id}: ${error.message}`);
  }
  return errors;
}

try {
  console.log(`Run ${runId}: ${userCount} trainees, ${capacity} spots`);
  const trainees = [];
  for (let i = 0; i < userCount; i++) {
    const email = `${runId}-${i}@example.invalid`;
    const password = randomBytes(24).toString('base64url');
    const created = requireData(await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Stress Trainee ${i}`, stress_run: runId },
    }), `create user ${i}`);
    createdUserIds.push(created.user.id);
    const client = createTraineeClient();
    requireData(await client.auth.signInWithPassword({ email, password }), `sign in user ${i}`);
    trainees.push({ id: created.user.id, client });
  }
  observations.createdUsers = trainees.length;

  const profileRows = requireData(await admin.from('profiles').select('id').in('id', createdUserIds), 'read profiles');
  assert(profileRows.length === userCount, `Only ${profileRows.length}/${userCount} profiles were created`);

  const start = new Date(Date.now() + 7 * 86400000);
  const end = new Date(start.getTime() + 60 * 60000);
  const session = requireData(await admin.from('gym_sessions').insert({
    title: `[${runId}] concurrency test`,
    description: 'Disposable automated booking test',
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    max_capacity: capacity,
  }).select('id').single(), 'create session');
  sessionId = session.id;

  requireData(await admin.from('user_tickets').insert(trainees.map(({ id }) => ({
    user_id: id,
    source: 'admin',
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
  }))), 'grant test tickets');

  const outsider = trainees[1];
  const noOtherTickets = requireData(await outsider.client.from('user_tickets').select('id').eq('user_id', trainees[0].id), 'RLS ticket read');
  assert(noOtherTickets.length === 0, 'A trainee can read another trainee\'s tickets');
  const adminInsert = await outsider.client.from('gym_sessions').insert({
    title: `[${runId}] forbidden`, start_time: start.toISOString(), end_time: end.toISOString(), max_capacity: 1,
  }).select('id');
  observations.traineeSessionInsert = adminInsert.error ? 'rejected' : 'accepted';
  assert(Boolean(adminInsert.error), 'A trainee can create a gym session');

  const started = performance.now();
  const bookingResults = await Promise.all(trainees.map(async ({ client }) => {
    const { data, error } = await client.rpc('book_session', { p_session_id: sessionId });
    return { success: Boolean(data?.success), error: error?.message, message: data?.message };
  }));
  observations.bookingMilliseconds = Math.round(performance.now() - started);
  observations.rpcSuccesses = bookingResults.filter(r => r.success).length;
  observations.rpcErrors = bookingResults.filter(r => r.error).map(r => r.error);

  const bookings = requireData(await admin.from('bookings').select('id,user_id,status').eq('session_id', sessionId), 'inspect bookings');
  const tickets = requireData(await admin.from('user_tickets').select('id,user_id,used_at,used_for_session').in('user_id', createdUserIds), 'inspect tickets');
  const confirmed = bookings.filter(b => b.status === 'confirmed');
  observations.confirmedBookings = confirmed.length;
  observations.consumedTickets = tickets.filter(t => t.used_for_session === sessionId && t.used_at).length;
  assert(confirmed.length <= capacity, `Oversubscribed: ${confirmed.length} confirmed for ${capacity} spots`);
  assert(confirmed.length === observations.rpcSuccesses, 'RPC successes differ from confirmed bookings');
  assert(observations.consumedTickets === confirmed.length, 'Ticket use differs from confirmed bookings');
  assert(new Set(confirmed.map(b => b.user_id)).size === confirmed.length, 'Duplicate confirmed booking');

  const winner = trainees.find(t => confirmed.some(b => b.user_id === t.id));
  if (winner) {
    const retry = await winner.client.rpc('book_session', { p_session_id: sessionId });
    assert(!retry.error && retry.data?.success === false, 'Duplicate booking was accepted');
    observations.duplicateBooking = retry.data?.success === false ? 'rejected' : 'accepted';
    const cancelled = await winner.client.rpc('cancel_booking', { p_session_id: sessionId });
    assert(!cancelled.error && cancelled.data?.success === true, `Cancellation failed: ${cancelled.error?.message || cancelled.data?.message}`);
    const returned = requireData(await admin.from('user_tickets').select('used_at,used_for_session').eq('user_id', winner.id), 'inspect refund');
    assert(returned.length === 1 && returned[0].used_at === null && returned[0].used_for_session === null, 'Cancellation did not refund ticket');
    observations.cancellationRefunded = returned.length === 1 && returned[0].used_at === null && returned[0].used_for_session === null;
    const rebooked = await winner.client.rpc('book_session', { p_session_id: sessionId });
    assert(!rebooked.error && rebooked.data?.success === true, `Rebooking failed: ${rebooked.error?.message || rebooked.data?.message}`);
    observations.rebooked = rebooked.data?.success === true;
  }

  const zeroTicketUser = trainees.find(t => !confirmed.some(b => b.user_id === t.id));
  if (zeroTicketUser) {
    requireData(await admin.from('user_tickets').delete().eq('user_id', zeroTicketUser.id), 'remove unused test ticket');
    const noTicketBooking = await zeroTicketUser.client.rpc('book_session', { p_session_id: sessionId });
    assert(!noTicketBooking.error && noTicketBooking.data?.success === false, 'Booking RPC accepted a trainee with no ticket');
    observations.noTicketRpc = noTicketBooking.data?.success === false ? 'rejected' : 'accepted';
    const { error } = await zeroTicketUser.client.from('bookings').insert({ user_id: zeroTicketUser.id, session_id: sessionId, status: 'confirmed' });
    observations.directInsertWithoutTicket = error ? 'rejected' : 'accepted';
    assert(Boolean(error), 'Direct booking insert bypassed ticket and capacity checks');
  }

  const visible = requireData(await trainees[0].client.from('bookings').select('user_id').eq('session_id', sessionId), 'RLS booking read');
  assert(visible.every(b => b.user_id === trainees[0].id), 'A trainee can read another trainee\'s booking');
  observations.otherUsersBookingsVisible = visible.filter(b => b.user_id !== trainees[0].id).length;
} catch (error) {
  failures.push(`Harness stopped: ${error.message}`);
} finally {
  const cleanupErrors = await cleanup();
  observations.cleanupErrors = cleanupErrors;
  console.log(JSON.stringify({ runId, observations, failures }, null, 2));
  if (failures.length || cleanupErrors.length) process.exitCode = 1;
}

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomBytes, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

config({ path: '.env.local', quiet: true });
config({ path: '.env.stress.local', override: true, quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !publishableKey || !secretKey) {
  console.error('Missing Supabase test credentials in environment files');
  process.exit(1);
}

const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const createAnonClient = () => createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });

const runBatchId = `concurrency-${Date.now()}-${randomUUID().slice(0, 6)}`;
const allCreatedUserIds = [];
const allCreatedSessionIds = [];

function unwrap(result, context) {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data;
}

async function createTestUsers(count, prefix) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const email = `${runBatchId}-${prefix}-${i}@example.invalid`;
    const password = randomBytes(24).toString('base64url');
    const created = unwrap(
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `Concurrent User ${prefix}-${i}`, run_id: runBatchId },
      }),
      `create user ${prefix}-${i}`
    );
    allCreatedUserIds.push(created.user.id);

    const client = createAnonClient();
    unwrap(await client.auth.signInWithPassword({ email, password }), `sign in ${prefix}-${i}`);
    users.push({ id: created.user.id, email, client });
  }

  // Grant tickets to all created users
  unwrap(
    await admin.from('user_tickets').insert(
      users.map(u => ({
        user_id: u.id,
        source: 'admin',
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      }))
    ),
    `grant tickets ${prefix}`
  );

  return users;
}

async function createTestSession(title, capacity, hoursFromNow = 72) {
  const start = new Date(Date.now() + hoursFromNow * 3600000);
  const end = new Date(start.getTime() + 60 * 60000);
  const session = unwrap(
    await admin.from('gym_sessions').insert({
      title: `[${runBatchId}] ${title}`,
      description: 'Automated Concurrency Test Lesson',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      max_capacity: capacity,
    }).select('id, title, max_capacity, start_time').single(),
    `create session "${title}"`
  );
  allCreatedSessionIds.push(session.id);
  return session;
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test artifacts...');
  const errors = [];

  if (allCreatedSessionIds.length) {
    const { error: bErr } = await admin.from('bookings').delete().in('session_id', allCreatedSessionIds);
    if (bErr) errors.push(`bookings: ${bErr.message}`);

    const { error: sErr } = await admin.from('gym_sessions').delete().in('id', allCreatedSessionIds);
    if (sErr) errors.push(`gym_sessions: ${sErr.message}`);
  }

  if (allCreatedUserIds.length) {
    const { error: tErr } = await admin.from('user_tickets').delete().in('user_id', allCreatedUserIds);
    if (tErr) errors.push(`user_tickets: ${tErr.message}`);

    for (const uid of allCreatedUserIds) {
      const { error: uErr } = await admin.auth.admin.deleteUser(uid);
      if (uErr) errors.push(`user ${uid}: ${uErr.message}`);
    }
  }

  if (errors.length) {
    console.error('Cleanup encountered errors:', errors);
  } else {
    console.log('✨ Cleanup completed successfully.');
  }
}

const scenarioResults = [];

async function runScenario1() {
  console.log('\n========================================================================');
  console.log('🧪 SCENARIO 1: 4 concurrent users attempting to book 2 spots on the same lesson');
  console.log('========================================================================');
  const session = await createTestSession('Lesson 2-Cap / 4 Users', 2);
  const users = await createTestUsers(4, 'sc1');

  const start = performance.now();
  const responses = await Promise.all(
    users.map(async (u, idx) => {
      const reqStart = performance.now();
      const res = await u.client.rpc('book_session', { p_session_id: session.id });
      const duration = Math.round(performance.now() - reqStart);
      return { userIndex: idx, res, duration };
    })
  );
  const totalDuration = Math.round(performance.now() - start);

  const successes = responses.filter(r => r.res.data?.success === true);
  const rejections = responses.filter(r => r.res.data?.success === false);
  const errors = responses.filter(r => r.res.error);

  // Verify in database
  const dbBookings = unwrap(
    await admin.from('bookings').select('id, user_id, status').eq('session_id', session.id),
    'verify db bookings'
  );
  const confirmed = dbBookings.filter(b => b.status === 'confirmed');

  const tickets = unwrap(
    await admin.from('user_tickets').select('user_id, used_at, used_for_session').in('user_id', users.map(u => u.id)),
    'verify tickets'
  );
  const usedTickets = tickets.filter(t => t.used_for_session === session.id && t.used_at !== null);

  const passed =
    successes.length === 2 &&
    rejections.length === 2 &&
    errors.length === 0 &&
    confirmed.length === 2 &&
    usedTickets.length === 2;

  console.log(`⏱️ Total Time: ${totalDuration}ms`);
  console.log(`✅ Successes (Booked): ${successes.length} / 4`);
  console.log(`🚫 Rejections (Capacity Exceeded): ${rejections.length} / 4`);
  console.log(`📋 DB Confirmed Bookings: ${confirmed.length} (Max Capacity: ${session.max_capacity})`);
  console.log(`🎟️ Tickets Consumed: ${usedTickets.length} / 4`);

  rejections.forEach((r, i) => {
    console.log(`   - Rejected user ${r.userIndex} reason: "${r.res.data?.message}"`);
  });

  scenarioResults.push({
    name: '4 Concurrent Users -> 2 Spots on Same Lesson',
    passed,
    details: {
      successes: successes.length,
      rejections: rejections.length,
      dbBookings: confirmed.length,
      consumedTickets: usedTickets.length,
      totalDurationMs: totalDuration,
    },
  });
}

async function runScenario2() {
  console.log('\n========================================================================');
  console.log('🧪 SCENARIO 2: 2 concurrent users racing for the last 1 spot on the same lesson');
  console.log('========================================================================');
  const session = await createTestSession('Lesson 1-Cap / 2 Users Race', 1);
  const users = await createTestUsers(2, 'sc2');

  const start = performance.now();
  const responses = await Promise.all(
    users.map(async (u, idx) => {
      const reqStart = performance.now();
      const res = await u.client.rpc('book_session', { p_session_id: session.id });
      const duration = Math.round(performance.now() - reqStart);
      return { userIndex: idx, res, duration };
    })
  );
  const totalDuration = Math.round(performance.now() - start);

  const successes = responses.filter(r => r.res.data?.success === true);
  const rejections = responses.filter(r => r.res.data?.success === false);

  const dbBookings = unwrap(
    await admin.from('bookings').select('id, user_id, status').eq('session_id', session.id),
    'verify db bookings'
  );
  const confirmed = dbBookings.filter(b => b.status === 'confirmed');

  const passed = successes.length === 1 && rejections.length === 1 && confirmed.length === 1;

  console.log(`⏱️ Total Time: ${totalDuration}ms`);
  console.log(`✅ Successes (Booked): ${successes.length} / 2`);
  console.log(`🚫 Rejections (Full): ${rejections.length} / 2`);
  console.log(`📋 DB Confirmed Bookings: ${confirmed.length} (Max Capacity: 1)`);

  scenarioResults.push({
    name: '2 Users Racing for 1 Spot on Same Lesson',
    passed,
    details: {
      successes: successes.length,
      rejections: rejections.length,
      dbBookings: confirmed.length,
      totalDurationMs: totalDuration,
    },
  });
}

async function runScenario3() {
  console.log('\n========================================================================');
  console.log('🧪 SCENARIO 3: 4 concurrent users booking a lesson with capacity 4 (No Deadlock)');
  console.log('========================================================================');
  const session = await createTestSession('Lesson 4-Cap / 4 Users', 4);
  const users = await createTestUsers(4, 'sc3');

  const start = performance.now();
  const responses = await Promise.all(
    users.map(async (u, idx) => {
      const reqStart = performance.now();
      const res = await u.client.rpc('book_session', { p_session_id: session.id });
      const duration = Math.round(performance.now() - reqStart);
      return { userIndex: idx, res, duration };
    })
  );
  const totalDuration = Math.round(performance.now() - start);

  const successes = responses.filter(r => r.res.data?.success === true);
  const dbBookings = unwrap(
    await admin.from('bookings').select('id, user_id, status').eq('session_id', session.id),
    'verify db bookings'
  );
  const confirmed = dbBookings.filter(b => b.status === 'confirmed');

  const passed = successes.length === 4 && confirmed.length === 4;

  console.log(`⏱️ Total Time: ${totalDuration}ms`);
  console.log(`✅ Successes (Booked): ${successes.length} / 4`);
  console.log(`📋 DB Confirmed Bookings: ${confirmed.length} (Max Capacity: 4)`);

  scenarioResults.push({
    name: '4 Users Booking 4 Spots Concurrently',
    passed,
    details: {
      successes: successes.length,
      dbBookings: confirmed.length,
      totalDurationMs: totalDuration,
    },
  });
}

async function runScenario4() {
  console.log('\n========================================================================');
  console.log('🧪 SCENARIO 4: 1 user sending 4 concurrent duplicate clicks on the same lesson');
  console.log('========================================================================');
  const session = await createTestSession('Lesson Multi-Click Test', 5);
  const users = await createTestUsers(1, 'sc4');
  const singleUser = users[0];

  const start = performance.now();
  // Fire 4 identical booking requests simultaneously from the same user
  const responses = await Promise.all([
    singleUser.client.rpc('book_session', { p_session_id: session.id }),
    singleUser.client.rpc('book_session', { p_session_id: session.id }),
    singleUser.client.rpc('book_session', { p_session_id: session.id }),
    singleUser.client.rpc('book_session', { p_session_id: session.id }),
  ]);
  const totalDuration = Math.round(performance.now() - start);

  const successes = responses.filter(r => r.data?.success === true);
  const duplicatesRejected = responses.filter(r => r.data?.success === false);

  const dbBookings = unwrap(
    await admin.from('bookings').select('id, user_id').eq('session_id', session.id).eq('user_id', singleUser.id),
    'verify single user bookings'
  );

  const userTickets = unwrap(
    await admin.from('user_tickets').select('id, used_at').eq('user_id', singleUser.id),
    'verify user tickets'
  );
  const usedCount = userTickets.filter(t => t.used_at !== null).length;

  const passed = successes.length === 1 && duplicatesRejected.length === 3 && dbBookings.length === 1 && usedCount === 1;

  console.log(`⏱️ Total Time: ${totalDuration}ms`);
  console.log(`✅ Successes: ${successes.length} / 4 (Expected: 1)`);
  console.log(`🚫 Duplicate rejections: ${duplicatesRejected.length} / 4 (Expected: 3)`);
  console.log(`📋 DB Bookings created: ${dbBookings.length} (Expected: 1)`);
  console.log(`🎟️ Tickets consumed: ${usedCount} (Expected: 1)`);

  scenarioResults.push({
    name: '1 User 4 Rapid Duplicate Clicks on Same Lesson',
    passed,
    details: {
      successes: successes.length,
      duplicatesRejected: duplicatesRejected.length,
      dbBookings: dbBookings.length,
      usedTickets: usedCount,
      totalDurationMs: totalDuration,
    },
  });
}

async function runScenario5() {
  console.log('\n========================================================================');
  console.log('🧪 SCENARIO 5: Concurrent Read (Viewing Lesson) vs Write (Booking)');
  console.log('========================================================================');
  const session = await createTestSession('Lesson Read/Write Concurrent', 3);
  const bookers = await createTestUsers(2, 'sc5-b');
  const viewers = await createTestUsers(4, 'sc5-v');

  const start = performance.now();
  // Concurrently 4 users read/view session details while 2 users book
  const [readResults, writeResults] = await Promise.all([
    Promise.all(viewers.map(async v => {
      const res = await v.client
        .from('gym_sessions_with_counts')
        .select('*')
        .eq('id', session.id)
        .single();
      return { success: !res.error, data: res.data };
    })),
    Promise.all(bookers.map(async b => {
      const res = await b.client.rpc('book_session', { p_session_id: session.id });
      return { success: res.data?.success === true, message: res.data?.message };
    }))
  ]);
  const totalDuration = Math.round(performance.now() - start);

  const readsOk = readResults.filter(r => r.success).length;
  const writesOk = writeResults.filter(w => w.success).length;

  const passed = readsOk === 4 && writesOk === 2;

  console.log(`⏱️ Total Time: ${totalDuration}ms`);
  console.log(`👀 Successful Concurrent Reads: ${readsOk} / 4`);
  console.log(`✍️ Successful Concurrent Bookings: ${writesOk} / 2`);

  scenarioResults.push({
    name: '4 Concurrent Readers + 2 Concurrent Bookers',
    passed,
    details: {
      readsOk,
      writesOk,
      totalDurationMs: totalDuration,
    },
  });
}

async function runScenario6() {
  console.log('\n========================================================================');
  console.log('🧪 SCENARIO 6: Slot Turnover Race (Concurrent Cancel vs New Booking on Full Lesson)');
  console.log('========================================================================');
  // Capacity = 1. Pre-book User A so it's full.
  const session = await createTestSession('Lesson Slot Turnover Race', 1);
  const [initialUser] = await createTestUsers(1, 'sc6-init');
  const contenders = await createTestUsers(2, 'sc6-race');

  // Initial user books the only spot
  const initBook = await initialUser.client.rpc('book_session', { p_session_id: session.id });
  if (!initBook.data?.success) throw new Error('Failed to pre-book session for turnover test');

  // Now, initial user cancels while 2 contenders try to book simultaneously
  const start = performance.now();
  const [cancelRes, ...raceRes] = await Promise.all([
    initialUser.client.rpc('cancel_booking', { p_session_id: session.id }),
    contenders[0].client.rpc('book_session', { p_session_id: session.id }),
    contenders[1].client.rpc('book_session', { p_session_id: session.id }),
  ]);
  const totalDuration = Math.round(performance.now() - start);

  const dbBookings = unwrap(
    await admin.from('bookings').select('id, user_id, status').eq('session_id', session.id),
    'verify final bookings'
  );
  const confirmed = dbBookings.filter(b => b.status === 'confirmed');

  const cancelSuccess = cancelRes.data?.success === true;
  const raceSuccesses = raceRes.filter(r => r.data?.success === true);
  const raceRejections = raceRes.filter(r => r.data?.success === false);

  const passed = cancelSuccess && confirmed.length === 1 && raceSuccesses.length === 1 && raceRejections.length === 1;

  console.log(`⏱️ Total Time: ${totalDuration}ms`);
  console.log(`🔄 Cancellation successful: ${cancelSuccess}`);
  console.log(`🏁 Contender who won freed slot: ${raceSuccesses.length} / 2`);
  console.log(`🚫 Contender rejected (Full): ${raceRejections.length} / 2`);
  console.log(`📋 Final DB Bookings: ${confirmed.length} (Max Capacity: 1)`);

  scenarioResults.push({
    name: 'Slot Turnover: Cancel vs 2 Contenders Racing',
    passed,
    details: {
      cancelSuccess,
      raceSuccesses: raceSuccesses.length,
      raceRejections: raceRejections.length,
      finalDbBookings: confirmed.length,
      totalDurationMs: totalDuration,
    },
  });
}

try {
  console.log('🚀 Starting Talia Fitness Concurrent Lesson Test Suite');
  console.log(`Run Batch ID: ${runBatchId}`);

  await runScenario1();
  await runScenario2();
  await runScenario3();
  await runScenario4();
  await runScenario5();
  await runScenario6();

  console.log('\n========================================================================');
  console.log('📊 CONCURRENCY TEST SUMMARY REPORT');
  console.log('========================================================================');
  console.table(scenarioResults.map(s => ({
    Scenario: s.name,
    Status: s.passed ? 'PASSED ✅' : 'FAILED ❌',
    Duration: `${s.details.totalDurationMs || 0}ms`,
  })));

  const allPassed = scenarioResults.every(s => s.passed);
  if (!allPassed) {
    console.error('❌ Some concurrency scenarios failed!');
    process.exitCode = 1;
  } else {
    console.log('🎉 ALL CONCURRENCY SCENARIOS PASSED WITH PERFECT DATA INTEGRITY!');
  }
} catch (error) {
  console.error('💥 Test runner encountered an unhandled exception:', error);
  process.exitCode = 1;
} finally {
  await cleanup();
}

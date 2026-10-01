import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const DUMMY_USERS_FILE = '.dummy-users.json';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function formatStats(latencies) {
  if (!latencies.length) return { min: 0, mean: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const getP = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * (p / 100)))];

  return {
    min: Math.round(sorted[0]),
    mean: Math.round(sum / sorted.length),
    p50: Math.round(getP(50)),
    p90: Math.round(getP(90)),
    p95: Math.round(getP(95)),
    p99: Math.round(getP(99)),
    max: Math.round(sorted[sorted.length - 1]),
  };
}

async function runWorkerPool(tasks, concurrency) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const currentIndex = index++;
      const res = await tasks[currentIndex]();
      results[currentIndex] = res;
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function runWebStressTest(concurrencyLevels = [10, 20, 30]) {
  console.log(`\n=============================================================`);
  console.log(`  STARTING WEB STRESS TEST ON TALIA FITNESS CLUB APP`);
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Concurrency levels: ${concurrencyLevels.join(', ')} concurrent requests`);
  console.log(`=============================================================\n`);

  const raw = await readFile(DUMMY_USERS_FILE, 'utf-8');
  const fixture = JSON.parse(raw);
  const trainees = fixture.users.filter(u => u.role === 'trainee');
  const admins = fixture.users.filter(u => u.role === 'administrator');

  console.log(`Loaded ${trainees.length} dummy trainees and ${admins.length} dummy admins.`);

  const testReport = {
    target: BASE_URL,
    timestamp: new Date().toISOString(),
    concurrencyRuns: {}
  };

  for (const concurrency of concurrencyLevels) {
    console.log(`\n>>> RUNNING TEST SUITE AT CONCURRENCY LEVEL: ${concurrency} <<<\n`);
    const runResults = {};

    const pageSuites = [
      // 1. Public Pages (Unauthenticated)
      {
        name: 'Public: / (Landing Page)',
        url: `${BASE_URL}/`,
        headers: {},
        expected: (res, text) => res.status === 200 && !text.includes('__next-page-redirect')
      },
      {
        name: 'Public: /auth/login (Sign-in Page)',
        url: `${BASE_URL}/auth/login`,
        headers: {},
        expected: (res, text) => res.status === 200
      },
      {
        name: 'Public: /auth/auth-code-error (Error Page)',
        url: `${BASE_URL}/auth/auth-code-error`,
        headers: {},
        expected: (res, text) => res.status === 200
      },
      {
        name: 'Public: /subscription (Plans & Pricing)',
        url: `${BASE_URL}/subscription`,
        headers: {},
        expected: (res, text) => res.status === 200
      },
      {
        name: 'Public: /~offline (PWA Offline Fallback)',
        url: `${BASE_URL}/~offline`,
        headers: {},
        expected: (res, text) => res.status === 200
      },
      {
        name: 'Static / PWA: /manifest.webmanifest',
        url: `${BASE_URL}/manifest.webmanifest`,
        headers: {},
        expected: (res) => res.status === 200
      },
      {
        name: 'API: /api/app-version',
        url: `${BASE_URL}/api/app-version`,
        headers: {},
        expected: (res) => res.status === 200
      },

      // 2. Trainee Authenticated Pages (Concurrent Distinct Trainees)
      {
        name: 'Auth Trainee: / (Redirects to /dashboard)',
        url: `${BASE_URL}/`,
        getHeaders: (i) => ({ Cookie: trainees[i % trainees.length].cookieHeader }),
        expected: (res, text) => res.status === 200 && text.includes('__next-page-redirect') && text.includes('/dashboard')
      },
      {
        name: 'Auth Trainee: /dashboard (Member Dashboard)',
        url: `${BASE_URL}/dashboard`,
        getHeaders: (i) => ({ Cookie: trainees[i % trainees.length].cookieHeader }),
        expected: (res, text) => res.status === 200 && !text.includes('__next-page-redirect')
      },
      {
        name: 'Auth Trainee: /book (Upcoming Classes & Booking)',
        url: `${BASE_URL}/book`,
        getHeaders: (i) => ({ Cookie: trainees[i % trainees.length].cookieHeader }),
        expected: (res, text) => res.status === 200 && !text.includes('__next-page-redirect')
      },
      {
        name: 'Auth Trainee: /my-bookings (Bookings History)',
        url: `${BASE_URL}/my-bookings`,
        getHeaders: (i) => ({ Cookie: trainees[i % trainees.length].cookieHeader }),
        expected: (res, text) => res.status === 200 && !text.includes('__next-page-redirect')
      },
      {
        name: 'Auth Trainee: /profile (Member Profile & Health)',
        url: `${BASE_URL}/profile`,
        getHeaders: (i) => ({ Cookie: trainees[i % trainees.length].cookieHeader }),
        expected: (res, text) => res.status === 200 && !text.includes('__next-page-redirect')
      },
      {
        name: 'Auth Trainee: /onboarding (Onboarding Flow)',
        url: `${BASE_URL}/onboarding`,
        getHeaders: (i) => ({ Cookie: trainees[i % trainees.length].cookieHeader }),
        expected: (res, text) => res.status === 200
      },

      // 3. Security & RBAC Enforcement Under Load
      {
        name: 'Security RBAC: Trainees hitting /admin (Must be blocked & redirected)',
        url: `${BASE_URL}/admin`,
        getHeaders: (i) => ({ Cookie: trainees[i % trainees.length].cookieHeader }),
        expected: (res, text) => res.status === 200 && text.includes('__next-page-redirect') && text.includes('/dashboard')
      },
      {
        name: 'Security RBAC: Trainees hitting /admin/schedule (Must be blocked)',
        url: `${BASE_URL}/admin/schedule`,
        getHeaders: (i) => ({ Cookie: trainees[i % trainees.length].cookieHeader }),
        expected: (res, text) => res.status === 200 && text.includes('__next-page-redirect') && text.includes('/dashboard')
      },
      {
        name: 'Security RBAC: Trainees hitting /admin/trainees (Must be blocked)',
        url: `${BASE_URL}/admin/trainees`,
        getHeaders: (i) => ({ Cookie: trainees[i % trainees.length].cookieHeader }),
        expected: (res, text) => res.status === 200 && text.includes('__next-page-redirect') && text.includes('/dashboard')
      },
      {
        name: 'Security RBAC: Unauthenticated hitting /dashboard (Must redirect to /auth/login)',
        url: `${BASE_URL}/dashboard`,
        headers: {},
        expected: (res, text) => res.status === 200 && text.includes('__next-page-redirect') && text.includes('/auth/login')
      },

      // 4. Admin Authenticated Pages
      {
        name: 'Auth Admin: /admin (Admin Overview)',
        url: `${BASE_URL}/admin`,
        getHeaders: (i) => ({ Cookie: admins[i % admins.length].cookieHeader }),
        expected: (res, text) => res.status === 200 && !text.includes('__next-page-redirect')
      },
      {
        name: 'Auth Admin: /admin/schedule (Admin Schedule Manager)',
        url: `${BASE_URL}/admin/schedule`,
        getHeaders: (i) => ({ Cookie: admins[i % admins.length].cookieHeader }),
        expected: (res, text) => res.status === 200 && !text.includes('__next-page-redirect')
      },
      {
        name: 'Auth Admin: /admin/trainees (Admin Trainee Manager)',
        url: `${BASE_URL}/admin/trainees`,
        getHeaders: (i) => ({ Cookie: admins[i % admins.length].cookieHeader }),
        expected: (res, text) => res.status === 200 && !text.includes('__next-page-redirect')
      }
    ];

    const NUM_REQUESTS_PER_PAGE = Math.max(concurrency, 30);

    for (const suite of pageSuites) {
      process.stdout.write(`Testing ${suite.name.padEnd(55)} [${concurrency} concurrent] ... `);
      const latencies = [];
      let successCount = 0;
      let failureCount = 0;
      const errorReasons = [];

      const startTime = performance.now();

      const tasks = Array.from({ length: NUM_REQUESTS_PER_PAGE }, (_, reqIndex) => async () => {
        const headers = suite.getHeaders ? suite.getHeaders(reqIndex) : suite.headers;
        const reqStart = performance.now();
        try {
          const res = await fetch(suite.url, {
            headers,
            redirect: 'manual'
          });
          const text = await res.text();
          const latency = performance.now() - reqStart;
          latencies.push(latency);

          const ok = suite.expected(res, text);
          if (ok) {
            successCount++;
          } else {
            failureCount++;
            errorReasons.push(`HTTP ${res.status}, snippet: ${text.slice(0, 80).replace(/\s+/g, ' ')}`);
          }
        } catch (err) {
          const latency = performance.now() - reqStart;
          latencies.push(latency);
          failureCount++;
          errorReasons.push(`Network error: ${err.message}`);
        }
      });

      await runWorkerPool(tasks, concurrency);
      const totalTimeMs = performance.now() - startTime;
      const rps = (NUM_REQUESTS_PER_PAGE / (totalTimeMs / 1000)).toFixed(1);
      const stats = formatStats(latencies);

      const statusMarker = failureCount === 0 ? '✓ PASS' : `✗ FAIL (${failureCount} errors)`;
      console.log(`${statusMarker} | p50: ${stats.p50}ms | p95: ${stats.p95}ms | ${rps} req/s`);

      runResults[suite.name] = {
        requests: NUM_REQUESTS_PER_PAGE,
        successes: successCount,
        failures: failureCount,
        rps: Number(rps),
        stats,
        errors: errorReasons.slice(0, 3)
      };
    }

    testReport.concurrencyRuns[`c${concurrency}`] = runResults;
  }

  // 5. Concurrent Session Booking Race Condition Stress Test
  console.log(`\n=============================================================`);
  console.log(`  CONCURRENT BOOKING MUTATION STRESS TEST (RACE FOR SPOTS)`);
  console.log(`  30 Trainees concurrently racing to book 10 spots in real time`);
  console.log(`=============================================================\n`);

  if (fixture.testSessionIds?.length > 0) {
    const targetSessionId = fixture.testSessionIds[0];
    const { createClient } = await import('@supabase/supabase-js');
    const dotenv = await import('dotenv');
    dotenv.config({ path: '.env.local', quiet: true });
    dotenv.config({ path: '.env.stress.local', override: true, quiet: true });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    const admin = createClient(url, secretKey, { auth: { persistSession: false } });

    // Ensure session has capacity = 10
    await admin.from('gym_sessions').update({ max_capacity: 10 }).eq('id', targetSessionId);

    const bookingLatencies = [];
    const bookingStart = performance.now();

    const bookingPromises = trainees.map(async (trainee) => {
      const client = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      await client.auth.signInWithPassword({
        email: trainee.email,
        password: trainee.password
      });

      const t0 = performance.now();
      const { data, error } = await client.rpc('book_session', { p_session_id: targetSessionId });
      const lat = performance.now() - t0;
      bookingLatencies.push(lat);

      return {
        traineeId: trainee.id,
        traineeName: trainee.fullName,
        success: Boolean(data?.success),
        message: data?.message || error?.message
      };
    });

    const bookingResults = await Promise.all(bookingPromises);
    const totalBookingTime = performance.now() - bookingStart;

    const accepted = bookingResults.filter(r => r.success);
    const rejected = bookingResults.filter(r => !r.success);

    console.log(`Booking race completed in ${Math.round(totalBookingTime)}ms`);
    console.log(`Accepted bookings: ${accepted.length} (Max capacity: 10)`);
    console.log(`Rejected bookings (capacity full): ${rejected.length}`);
    console.log(`Capacity integrity: ${accepted.length <= 10 ? '✓ PRESERVED (NO OVERBOOKING)' : '✗ OVERBOOKED!'}`);

    // Verify DB state
    const { data: dbBookings } = await admin.from('bookings').select('id, user_id, status').eq('session_id', targetSessionId);
    console.log(`Confirmed bookings in DB: ${dbBookings.filter(b => b.status === 'confirmed').length}`);

    testReport.bookingRaceTest = {
      totalTrainees: trainees.length,
      maxCapacity: 10,
      acceptedCount: accepted.length,
      rejectedCount: rejected.length,
      dbConfirmedCount: dbBookings.filter(b => b.status === 'confirmed').length,
      stats: formatStats(bookingLatencies),
      integrityPass: accepted.length <= 10 && accepted.length === dbBookings.filter(b => b.status === 'confirmed').length
    };
  }

  console.log(`\n=============================================================`);
  console.log(`  ALL STRESS TESTS COMPLETED!`);
  console.log(`=============================================================\n`);

  return testReport;
}

runWebStressTest().catch(console.error);

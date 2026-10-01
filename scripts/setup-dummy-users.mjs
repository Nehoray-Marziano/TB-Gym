import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env.stress.local', override: true, quiet: true });
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !anonKey || !secretKey) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

const admin = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const DUMMY_USERS_FILE = '.dummy-users.json';
const PASSWORD = 'TaliaStressUser2026!';
const TRAINEE_COUNT = 30;
const ADMIN_COUNT = 2;

export async function cleanupDummyUsers() {
  console.log('--- Cleaning up dummy test data ---');
  if (!existsSync(DUMMY_USERS_FILE)) {
    console.log('No .dummy-users.json found to cleanup.');
    return;
  }
  
  const content = JSON.parse(await readFile(DUMMY_USERS_FILE, 'utf-8'));
  const userIds = content.users.map(u => u.id);
  const sessionIds = content.testSessionIds || [];

  console.log(`Found ${userIds.length} dummy users and ${sessionIds.length} test sessions.`);

  if (sessionIds.length > 0) {
    console.log('Deleting bookings and test sessions...');
    await admin.from('bookings').delete().in('session_id', sessionIds);
    await admin.from('gym_sessions').delete().in('id', sessionIds);
  }

  if (userIds.length > 0) {
    console.log('Deleting user tickets and health declarations...');
    await admin.from('user_tickets').delete().in('user_id', userIds);
    await admin.from('health_declarations').delete().in('id', userIds);
    await admin.from('profiles').delete().in('id', userIds);

    console.log('Deleting auth users...');
    for (const id of userIds) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) console.warn(`Failed to delete user ${id}:`, error.message);
    }
  }

  console.log('Cleanup finished.');
}

export async function setupDummyUsers() {
  console.log('====================================================');
  console.log(`  Setting up ${TRAINEE_COUNT} Trainees + ${ADMIN_COUNT} Admins in Supabase`);
  console.log('====================================================');

  const { data: existingUsersRes, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100
  });

  if (listError) {
    console.error('Failed to list existing users:', listError);
    process.exit(1);
  }

  const existingByEmail = new Map(existingUsersRes.users.map(u => [u.email, u]));

  const usersList = [];

  // 1. Prepare user specs
  const userSpecs = [];
  for (let i = 1; i <= TRAINEE_COUNT; i++) {
    const pad = String(i).padStart(2, '0');
    userSpecs.push({
      email: `dummy_trainee_${pad}@test.talia.club`,
      fullName: `מתאמנת בדיקה ${pad}`,
      role: 'trainee',
      phone: `05012345${pad}`,
      age: 20 + (i % 25),
      onboardingCompleted: i !== TRAINEE_COUNT, // Keep the last one incomplete to test /onboarding
      tickets: 5
    });
  }

  for (let i = 1; i <= ADMIN_COUNT; i++) {
    const pad = String(i).padStart(2, '0');
    userSpecs.push({
      email: `dummy_admin_${pad}@test.talia.club`,
      fullName: `מנהלת בדיקה ${pad}`,
      role: 'administrator',
      phone: `05412345${pad}`,
      age: 28,
      onboardingCompleted: true,
      tickets: 10
    });
  }

  console.log(`Creating/Verifying ${userSpecs.length} users in Supabase Auth & DB...`);

  // Process in small batches of 5 to avoid free tier rate-limits
  const BATCH_SIZE = 5;
  for (let b = 0; b < userSpecs.length; b += BATCH_SIZE) {
    const batch = userSpecs.slice(b, b + BATCH_SIZE);
    await Promise.all(batch.map(async (spec) => {
      let authUser = existingByEmail.get(spec.email);

      if (!authUser) {
        const { data: created, error } = await admin.auth.admin.createUser({
          email: spec.email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: {
            full_name: spec.fullName,
            is_dummy: true
          }
        });
        if (error) {
          console.error(`Error creating ${spec.email}:`, error.message);
          throw error;
        }
        authUser = created.user;
      }

      // Upsert profile
      await admin.from('profiles').upsert({
        id: authUser.id,
        full_name: spec.fullName,
        email: spec.email,
        role: spec.role,
        onboarding_completed: spec.onboardingCompleted,
        age: spec.age,
        phone: spec.phone,
        updated_at: new Date().toISOString()
      });

      // Upsert health declaration
      await admin.from('health_declarations').upsert({
        id: authUser.id,
        is_healthy: true,
        medical_conditions: null
      });

      // Check user tickets
      const { data: currentTickets } = await admin.from('user_tickets')
        .select('id')
        .eq('user_id', authUser.id)
        .is('used_at', null);

      const ticketDiff = spec.tickets - (currentTickets?.length || 0);
      if (ticketDiff > 0) {
        const newTickets = Array.from({ length: ticketDiff }, () => ({
          user_id: authUser.id,
          source: 'admin',
          expires_at: new Date(Date.now() + 30 * 86400000).toISOString()
        }));
        await admin.from('user_tickets').insert(newTickets);
      }

      // Authenticate to obtain SSR session cookies
      const cookieJar = new Map();
      const client = createServerClient(url, anonKey, {
        cookies: {
          getAll: () => Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value })),
          setAll: (toSet) => { toSet.forEach(c => cookieJar.set(c.name, c.value)); }
        }
      });

      const { data: authSession, error: signInErr } = await client.auth.signInWithPassword({
        email: spec.email,
        password: PASSWORD
      });

      if (signInErr) {
        console.error(`Sign in error for ${spec.email}:`, signInErr.message);
        throw signInErr;
      }

      const cookieHeader = Array.from(cookieJar.entries())
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('; ');

      usersList.push({
        id: authUser.id,
        email: spec.email,
        password: PASSWORD,
        role: spec.role,
        fullName: spec.fullName,
        onboardingCompleted: spec.onboardingCompleted,
        cookieHeader,
        accessToken: authSession.session.access_token
      });
    }));
    // Small breath between batches
    await new Promise(r => setTimeout(r, 200));
  }

  // 2. Setup future gym sessions for booking tests
  console.log('Ensuring future gym sessions exist for booking stress tests...');
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(10, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow.getTime() + 60 * 60 * 1000);

  const evening = new Date(Date.now() + 24 * 60 * 60 * 1000);
  evening.setHours(18, 0, 0, 0);
  const eveningEnd = new Date(evening.getTime() + 60 * 60 * 1000);

  const sessionInsert = await admin.from('gym_sessions').insert([
    {
      title: '[טסט עומסים] אימון פונקציונלי בוקר',
      description: 'אימון פונקציונלי לבדיקת עומסים והרשמות',
      start_time: tomorrow.toISOString(),
      end_time: tomorrowEnd.toISOString(),
      max_capacity: 10
    },
    {
      title: '[טסט עומסים] אימון כח ערב',
      description: 'אימון כח לחיטוב לבדיקת עומסים והרשמות',
      start_time: evening.toISOString(),
      end_time: eveningEnd.toISOString(),
      max_capacity: 8
    }
  ]).select('id, title, max_capacity');

  const testSessionIds = sessionInsert.data ? sessionInsert.data.map(s => s.id) : [];

  const outputData = {
    createdAt: new Date().toISOString(),
    users: usersList,
    testSessionIds,
    sessions: sessionInsert.data || []
  };

  await writeFile(DUMMY_USERS_FILE, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`Saved credentials and session cookies for ${usersList.length} dummy users to ${DUMMY_USERS_FILE}`);
  console.log('Setup successfully completed!');
}

if (process.argv.includes('--cleanup')) {
  cleanupDummyUsers().catch(console.error);
} else {
  setupDummyUsers().catch(console.error);
}

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';

config({ path: '.env.local', quiet: true });
config({ path: '.env.stress.local', override: true, quiet: true });

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: key } = process.env;
if (!url || !key) throw new Error('Development Supabase credentials are required');
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const fixturePath = new URL('../.ui-fixture.json', import.meta.url);
const action = process.argv[2];

function result(value, label) {
  if (value.error) throw new Error(`${label}: ${value.error.message}`);
  return value.data;
}

if (action === 'setup') {
  try {
    await readFile(fixturePath);
    throw new Error('A fixture already exists; clean it up first');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const name = process.argv[3];
  if (!name) throw new Error('Pass the exact test account profile name');
  const profiles = result(await admin.from('profiles').select('id,full_name').eq('full_name', name), 'find test account');
  if (profiles.length !== 1) throw new Error(`Expected one matching account; found ${profiles.length}`);

  const fixture = { userId: profiles[0].id, sessionId: null, ticketId: null };
  try {
    const start = new Date(Date.now() + 5 * 86400000);
    const end = new Date(start.getTime() + 60 * 60000);
    const session = result(await admin.from('gym_sessions').insert({
      title: `בדיקת QA זמנית ${randomUUID().slice(0, 6)}`,
      description: 'אימון זמני לבדיקה; יימחק בסיום',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      max_capacity: 1,
    }).select('id,title').single(), 'create test session');
    fixture.sessionId = session.id;
    await writeFile(fixturePath, JSON.stringify(fixture));

    const ticket = result(await admin.from('user_tickets').insert({
      user_id: fixture.userId,
      source: 'admin',
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    }).select('id').single(), 'create test ticket');
    fixture.ticketId = ticket.id;
    await writeFile(fixturePath, JSON.stringify(fixture));
    console.log(JSON.stringify({ sessionTitle: session.title, ...fixture }));
  } catch (error) {
    console.error(error);
    console.error('Run `node scripts/ui-fixture.mjs cleanup` to remove any created records.');
    process.exitCode = 1;
  }
} else if (action === 'cleanup') {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  if (fixture.sessionId) result(await admin.from('bookings').delete().eq('session_id', fixture.sessionId), 'delete test booking');
  if (fixture.ticketId) result(await admin.from('user_tickets').delete().eq('id', fixture.ticketId), 'delete test ticket');
  if (fixture.sessionId) result(await admin.from('gym_sessions').delete().eq('id', fixture.sessionId), 'delete test session');
  await unlink(fixturePath);
  console.log('UI fixture removed');
} else {
  throw new Error('Usage: node scripts/ui-fixture.mjs setup <exact profile name> | cleanup');
}

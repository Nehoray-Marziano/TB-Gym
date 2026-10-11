// Read-only post-migration check. Never outputs private booking identities.
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
config({ path: '.env.local', quiet: true });
config({ path: '.env.stress.local', override: true, quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, process.env.SUPABASE_SECRET_KEY, options);
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const checks = [];
const expect = (name, passed, evidence) => { checks.push({ name, passed: !!passed, evidence }); console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`); };
const data = (r, label) => { if (r.error) throw Error(`${label}: ${r.error.message}`); return r.data; };
try {
  // Exclude the active load campaign so its deliberate rapid mutations cannot
  // manufacture a mismatch between separate HTTP snapshots.
  const sessions = data(await service.from('gym_sessions').select('id').not('title', 'like', '[final-%'), 'catalog IDs');
  const ids = sessions.map(s => s.id);
  if (!ids.length) throw Error('No stable catalog classes available for a meaningful count check');
  const counts = async () => {
    const rows = data(await service.from('bookings').select('session_id').in('session_id', ids).eq('status', 'confirmed'), 'aggregate observation');
    return Object.fromEntries(ids.map(id => [id, rows.filter(b => b.session_id === id).length]));
  };
  let stable = false, visible = [], expected;
  for (let attempt = 0; attempt < 3; attempt++) {
    expected = await counts();
    visible = data(await anon.from('gym_sessions_with_counts').select('id,current_bookings').in('id', ids), 'anonymous catalog counts');
    if (JSON.stringify(expected) === JSON.stringify(await counts())) { stable = true; break; }
  }
  expect('Database snapshots stable for comparison', stable);
  expect('Anonymous catalog includes every public class', visible.length === ids.length, { classes: ids.length });
  expect('Anonymous occupancy matches all confirmed bookings', stable && Object.values(expected).some(n => n > 0) && visible.every(s => Number(s.current_bookings) === expected[s.id]), { occupiedClasses: visible.filter(s => Number(s.current_bookings) > 0).length });
  const privateRows = await anon.from('bookings').select('session_id').in('session_id', ids).limit(1);
  expect('Anonymous cannot retrieve individual booking rows', privateRows.error?.code === '42501' || !privateRows.error && privateRows.data?.length === 0);
  const helper = await anon.rpc('confirmed_session_occupancy', { p_session_id: randomUUID() });
  expect('Internal aggregate is not exposed as a public REST RPC', helper.error?.code === 'PGRST202', { code: helper.error?.code });
  const internal = await anon.schema('studio_internal').rpc('confirmed_session_occupancy', { p_session_id: randomUUID() });
  expect('Internal schema is excluded from REST access', internal.error?.code === 'PGRST106', { code: internal.error?.code });
} catch (error) {
  expect('Read-only occupancy verification completed', false, error.message);
}
await mkdir('scratch', { recursive: true });
const report = { checkedAt: new Date().toISOString(), project: new URL(url).hostname, checks, passed: checks.every(c => c.passed) };
await writeFile('scratch/correctness-live-occupancy.json', JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;

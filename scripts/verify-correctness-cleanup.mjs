// Read-only independent audit of explicitly named campaign manifests/reports.
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
config({ path: '.env.local', quiet: true });
config({ path: '.env.stress.local', override: true, quiet: true });
const files = process.argv.slice(2);
if (!files.length) throw Error('Pass the exact disposable campaign report/manifest paths');
const root = resolve('scratch'), users = new Set(), sessions = new Set(), campaigns = new Set();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
for (const file of files) {
  const path = resolve(file), rel = relative(root, path);
  if (rel.startsWith('..') || isAbsolute(rel) || !/\/(?:report|manifest)\.json$/.test(path.replaceAll('\\', '/'))) throw Error('Audit inputs must be scratch campaign reports');
  const r = JSON.parse(await readFile(path, 'utf8'));
  if (!/^(final(?:-auth|-ui)?|member-ui|deep-admin-ui|deep-balance)-\d+-[0-9a-f]{8}$/.test(r.runId)) throw Error('Unknown fixture campaign');
  campaigns.add(r.runId);
  for (const [values, destination] of [[r.userIds || [], users], [r.sessionIds || [], sessions]]) {
    for (const id of values) { if (!uuid.test(id)) throw Error('Invalid fixture UUID'); destination.add(id); }
  }
}
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const counts = {}, chunks = ids => Array.from({ length: Math.ceil(ids.length / 50) }, (_, i) => ids.slice(i * 50, (i + 1) * 50));
for (const [table, column, ids] of [
  ['profiles', 'id', [...users]], ['health_declarations', 'id', [...users]],
  ['user_tickets', 'user_id', [...users]], ['bookings', 'user_id', [...users]],
  ['user_subscriptions', 'user_id', [...users]], ['user_credits', 'user_id', [...users]],
  ['admin_mutation_receipts', 'actor_id', [...users]], ['gym_sessions', 'id', [...sessions]],
]) {
  counts[table] = 0;
  for (const group of chunks(ids)) {
    const r = await service.from(table).select(column, { count: 'exact', head: true }).in(column, group);
    if (r.error) throw Error(`${table} residue verification failed: ${r.error.message}`);
    counts[table] += r.count;
  }
}
counts.subscription_tiers = 0;
for (const group of chunks([...campaigns].filter(id => /^final-\d+-/.test(id)).map(id => `${id}-catalog-probe`))) {
  const r = await service.from('subscription_tiers').select('id', { count: 'exact', head: true }).in('name', group);
  if (r.error) throw Error(`Catalog residue verification failed: ${r.error.message}`);
  counts.subscription_tiers += r.count;
}
let next = 0, authResidues = 0;
const ids = [...users];
await Promise.all(Array.from({ length: Math.min(6, ids.length) }, async () => {
  while (next < ids.length) {
    const r = await service.auth.admin.getUserById(ids[next++]);
    if (r.data?.user) authResidues++;
    else if (!(r.error?.status === 404 || r.error?.code === 'user_not_found')) throw Error('Auth residue verification was inconclusive');
  }
}));
const result = { campaignInputs: files.length, accountIdsChecked: users.size, sessionIdsChecked: sessions.size, tableResidueCounts: counts, authResidues, passed: authResidues === 0 && Object.values(counts).every(n => n === 0) };
await writeFile('scratch/correctness-independent-cleanup.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;

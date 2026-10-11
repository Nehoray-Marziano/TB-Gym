import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const session = '11111111-1111-1111-1111-111111111111';
const otherSession = '22222222-2222-2222-2222-222222222222';
const member = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const other = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const observer = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

test('public occupancy counts all confirmed bookings while booking rows remain private', async t => {
    const db = new PGlite();
    t.after(() => db.close());
    await db.exec(`
        CREATE ROLE anon;
        CREATE ROLE authenticated;
        CREATE ROLE service_role BYPASSRLS;
        CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
            $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
        GRANT USAGE ON SCHEMA auth TO anon, authenticated;
        GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
        CREATE TABLE public.gym_sessions (
            id uuid PRIMARY KEY, title text NOT NULL, description text,
            start_time timestamptz, end_time timestamptz,
            max_capacity int NOT NULL, created_at timestamptz DEFAULT now()
        );
        CREATE TABLE public.bookings (id uuid PRIMARY KEY, user_id uuid, session_id uuid REFERENCES gym_sessions(id), status text);
        ALTER TABLE public.gym_sessions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
        CREATE POLICY session_read ON gym_sessions FOR SELECT USING (true);
        CREATE POLICY own_bookings ON bookings FOR SELECT USING (user_id = auth.uid());
        GRANT SELECT ON gym_sessions, bookings TO anon, authenticated;
        INSERT INTO gym_sessions (id,title,max_capacity) VALUES ('${session}','Test class',3),('${otherSession}','Empty class',3);
        INSERT INTO bookings VALUES
            ('00000000-0000-0000-0000-000000000001','${member}','${session}','confirmed'),
            ('00000000-0000-0000-0000-000000000002','${other}','${session}','confirmed'),
            ('00000000-0000-0000-0000-000000000003','${observer}','${session}','pending'),
            ('00000000-0000-0000-0000-000000000004','${observer}','${session}','cancelled');
        CREATE VIEW public.gym_sessions_with_counts WITH (security_invoker=true) AS
            SELECT s.*, COUNT(b.session_id) FILTER (WHERE b.status='confirmed') AS current_bookings
            FROM gym_sessions s LEFT JOIN bookings b ON b.session_id=s.id GROUP BY s.id;
        GRANT SELECT ON gym_sessions_with_counts TO anon, authenticated;
    `);
    const asRole = async (role, userId = '') => {
        await db.exec('RESET ROLE');
        await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
        await db.exec(`SET ROLE ${role}`);
    };
    const count = async () => Number((await db.query('SELECT current_bookings FROM gym_sessions_with_counts WHERE id=$1', [session])).rows[0].current_bookings);

    await asRole('authenticated', observer);
    assert.equal(await count(), 0, 'reproduces the incorrect observer count before the migration');
    await asRole('authenticated', member);
    assert.equal(await count(), 1, 'reproduces the caller-only count before the migration');
    await db.exec('RESET ROLE');
    await db.exec(await readFile('src/utils/supabase/migrations/22_public_occupancy_private_bookings.sql','utf8'));

    await t.test('booked member sees complete occupancy but only her own booking', async () => {
        await asRole('authenticated', member);
        assert.equal(await count(), 2);
        const rows = (await db.query('SELECT user_id FROM bookings')).rows;
        assert.equal(rows.length, 1);
        assert.equal(rows[0].user_id, member);
    });
    await t.test('non-booked member sees occupancy without attendee identities', async () => {
        await asRole('authenticated', observer);
        assert.equal(await count(), 2);
        const row = (await db.query('SELECT * FROM gym_sessions_with_counts WHERE id=$1',[session])).rows[0];
        assert.deepEqual(Object.keys(row), ['id','title','description','start_time','end_time','max_capacity','created_at','current_bookings']);
        assert((await db.query('SELECT user_id FROM bookings')).rows.every(row => row.user_id === observer));
    });
    await t.test('anonymous can read public occupancy and no booking rows', async () => {
        await asRole('anon');
        assert.equal(await count(), 2);
        assert.equal((await db.query('SELECT * FROM bookings')).rows.length,0);
        assert.equal(Number((await db.query('SELECT current_bookings FROM gym_sessions_with_counts WHERE id=$1',[otherSession])).rows[0].current_bookings),0);
    });
    await t.test('cancellation changes the count and pending bookings do not count', async () => {
        await db.exec('RESET ROLE');
        await db.query("UPDATE bookings SET status='cancelled' WHERE user_id=$1 AND status='confirmed'",[other]);
        await asRole('authenticated', member);
        assert.equal(await count(),1);
    });
    await t.test('the view still applies session row-level policies', async () => {
        await db.exec('RESET ROLE');
        const options = (await db.query("SELECT reloptions FROM pg_class WHERE oid='public.gym_sessions_with_counts'::regclass")).rows[0].reloptions;
        assert(options.includes('security_invoker=true'));
        await db.exec("ALTER POLICY session_read ON gym_sessions USING (id <> '11111111-1111-1111-1111-111111111111')");
        await asRole('anon');
        assert.equal((await db.query('SELECT * FROM gym_sessions_with_counts WHERE id=$1',[session])).rows.length,0);
    });
    await t.test('migration can be reapplied without changing its contract', async () => {
        await db.exec('RESET ROLE');
        await db.exec(await readFile('src/utils/supabase/migrations/22_public_occupancy_private_bookings.sql','utf8'));
        await asRole('authenticated', member);
        assert.equal((await db.query('SELECT * FROM bookings')).rows.length,1);
    });
});

# Booking stress test

Run `npm run stress:bookings -- 30 3` to create 30 synthetic trainees and race them for three lesson spots. The defaults are 12 trainees and three spots; the harness caps trainee count at 30 because a 50-user run hit Supabase Auth's free-tier request-rate limit before bookings began. Run `npm run stress:edge` for double-spending, late cancellation, unverified purchase, and profile role checks. Run `npm run stress:admin` for lesson creation, invitations, refunds, deletion, and ticket adjustments. The scripts use randomly generated, administrator-created email/password accounts only inside tests. The app's Google-only sign-in stays unchanged. No email is sent.

The script loads the project URL and publishable key from `.env.local` and a server-side `SUPABASE_SECRET_KEY` from `.env.stress.local`. Both files are Git-ignored. Never add the secret key to a `NEXT_PUBLIC_` variable or a client bundle.

The tests print JSON reports and exit nonzero on failed assertions. They clean up their own tagged sessions, tickets, bookings, and synthetic Auth users even when a check fails. A cleanup error appears in the report and should be resolved before another run.

This exercises the real Supabase Auth and database APIs. It is a bounded correctness/concurrency test, not a traffic benchmark for the Next.js server or Google OAuth itself. Run it against a development project or an isolated test branch.

For a live UI booking check, run `node scripts/ui-fixture.mjs setup "<exact profile name>"` for an account already signed in through Google. The script creates one labeled disposable class and one ticket, then stores their IDs in Git-ignored `.ui-fixture.json`. Book and cancel that class in the deployed app, verify the seat and credit displays, and run `node scripts/ui-fixture.mjs cleanup` even if the UI test fails. The cleanup deletes only records with those stored IDs.

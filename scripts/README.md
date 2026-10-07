# Booking stress test

## Notification checks

Run `npm run test:notifications` (or `node --test scripts/test-notifications.mjs scripts/test-notification-client.mjs scripts/test-notification-flows.mjs`). These tests execute the actual notification routes, SDK lifecycle module/provider, and all ten trigger handlers with intercepted OneSignal/fetch/database boundaries. They cover role/user targeting, credits added/removed, broadcasts, bookings/cancellations, class deletion, attendee removal, failed mutations, HTTP failures, unsubscribed recipients, malformed input, startup/account-switch/logout races, foreground toasts, permission outcomes, SDK failures and duplicate broadcast submits. Provider acceptance is not device-delivery proof.

For isolated browser feedback checks, run `node scripts/prepare-notification-browser.mjs`, start a local dev server, then visit `/notification-check`. The fixture imports the real broadcast and profile components and intercepts notification and non-local fetches. Exercise failed/successful/slow broadcasts and denied/unsupported/SDK-unavailable permissions. Run `node scripts/prepare-notification-browser.mjs cleanup` and stop the preview before building. Never include this temporary route in a deployment.

Real delivery verification requires one explicitly identified test account and subscribed device on the configured production origin. Check foreground toast, background notification with the app closed, click destination, role/user mapping, and logout/account switching. Compare the OneSignal notification ID and delivery record with device receipt. Never use a whole-member broadcast as a test message.

For admin UI polish, run `node scripts/check-admin-polish.mjs http://127.0.0.1:3110` against a local development server. The temporary route imports the real admin pages; browser fetch interception supplies synthetic members, sessions, credits and failures. It never sends a live mutation or notification. The checks cover nested calendar/clock/selector focus, safe destructive confirmations, pending/error/success states, clearable searches, bounded lists, short/mobile/desktop sheets and reduced motion. Screenshots and results are saved in `scratch/admin-polish-qa/`, and the temporary route is removed even on failure. Run `audit_project.py . --mode strict --config premium-ui.admin.json` with the Frontend Design Premium skill to audit the admin scope and shared UI primitives.

For the member navigation and confirmation layout, run `node scripts/check-member-navigation.mjs http://127.0.0.1:3100` against a local development server. It creates an exclusive temporary route with synthetic workouts, checks scrolling, keyboard focus, modal isolation, busy dismissal, short screens, long content, and reduced motion, then removes the route. Screenshots and the JSON report are saved in `scratch/member-navigation-qa/`. It never submits a booking or cancellation.

Run `npm run stress:bookings -- 30 3` to create 30 synthetic trainees and race them for three lesson spots. The defaults are 12 trainees and three spots; the harness caps trainee count at 30 because a 50-user run hit Supabase Auth's free-tier request-rate limit before bookings began. Run `npm run stress:edge` for double-spending, late cancellation, unverified purchase, and profile role checks. Run `npm run stress:admin` for lesson creation, invitations, refunds, deletion, and ticket adjustments. The scripts use randomly generated, administrator-created email/password accounts only inside tests. The app's Google-only sign-in stays unchanged. No email is sent.

The script loads the project URL and publishable key from `.env.local` and a server-side `SUPABASE_SECRET_KEY` from `.env.stress.local`. Both files are Git-ignored. Never add the secret key to a `NEXT_PUBLIC_` variable or a client bundle.

The tests print JSON reports and exit nonzero on failed assertions. They clean up their own tagged sessions, tickets, bookings, and synthetic Auth users even when a check fails. A cleanup error appears in the report and should be resolved before another run.

This exercises the real Supabase Auth and database APIs. It is a bounded correctness/concurrency test, not a traffic benchmark for the Next.js server or Google OAuth itself. Run it against a development project or an isolated test branch.

For a live UI booking check, run `node scripts/ui-fixture.mjs setup "<exact profile name>"` for an account already signed in through Google. The script creates one labeled disposable class and one ticket, then stores their IDs in Git-ignored `.ui-fixture.json`. Book and cancel that class in the deployed app, verify the seat and credit displays, and run `node scripts/ui-fixture.mjs cleanup` even if the UI test fails. The cleanup deletes only records with those stored IDs.
## Final correctness campaign

`final-correctness.mjs` runs against the configured live Supabase project and TB-Gym deployment. It needs explicit authorization for disposable mutation testing and `ALLOW_LIVE_CORRECTNESS=1`. `AUTH_TEST_MODE=otp` exercises real generated OTP verification without sending email; the default exercises password sign-in. Credentials stay in ignored `.env.local` and `.env.stress.local`.

The campaign reuses 24 synthetic trainees and two synthetic administrators for bounded races of up to 48 booking attempts or 56 mixed commands. It covers bulk creation, reversed private invitations, cross-session spending, expiry/cutoff boundaries, mixed adjustments, permissions, HTTP load at 8/16/32 workers, concurrent duplicate delivery, lost acknowledgments, request ownership, and atomic rollback of failed retry intents. Every write uses fixture IDs or a unique run marker. It checks persisted bookings/tickets and independently verifies fixture removal, including internal mutation receipts. It records a credential-free manifest, assertions, failure evidence and latency distributions under ignored `scratch/final-stress/<run-id>/`.

Run from the project root in PowerShell:

```powershell
$env:ALLOW_LIVE_CORRECTNESS='1'
$env:AUTH_TEST_MODE='otp'
node scripts/final-correctness.mjs
```

This creates temporary sessions that can be visible in the live schedule while the run is active. Do not run overlapping campaigns or use unbounded loads. Valid notification sends and real Bit payments are excluded. The OTPs are generated by the Auth administration API and never delivered; this does not certify email delivery, Google OAuth, or manual payment reconciliation.

`check-onboarding-correctness.mjs http://127.0.0.1:3111` imports the actual onboarding component into a temporary local route. It injects returned database errors, verifies draft retention/retry, completion ordering, contrast, and repeated-submit protection. All network calls to Supabase and OneSignal are blocked; the route is removed in `finally`.

`final-auth-lifecycle.mjs` requires the same explicit live-test switch. It generates one undelivered signup token and uses the OTP type read from the actual landing component to check first-time and returning login, wrong codes/passwords, token replay, confirmation, refresh/sign-out and identity/profile cleanup. Role metadata must not promote a new user.

`final-deployed-flows.mjs` requires `ALLOW_LIVE_CORRECTNESS=1` and `EXPECTED_APP_VERSION` matching `/api/app-version`. It opens an isolated headless test browser against production, creates one disposable signup identity, intercepts the email-send request, and enters generated undelivered codes in the actual deployed login screen. It injects rejected health/profile writes, verifies the completion flag remains false, retries successfully with repeated submit activation, verifies ordered real saves, and tests returning login. It records screenshots without codes or credentials and independently confirms fixture removal. Run it separately from the full concurrency campaign.

## Deeper lock and retry checks

`deep-lock-boundaries.mjs` requires the live-test switch and a separately executed, fixture-only SQL blocker. Start the script, inspect its printed `blocker.sql`, then paste that exact file into the database SQL editor. Immediately before clicking Run, write `cue.json` in the run directory containing `{ "beginAt": <current Unix milliseconds + 18000> }`. Writing the cue and clicking Run must happen in one automation step, so requests begin while the SQL holds its own fixtures for 23 seconds. API requests wait only the final few seconds, below their eight-second timeout. The harness rejects inconclusive trials that missed the lock window or hit resource timeouts. It covers ten deadline crossings, valid-ticket fallback, and rollback after later booking/refund locks. If the blocker is never started, the script cleans up after ten minutes. Do not use a blocker from another run or change global timeout settings.

`deep-balance-snapshot.mjs` reproduces mutable offset-page miscounts using 1,200 disposable tickets across four trainees. It then checks the single-snapshot administrator query, expired-ticket exclusion, administrator/member permissions, 32 simultaneous adjustments, independent balances, and fixture/receipt cleanup.

`deep-deployed-admin-retries.mjs` requires the live-test switch and `EXPECTED_APP_VERSION` matching production. It uses the actual deployed admin pages with one disposable administrator and trainee. A database mutation commits through the authenticated API, its browser reply is deliberately dropped, and the actual form retries. It covers reload persistence and triple-submit protection, asserts exactly one ticket grant/class, filters displayed lists to its own records, intercepts all notification delivery, and independently verifies cleanup. Run these live campaigns sequentially.

`node --experimental-strip-types --test scripts/test-admin-mutation-intent.mjs` checks retained retry intent, module reload, different actors/payloads, acknowledged new actions, and unavailable storage without touching the network.

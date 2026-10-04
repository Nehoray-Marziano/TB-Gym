# Final correctness campaign — 5 October 2026

**Result: four confirmed defects; production is not yet cleared.** The fixes are prepared locally. Automatic approval review blocked live schema/security changes because the request authorized testing, not applying production fixes. The database corrections and application deployment await explicit approval, followed by another full live pass.

The deployed application under test was `4ac18b827fcf4b9a7af64f49bf8a8abf8eb3c1f5` on `https://tb-gym.vercel.app`, with Supabase project `asoqaeujdduqqjfyayht`. Vercel reported Ready; Supabase reported Healthy, Nano compute, and no separate test branch. Tests used uniquely tagged synthetic accounts/sessions in this project. Existing member balances, profiles and bookings were never mutation targets.

## Confirmed findings and prepared fixes

| Finding | Evidence | Prepared correction | Verification status |
| --- | --- | --- | --- |
| Concurrent private-session invitations can deadlock when the same trainees are listed in opposite orders | 32 simultaneous creations with enough tickets produced 16 `40P01` deadlocks and four `57014` statement timeouts; 12 creations succeeded. Transactions rolled back coherently. | Migration 17 visits invited UUIDs in ascending order, preserving validation, ticket choice and atomic creation. | Reproduced live; correction awaits application and live rerun. |
| Anonymous clients can write the subscription-price catalog | A public-key client inserted one uniquely named disposable tier. The service client removed it and confirmed zero residue. Live SQL inspection confirmed default write grants and RLS disabled. | Migration 18 enables RLS with public SELECT and administrator-only mutations. | Reproduced live; correction awaits application and permission rerun. |
| Onboarding ignores returned write errors and can mark a profile complete before its declaration is saved | Browser fault injection rejected the declaration; the original page marked onboarding complete and showed its success/loading view. | Check both returned errors, save declaration before completion, retain the form with an announced retry error, and synchronously guard repeat submission. | Seven browser assertions pass after the local correction, including both write failures, retry, contrast and duplicate activation. |
| First-time email signup cannot verify a valid code through the app's `magiclink` path | Real signup OTP rejected as `otp_expired` with `magiclink`, then accepted with `email`. Returning-member magiclink OTP worked. | LandingPage uses `type: "email"` for email-code verification. This matches [Supabase's passwordless-email documentation](https://supabase.com/docs/guides/auth/auth-email-passwordless). | Real Auth rerun using the verification type read from the corrected component: 13/13 assertions pass. No email was delivered. |

## Live campaign results

| Run | Assertions | RPC calls | HTTP requests | Accounts | Sessions created | Result |
| --- | --- | --- | --- | --- | --- | --- |
| `final-1791150347072-8be488f2` | 419/425 passed | 1,211 | 186 | 26 | 177 | Six failures came from an invalid test route, `/admin/bookings`; bookings belong to `/admin/schedule`. Corrected before the next run. |
| `final-1791150647769-733fb359` | 433/435 passed | 1,353 | 183 | 26 | 221 | Two assertions failed on the private-invitation deadlock and its resulting missing invitations. All other assertions, including HTTP and cleanup, passed. |
| `final-auth-1791151942144-53b787b0` | 13/14 passed | Auth-specific | — | 1 | — | Reproduced the first-time signup verification defect. |
| `final-auth-1791152040823-6c6026b7` | 13/13 passed | Auth-specific | — | 1 | — | Corrected email OTP type passed first-time/returning login and lifecycle checks. |

Across the two main campaigns: **2,564 real RPC calls, 369 HTTP requests, 52 disposable accounts and 398 created sessions**, plus two separately cleaned Auth lifecycle accounts. This is a bounded correctness/load campaign, not a measured maximum capacity or long-duration soak.

Passed scenarios include:

- Concurrent account provisioning, default trainee role, concurrent own-profile/declaration saves, session refresh and sign-out.
- Anonymous and trainee denial of administrator RPCs, self-promotion/identity tampering, other-user profile/declaration writes, private-record reads, direct booking insertion and ticket minting.
- 80 concurrent session creations at 16 workers, unique persistence, invalid-input rollback, invitation rollback when the second trainee lacks a ticket, and bulk deletion.
- Twelve booking waves with 24 identities and up to 48 simultaneous attempts, capacities 1/3/7/12, exactly filled slots, unique bookings, correct public occupancy and one ticket per booking.
- Eight races of one ticket across eight lessons, 32 duplicate booking calls, 32 duplicate cancellation calls, twelve cancellation/slot-turnover races, and 32 different lessons booked concurrently by one sufficiently funded trainee.
- Adjustment limits ±100, zero/null/out-of-range/missing-user rejection, 48 mixed concurrent additions/reductions by two administrators, 24 reductions competing for one ticket, and twelve booking-versus-reduction races for the last ticket.
- Expired-ticket exclusion, protection of consumed tickets, refunds, cancellation at −1/5/9.99/10.01/24 hours, missing/started sessions, and competing administrator/member cancellation/deletion.
- Real deployed role guards, invalid/unauthorized notification requests rejected before provider calls, and correct pages at HTTP concurrency 8/16/32.
- Persisted ticket/bookings/capacity invariants and independent cleanup verification. **All created fixture accounts, profiles, declarations, tickets, subscriptions, legacy credits, bookings and sessions were confirmed absent after every completed live run.** The catalog probe was independently confirmed absent too.

Slot turnover correctly permits all contenders to observe the full lesson before the cancellation commits; it requires serializable outcomes and capacity/ticket conservation, not an arbitrarily predetermined winner.

## Latency evidence

In the corrected pre-fix campaign, booking RPCs had p50 **355 ms**, p95 **468 ms**, maximum **776 ms** across 691 calls. Ticket adjustment p95 was **602 ms**. The faulty private-creation race raised session-creation p95 to **8,411 ms**, maximum **11,436 ms**. Production page-request p95 values were approximately 1.3–2.5 seconds for authenticated pages. Measurements include this client's network path to Tokyo and are not server-only timings or performance guarantees.

## Local browser/build checks

- Admin interaction suite: **56/56** passed when run independently, including failed mutation retries, nested popups, focus, reduced motion and 320×284 through 1280×800 geometry. An earlier overlapping fixture run was interrupted by development route rebuilds; its isolated rerun passed.
- Member navigation/modal suite: **46/46** passed.
- Onboarding failure/retry suite: **7/7** passed; error text contrast was **5.82:1**.
- Gym-data/PWA unit suite: **13/13** passed.
- Scoped ESLint has zero errors and two existing image-element warnings in LandingPage. TypeScript and the final production build including both application corrections passed.
- Temporary fixture routes were removed in `finally` and excluded from the production route set.

Credential-free detailed evidence lives under ignored `scratch/final-stress/<run-id>/`, `scratch/onboarding-correctness/`, `scratch/admin-polish-qa/`, and `scratch/member-navigation-qa/`. No passwords, OTPs, access/refresh tokens, secret keys or authorization headers are written into the reports. The scripts require an explicit live-test switch for future runs.

## Limits and release gate

Actual Resend/SMTP delivery, Google OAuth, physical iOS/Android devices, OneSignal delivery, real Bit payments and manual payment reconciliation were not exercised. Valid notification sends were avoided; browser fixtures intercepted provider calls. The app's adjustable balance is a count of session tickets, not a cash wallet. No payment or money transfer was made.

After approval: apply migrations 17 and 18 in Supabase, repeat the full campaign including catalog permissions and reversed invitations, push/deploy the source fixes, verify Vercel Ready, and repeat deployed smoke checks. Until that passes, the two database findings and the two unshipped application findings remain live risks.

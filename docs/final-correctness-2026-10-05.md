# Final correctness campaign — 5 October 2026

**Result: all four initially reported defects, plus a newly exposed onboarding-routing gap, are fixed and verified in production.** After the user's explicit approval, migrations 17 and 18 were applied together in Supabase, the source corrections were pushed, and production was verified at application commit `8df103f7e9272f35d2dd89216322f7d33bef6699`. The post-fix campaign passed **453/453** assertions, the deployed signup/onboarding browser flow passed **17/17**, and the real Auth lifecycle passed **13/13**. Cleanup was verified independently. The tested flows are cleared within the limits below.

The initial application under test was `4ac18b827fcf4b9a7af64f49bf8a8abf8eb3c1f5` on `https://tb-gym.vercel.app`, with Supabase project `asoqaeujdduqqjfyayht`. Vercel reported Ready; Supabase reported Healthy, Nano compute, and no separate test branch. The source fixes first deployed as `9fedc9c`; the additional routing correction deployed as `8df103f`. Production promotion was confirmed through the uncached `/api/app-version` endpoint before the passing browser and full live campaigns. Tests used uniquely tagged synthetic accounts/sessions in this project. Existing member balances, profiles and bookings were never mutation targets.

## Confirmed findings and applied fixes

| Finding | Evidence | Applied correction | Verification status |
| --- | --- | --- | --- |
| Concurrent private-session invitations can deadlock when the same trainees are listed in opposite orders | 32 simultaneous creations with enough tickets produced 16 `40P01` deadlocks and four `57014` statement timeouts; 12 creations succeeded. Transactions rolled back coherently. | Migration 17 visits invited UUIDs in ascending order, preserving validation, ticket choice and atomic creation. | Post-fix live race: all 32 creations and all 64 invitations succeeded; ticket conservation and subsequent refunds passed. No deadlocks or statement timeouts in this race. |
| Anonymous clients can write the subscription-price catalog | A public-key client inserted one uniquely named disposable tier. The service client removed it and confirmed zero residue. Live SQL inspection confirmed default write grants and RLS disabled. | Migration 18 enables RLS with public SELECT and administrator-only mutations. | All 12 live catalog assertions passed: anonymous/trainee insert, update and deletion denied; administrator insert, update and deletion allowed; denied mutations preserved the fixture's price; fixture removed. |
| Onboarding ignores returned write errors and can mark a profile complete before its declaration is saved | Browser fault injection rejected the declaration; the original page marked onboarding complete and showed its success/loading view. | Check both returned errors, save declaration before completion, retain the form with an announced retry error, and synchronously guard repeat submission. | Local browser checks passed; deployed browser checks also proved both rejected-save recovery paths, false completion flag, retained answers, successful real retry, and exactly one ordered pair of writes under repeated activation. Declaration and profile saves remain two separate writes: a later profile failure leaves the declaration saved and onboarding incomplete. |
| First-time email signup cannot verify a valid code through the app's `magiclink` path | Real signup OTP rejected as `otp_expired` with `magiclink`, then accepted with `email`. Returning-member magiclink OTP worked. | LandingPage uses `type: "email"` for email-code verification. This matches [Supabase's passwordless-email documentation](https://supabase.com/docs/guides/auth/auth-email-passwordless). | Real Auth lifecycle rerun: 13/13 passed. Actual deployed login handled wrong-code retry, first-time signup and returning login; captured verification requests used `email`. No email was delivered. |
| New trainees can bypass onboarding and enter member screens | The first deployed browser flow accepted the corrected signup code but landed on `/dashboard`; the member layout had no completion check. | Include the completion flag in the existing profile bootstrap and redirect incomplete trainees from the server member layout to `/onboarding`. | Deployed signup now enters onboarding, successful completion reaches the dashboard, and returning login works. Full campaign separately verified incomplete trainees redirect from both `/dashboard` and `/book`. |

## Live campaign results

| Run | Assertions | RPC calls | HTTP requests | Accounts | Sessions created | Result |
| --- | --- | --- | --- | --- | --- | --- |
| `final-1791150347072-8be488f2` | 419/425 passed | 1,211 | 186 | 26 | 177 | Six failures came from an invalid test route, `/admin/bookings`; bookings belong to `/admin/schedule`. Corrected before the next run. |
| `final-1791150647769-733fb359` | 433/435 passed | 1,353 | 183 | 26 | 221 | Two assertions failed on the private-invitation deadlock and its resulting missing invitations. All other assertions, including HTTP and cleanup, passed. |
| `final-1791173463539-c24dab85` | **453/453 passed** | **1,373** | **185** | **26** | **241** | Post-fix production pass, including the reversed private invitations, expanded catalog permissions, incomplete-user route checks and independent cleanup. |
| `final-auth-1791151942144-53b787b0` | 13/14 passed | Auth-specific | — | 1 | — | Reproduced the first-time signup verification defect. |
| `final-auth-1791152040823-6c6026b7` | 13/13 passed | Auth-specific | — | 1 | — | Corrected email OTP type passed first-time/returning login and lifecycle checks. |
| `final-auth-1791173143761-9cc159da` | **13/13 passed** | Auth-specific | — | 1 | — | Final Auth lifecycle rerun; fixture identity/profile confirmed absent. |
| `final-ui-1791173339235-c300e23d` | **17/17 passed** | Deployed UI | — | 1 | — | Actual production signup, onboarding failure/retry, repeated activation, returning login and independent cleanup. |

Across the two main campaigns: **2,564 real RPC calls, 369 HTTP requests, 52 disposable accounts and 398 created sessions**, plus two separately cleaned Auth lifecycle accounts. This is a bounded correctness/load campaign, not a measured maximum capacity or long-duration soak.

The post-fix full campaign adds 1,373 RPC calls, 185 HTTP requests, 26 accounts and 241 sessions. Two early deployed UI attempts stopped before Auth verification because the harness clicked before hydration/sheet animation settled; those fixtures were removed. The next attempt verified signup but exposed the genuine missing onboarding route check described above. Its fixture was removed, the routing fix was deployed, and the final 17/17 deployed flow passed. These earlier attempts remain in the ignored evidence directory rather than being relabeled as passing runs.

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

In the post-fix campaign, all session-creation RPCs had p95 **964 ms**, maximum **1,174 ms**, with the private race succeeding completely. Booking p95 was **1,759 ms** and ticket adjustment p95 **1,223 ms** under this run's client/network conditions. Correctness passed throughout; the measurements do not establish an overall latency improvement or a maximum production capacity.

## Local browser/build checks

- Admin interaction suite: **56/56** passed when run independently, including failed mutation retries, nested popups, focus, reduced motion and 320×284 through 1280×800 geometry. An earlier overlapping fixture run was interrupted by development route rebuilds; its isolated rerun passed.
- Member navigation/modal suite: **46/46** passed.
- Onboarding failure/retry suite: **7/7** passed; error text contrast was **5.82:1**.
- Gym-data/PWA unit suite: **13/13** passed.
- Scoped ESLint has zero errors and two existing image-element warnings in LandingPage. TypeScript and the final production build including both application corrections passed.
- The additional routing correction passed scoped ESLint, TypeScript, the existing 13 unit assertions and another production build before deployment. The deployed browser suite and full live campaign then passed against that application version.
- Temporary fixture routes were removed in `finally` and excluded from the production route set.

Credential-free detailed evidence lives under ignored `scratch/final-stress/<run-id>/`, `scratch/onboarding-correctness/`, `scratch/admin-polish-qa/`, and `scratch/member-navigation-qa/`. No passwords, OTPs, access/refresh tokens, secret keys or authorization headers are written into the reports. The scripts require an explicit live-test switch for future runs.

The final read-only audit also passed **10/10** independent assertions: anonymous clients see all three real public plans with exactly the reference prices; no final-test Auth identities, profiles, declarations, tickets, subscriptions, legacy credits, bookings, sessions or catalog fixtures remain across the historical final-test manifests. Its evidence is `scratch/final-stress/post-fix-independent-verification.json`. The deployed failure/retry screenshots are under `scratch/final-stress/final-ui-1791173339235-c300e23d/`.

## Limits and release gate

Actual Resend/SMTP delivery, Google OAuth, physical iOS/Android devices, OneSignal delivery, real Bit payments and manual payment reconciliation were not exercised. Valid notification sends were avoided; browser fixtures intercepted provider calls. The app's adjustable balance is a count of session tickets, not a cash wallet. No payment or money transfer was made.

Migrations 17 and 18 are applied; both application corrections and the additional member-layout check are deployed. The full post-fix campaign, deployed browser flow and Auth lifecycle pass. This clears the tested signup/onboarding, authorization, booking, private invitation, session creation/deletion, ticket adjustment/refund and catalog-permission flows. Actual email delivery, OAuth, notifications, real payments, physical devices and extended capacity/soak testing remain outside this clearance.

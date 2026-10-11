# Production scan — 11 October 2026

This records the initial cleanup scan. The subsequently authorized [live correctness campaign](correctness-campaign-2026-10-11.md) adds real disposable database/Auth tests, updated browser/layout results, an email-code fix and an occupancy migration now applied and verified live. Use that follow-up for current correctness status.

Scope: the `TB-Gym` application, starting from clean `main` at `900753f`. Reviewed source/import reachability, route entry points, public asset references, configuration, dependency security, authentication, asynchronous reads, mutation recovery, shared UI, maintenance scripts and local test coverage. The referenced workspace `BOOST.md` was unavailable. No live database mutations, actual notification deliveries, payments, push or deployment were performed.

## Cleanup

- Removed six empty source directories: `src/app/book`, `dashboard`, `my-bookings`, `profile`, `src/fonts` and `src/styles`. The active member routes remain in the `(trainee)` group.
- Removed the zero-byte `22` file and five unreferenced Next.js starter SVGs: `file`, `globe`, `next`, `vercel` and `window`.
- Archived the unused favicon backup and old contrast inspection JSON into ignored `scratch/archived-cleanup/`.
- Removed stale `.next-home-dev`, `.next-qa` and `.uv-cache` artifacts. Generated build variants are excluded from lint and Git; TypeScript scans actual source and current generated route types.
- Removed unused GSAP; moved canvas-confetti types into development dependencies. Emotion remains necessary for MUI's peer dependencies.
- The final import graph has no unreachable application modules, and the maintained app tree has no empty source folders or zero-byte files. Historical migrations, asset-generation scripts, original artwork and older public PWA icons remain purposeful maintenance/compatibility inputs. Other workspace QA archives and Git worktrees remain outside the production app.

## Fixes

| Finding | Result |
| --- | --- |
| Outdated framework and transitive dependencies; 31 audit findings including one critical | Next.js / ESLint config 16.4.0, React / React DOM 19.3.0, Sharp 0.35.5, patched PostCSS and compatible transitive updates. Workbox build/plugin 7.4.1 are explicitly overridden to repair their pinned dependency tree. Final audit: six high findings, zero critical/moderate/low. |
| OAuth destinations accepted browser-normalized backslashes and unvalidated return paths | Same-origin destination helper rejects external, malformed and encoded slash/backslash paths. Callback failure URLs omit raw provider errors. |
| Only administrator routes persisted refreshed authentication cookies | Member, subscription and onboarding routes now refresh cookies before rendering. Layouts retain independent identity/role checks. Server Components cannot write refreshed cookies; this follows the [Supabase SSR contract](https://supabase.com/docs/guides/auth/server-side/nextjs). |
| Older booking reads could replace newer results; storage errors could interrupt committed flows | Request generations reject superseded responses. Reads have bounded timeouts and explicit retry states. Optional session cache operations cannot throw into a successful sign-in/booking. |
| Failed health reads could initialize blank editable values | Account editing waits for successful profile, balance and health reads. A failed read retains server data and shows retry. Late responses are ignored after cleanup. |
| Repeated booking/auth/profile activation and thrown network errors could duplicate work or strand controls | Synchronous locks and finally cleanup protect submissions. Missing booking acceptance is treated as failure. Sign-out errors are visible. Cancellation balance changes follow confirmed server refresh instead of an optimistic increment that could race with another account/read. |
| Login sheet declared modal behavior without native focus containment | Shared StudioModal auth variant owns focus, inert background, Escape, restoration and busy dismissal. Email/OTP validation is app-owned with field-associated errors. |
| Missing route/root recovery and default missing-page experience | Hebrew AppRecovery screens provide return/retry controls. Error boundaries use Next 16.4's re-fetching retry API and busy transition state. |
| UI and repository drift | Shared booking-message translation; visible inherited scrollbars; dimensioned decorative images; React effect cleanup; current cancellation guidance; unused script locals removed; edited sources formatted. |
| Incomplete production setup and headers | Real project README, safe `.env.example`, Node engine requirement, repeatable check/test/typecheck scripts, and nosniff/frame/referrer headers. |

## Verification

- Unit/regression suite: **141 tests pass**. New cases exercise actual helpers/handlers for redirect normalization, inaccessible storage, failed health reads, response ordering, read retry, duplicate booking/email submission and transport failure recovery.
- Repository ESLint: **zero errors and zero warnings**.
- TypeScript: **passes**, including `--noUnusedLocals --noUnusedParameters`; regenerated route types contain no temporary QA routes.
- Strict frontend audit: **zero findings** across the full source and the existing admin manifest.
- Production webpack build: **passes** with the real bundled Google Font. All temporary test routes were removed before the release build. Final route inventory retains the intended public/member/admin/API/PWA routes.
- Broad local smoke: **passes at 390×844 and 1366×768**, with 38 screenshots covering login/OTP error/Escape, onboarding validation, account edit, populated/empty bookings, cancellation, admin/class dialogs, offline recovery and auth-error UI. Representative login/account screenshots were visually inspected.
- Admin browser suite: **61 checks pass**, including nested Hebrew date/time pickers, keyboard focus, busy dismissal, retained drafts, failure/retry, lost mutation acknowledgments, ticket conservation in the mock, list bounds, empty/error states, short/narrow/wide geometry and reduced motion.
- Local production HTTP/browser suite: **15 checks pass** for public/legal routes, protected-route redirects, anonymous notification-API rejection, security headers, the build-version endpoint, intro rendering and Hebrew 404 recovery at 320×568, 390×844 and 1280×800. The login traps focus across twelve Tab activations and restores its trigger after Escape.
- Native startup verification passes for cache cleanup, early metadata, authentication redirects, Android manifest/icons and all 46 opaque, centered Apple startup images. This verifies the artifact; physical installation behavior remains separate.
- Dedicated home and booking layout suites remain **unverified**: their local development-route navigation/compilation requests timed out. The smoke suite covers the introduction/account/bookings; it does not replace those detailed layout matrices. Test harnesses now warm newly discovered routes before browser deadlines, use future-relative fixture dates and target current admin labels. The timed-out fixtures were removed.
- Package declarations and lockfile agree; the final empty-file/import inventory and Git whitespace check pass. Logs, mocked browser screenshots and raw audit reports remain ignored under `scratch/`.

## Remaining release risks

Six npm high findings originate from unpatched `braces` and its parent glob/PWA/lint packages. The [reviewed advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version. Here those dependencies process build/lint patterns; no application endpoint was found that passes user input to them. That is a scope assessment, not a security waiver. Recheck upstream before release. Do not force npm's suggested framework/PWA downgrades to hide the advisory.

Local fixtures do not prove the deployed database migrations/RLS/RPCs, actual OAuth or email delivery, OneSignal account configuration/identity verification and delivery, manual payment reconciliation, physical-device installation/splash/offline behavior, or all home/booking layout cases. Validate those against the intended deployment and controlled test accounts before declaring the entire system production-certified.

The source is cleaned and hardened, but the unresolved advisory and verification limits above prevent an unconditional production-ready claim. No deployment was made.

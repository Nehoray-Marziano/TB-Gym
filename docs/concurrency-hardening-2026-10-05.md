# Deeper concurrency hardening — 5 October 2026

Three additional correctness gaps were addressed. Migrations 19–21 are applied in Supabase. The ten held-lock failures now pass their exact reproduction, the expanded database campaign passed 595/595 assertions, the 1,200-ticket balance campaign passed 18/18, and the actual admin components passed 61/61 isolated browser checks. Fix commit `f140f7caa5f6d823bb2bdd79c55db56576d42f40` was pushed to main and verified through the uncached production app-version endpoint. The actual deployed admin forms then passed 18/18 real lost-reply/reload/triple-submit checks.

## Problems in plain English

**A request could become too late while it waited.** The database remembered the time when the request began. If another operation held a needed record, the request could wait until its ticket expired, its class began, or its cancellation deadline passed, and still succeed. Ten controlled cases reproduced this, including waits late in the operation while inserting a booking or refunding a ticket. A locked expired ticket also displaced a second valid ticket.

Migration 19 uses the actual current time after waits. It skips a ticket that expired while its lock was being acquired and looks for a valid replacement. It checks deadlines again after potentially blocking writes. If a booking, refund, grant, or private invitation becomes too late, the whole operation rolls back. Administrators retain their existing ability to cancel a member's booking after the member cutoff. This distinction between transaction-start time and wall-clock time is documented by [PostgreSQL](https://www.postgresql.org/docs/current/functions-datetime.html).

**A lost success reply could make retry apply an action twice.** The server can finish adding tickets or creating a class while the internet connection loses its reply. The previous admin forms kept their drafts and invited retry, but their next request was another complete mutation.

Migration 20 stores an actor-owned request receipt and the mutation result in the same transaction as the action. Concurrent deliveries wait for that receipt and return its original result. Reusing an ID for a different payload, another action, or another administrator is rejected. Failed actions leave neither their changes nor a successful receipt. Internal receipts cannot be read or forged directly by clients. The updated forms preserve unresolved request IDs in tab storage across retries and reloads, hashing the form payload instead of storing its member IDs or description. A changed payload or acknowledged new action gets a new ID. Balances refresh from the server after acknowledgment rather than adding to a stale displayed number.

**Counting tickets across changing pages could show the wrong balances.** The old admin list fetched up to 1,000 ticket rows, then fetched the next page by offset. If a booking or adjustment removed a row from the available list in between, the next offset skipped a ticket belonging to a different member. In the controlled reproduction, the overall sum looked reasonable while two individual balances were wrong.

Migration 21 returns trainee profiles and available-ticket counts from one statement snapshot. It avoids the mutable offset count, excludes used/expired tickets and administrator profiles, and preserves administrator-only access. The browser shows a read error if this query fails; it does not invent zero balances.

## Reproduction and verification

| Campaign | Result | Evidence |
| --- | --- | --- |
| Expanded baseline before the new fixes | 565/565 assertions; 1,972 RPCs; 185 HTTP requests; 26 identities; 305 sessions | `scratch/final-stress/final-1791181302204-7803747b/report.json` |
| Initial conclusive held-lock reproduction | All seven business expectations failed; requests waited about 7.6 seconds; all fixtures removed | `scratch/deep-concurrency/deep-boundary-1791181132375-f8202584/report.json` |
| Expanded held-lock reproduction | All ten business expectations failed; requests waited about 6.4 seconds; all fixtures removed | `scratch/deep-concurrency/deep-boundary-1791181763380-3a889fa9/report.json` |
| Same ten cases after migration 19 | 17/17 assertions, including the wait guard and independent cleanup; requests waited about 5.8 seconds | `scratch/deep-concurrency/deep-boundary-1791182234907-7c616edb/report.json` |
| Expanded regression after migrations 19–20 | 595/595 assertions; 2,072 RPCs; 185 HTTP requests; 26 identities; 308 sessions | `scratch/final-stress/final-1791182526306-abfa457d/report.json` |
| Mutable balance-page reproduction and snapshot correction | 18/18 assertions; 1,200 tickets; 32 concurrent adjustments; five identities | `scratch/deep-concurrency/deep-balance-1791183204451-7e0b4859/report.json` |
| Actual admin components, synthetic network responses | 61/61 browser checks; mobile, short screens, desktop, focus, modal dismissal, retries and reduced motion | `scratch/admin-polish-qa/results.json` |
| Actual deployed admin UI and real disposable writes | 18/18; lost committed grant reply, reload and triple-submit, lost committed class reply and triple-submit, exactly one grant/class, independent cleanup | `scratch/deep-concurrency/deep-admin-ui-1791184059470-4a120972/report.json` |
| Mutation-intent, gym data and service-worker units | 18/18 tests | `scripts/test-admin-mutation-intent.mjs`, `scripts/test-gym-data.mjs`, `scripts/test-pwa-update.mjs` |
| Independent read-only audit of all recorded campaigns | 12/12; 19 runs, 190 account IDs, 1,285 recorded session IDs, all run markers and internal receipts checked; zero residue | `scratch/deep-concurrency/independent-all-campaign-verification.json` |

Eight mixed-operation waves each overlap 56 booking, cancellation, deletion, ticket adjustment and private-session commands. All 112 reconciliation checks passed, with no detected deadlocks, lock timeouts or statement timeouts. Checks include handled SQL errors returned inside JSON, capacity, unique bookings, exactly one spent ticket per confirmed booking, coherent ticket links, per-member ticket conservation and complete refunds after removal.

Retry checks include 24 simultaneous deliveries of one positive grant, 24 deliveries of one reduction, 24 reversed-order deliveries of one private creation, deliberately discarded committed replies, distinct intentional actions, payload/operation/actor binding, receipt access denial, and retry after an insufficient-ticket rollback. Integer minimum/maximum adjustment inputs are rejected safely without arithmetic overflow.

The first two timing-harness trials were inconclusive: one started after the SQL batch committed and the second hit API timeouts. They are not evidence of application defects or passing correctness. Their fixtures were removed. The synchronized conclusive trials above verify actual waits below API timeouts; the final harness rejects inconclusive runs before assessing business outcomes. An initial local browser fixture also needed an SSR-only guard around its synthetic authentication setup; the corrected final fixture passed all checks.

Scoped ESLint, TypeScript and the production Next.js build passed. No temporary test route is shipped. Real-member records were never mutation targets. Every listed completed campaign independently verified its test identities and database fixtures absent; receipt cleanup follows the fixture administrator's profile deletion.

The deployed grant started with five tickets. Its first two-ticket adjustment committed, but the response was intentionally dropped before the browser could acknowledge it. After reloading the page, the same two-ticket form was submitted three times in immediate succession. The UI sent one retry with the original request ID, the database retained seven tickets, and the displayed balance refreshed to seven. The same lost-response/triple-submit sequence persisted one class and displayed one schedule card. List reads were filtered to test records; the one notification request was intercepted and never delivered. Screenshots are in the deployed run directory, including `grant-retry-once.png` and `class-retry-once.png`.

## Scope and practical limits

These are bounded correctness tests, not a guarantee that all possible bugs or traffic levels have been eliminated. Actual email/push delivery, Google OAuth, physical devices, cash/Bit payments and manual reconciliation remain outside this campaign. Ticket adjustments represent session credits.

Retry protection applies to the updated UI and `*_once` RPCs using the same request ID. Clearing tab storage, switching tabs, or using an older client can start a different intent. Storage-blocked browsers retain in-memory retries, but cannot retain an unresolved intent through reload. Legacy administrator RPC signatures remain available for compatibility and distinct intentional operations; they do not infer whether identical calls are retries. Receipts intentionally preserve the original committed result even if a later action changes the balance or removes the class. They must not be casually pruned while their request IDs can still be retried.

The snapshot represents one database read, not a continuously live balance. Subsequent actions can change it; write-time validations remain authoritative. Existing 10-hour cancellation and ticket expiry rules are preserved.

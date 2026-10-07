# Notification QA — 7 October 2026

All ten existing notification trigger handlers passed local success/failure checks. The notification suite has 107 passing checks; 13 related PWA/data checks also pass. Changed-code ESLint, TypeScript and the production webpack build pass. This report records local verification before publication; it does not certify deployment or real-device delivery.

## Coverage

| Trigger | Target | Checks |
| --- | --- | --- |
| Member booking | Administrators | Successful booking sends once; failed booking does not send; notification failure preserves booking |
| Member cancellation from schedule | Administrators | Success/failure and notification failure after committed cancellation |
| Member cancellation from My bookings | Administrators | Same checks using that screen's actual handler |
| Schedule update broadcast | Trainees | Correct target; failed send keeps confirmation; successful send acknowledges |
| Quick broadcast and its presets | Trainees | Correct target; retained draft/error; slow-send controls; duplicate submission prevented |
| Delete class | Its booked users | Correct user IDs; no send for empty roster; failed mutation does not send; notification failure preserves deletion |
| Remove attendee from schedule | Removed user | Correct user ID; failed mutation does not send; separate delivery-failure feedback |
| Remove attendee from quick roster | Removed user | Same checks using the quick roster handler |
| Trainee page credit adjustment | Adjusted user | Correct user and amount; failed mutation does not send; separate delivery-failure feedback |
| Quick credit adjustment | Adjusted user | Same checks; negative adjustment included |

The tests execute the actual TypeScript routes, SDK lifecycle module/provider, and extracted production handlers. Supabase, browser state and OneSignal/network boundaries are controlled doubles. These are functional regression tests, not real provider/device delivery tests.

Additional coverage includes authentication/authorization, malformed JSON and IDs, targeting and safe click URLs, provider HTTP failures, HTTP 200 with no acceptance ID, zero recipients, SDK initialization ordering and retry, SDK load failure/timeout, account switching, logout, role tagging, foreground toast/listener cleanup, browser permission allow/deny/dismiss/unsupported states, and activation of an inactive OneSignal push subscription.

## Failures fixed

- General notifications previously reported success for OneSignal HTTP 200 responses that created no notification. Both routes now require a nonempty acceptance ID and reject explicit zero recipients; an omitted legacy recipient count is not fabricated as zero.
- Credit notifications previously accepted non-2xx provider responses without an `errors` field. They now reject those responses.
- Null input, malformed UUIDs, empty user targeting and URL backslashes are rejected before contacting the provider. Empty user targeting cannot fall through to an administrator broadcast.
- Shared client request handling detects HTTP and acceptance failures at every notification trigger. Admins see delivery failures separately from committed booking/refund/credit mutations. No automatic notification or domain retries were added.
- SDK initialization now completes before serialized identity synchronization. Stale work cannot tag another account or undo logout. Script failure, timeout and retry are handled without duplicate initialization.
- The profile action activates/verifies the OneSignal subscription instead of treating browser permission alone as subscription success. It gives visible blocked/unsupported/failure feedback and prevents duplicate clicks.
- Quick broadcast now uses a synchronous submission lock and input lengths matching the API limits.
- Click destinations use the request origin: administrators open `/admin`; targeted trainees open `/dashboard`, unless a validated app-relative destination is supplied.

## Browser and live inspection

At 390 × 844, the isolated browser fixture imported the real broadcast and profile components. Failed broadcast retained content and displayed an inline error; successful broadcast closed and showed confirmation; slow send disabled send/close controls and completed once. Blocked/unsupported/SDK-unavailable permission cases displayed actionable feedback. Fixture notification and non-local fetches were intercepted. The temporary route, preview process and temporary dev cache were removed before final delivery.

The running Next endpoints returned HTTP 401 for unauthenticated requests. Production build output contains both notification routes and does not contain the temporary QA route.

Read-only live inspection confirmed OneSignal web push is active and its configured site URL is `https://tb-gym.vercel.app`. Existing booking/cancellation API notifications are present in its message history. Historical records do not prove delivery of this change.

Private local evidence:

- `scratch/notification-all.tap` — 107 notification checks.
- `scratch/notification-related-tests.tap` — 13 related checks.
- `scratch/notification-lint.log` and `scratch/notification-build.log`.
- `scratch/notification-broadcast-error.png`, `scratch/notification-permission-denied.png`.
- `scratch/notification-premium-audit.json` — broader static UI audit reports two pre-existing findings in the unchanged class-creation component (`QuickSessionModal.tsx`: form validation ownership and an actionless-button finding). This broader audit is not a clean pass.

## Remaining device verification

No real test notification was sent, and no real bookings or credit balances were changed. A specific test recipient/device was requested but not supplied. Deployment and actual provider acceptance/receipt of the fixes remain unverified.

After selecting that recipient and running the fixes on the configured production origin, verify foreground toast, background receipt with the app closed, click destination, role/user targeting, and logout/account switching. Match each acceptance ID to its OneSignal delivery record and observed device receipt. Do not send a whole-member broadcast as a test.

The referenced `BOOST.md` was not found in the workspace; no additional instructions could be read from it.

Provider behavior was checked against the official [OneSignal Web SDK reference](https://documentation.onesignal.com/docs/en/web-sdk-reference) and [CreateNotification API response documentation](https://github.com/OneSignal/onesignal-node-api/blob/main/DefaultApi.md).

# Talia admin interaction contract

This contract covers the admin overview, schedule and trainee management. Hebrew, RTL and the established studio palette remain canonical. Business authorization and ticket/session transitions remain owned by the server and database.

## Business sources

| Concern | Source |
| --- | --- |
| Administrator access | src/app/admin/layout.tsx and the server authorization in src/app/api/notifications/route.ts |
| Session creation, cancellation, deletion and refunds | src/utils/supabase/migrations/14_atomic_admin_schedule.sql |
| Available credits and permitted adjustments | src/utils/supabase/migrations/15_admin_ticket_adjustments.sql |
| Visual identity and runtime token ownership | DESIGN.md and src/app/globals.css |

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Date | Calendar, Popover and MuiTimePickerWrapper | Hebrew date-fns and MUI locale packs; local date/time input, Asia/Jerusalem session display | Calendar popover; accepted clock selection | scripts/check-admin-polish.mjs |
| Form | CopyableInput with existing React form state | Server RPC constraints, UI validation and retained drafts | Session creation; credit adjustment | scripts/check-admin-polish.mjs |
| Scrollbar | src/app/globals.css | Global studio scrollbar tokens | Stable modal gutter; contained sheet scrolling | Browser geometry checks and source inspection |
| Toast | ToastProvider in src/components/ui/use-toast.tsx | Existing success, error and info system | Success after modal close; inline persistent errors inside modals | scripts/check-admin-polish.mjs |
| CRUD | Admin routes and existing Supabase RPCs | Business sources above | Preserve owning list; reload after session mutation; update balance after credit mutation | scripts/check-admin-polish.mjs |

## Shared behavior

- StudioModal owns modal semantics, focus trapping, safe initial focus, Escape, inert background, focus restoration, body/route scroll locks and visual-viewport sizing. Its admin variant owns the bottom sheet on phones and centered surface on wider screens. Content scrolls independently of the persistent action footer. The most recently opened native dialog owns keyboard handling.
- Calendar popovers and MUI time dialogs portal into the current StudioModal container. Escape closes the inner popup first. Cancelling the clock discards its draft; accepting commits the time. Child focus returns to its actual trigger.
- Pending mutations lock dismissal and duplicate submission. Failed mutations preserve the form/confirmation and present an inline retry message. Notification retries are explicit and never automatic.
- Deletion and attendee removal name the affected workout/person and consequence. The least destructive action receives initial focus. Confirmed removal updates the visible list immediately; when its trigger is removed, focus returns to the parent sheet's safe action or the new-workout control. Existing atomic RPCs remain the sole mutation owners.
- Closing session creation preserves entered draft fields; publishing resets them. Closing credit adjustment unmounts its draft so a different trainee starts with an empty adjustment.
- AdminSearch owns immediate local filtering, a localized clear action and focus restoration. Queries remain transient: member names, emails and telephone searches are not written to URLs or storage.
- Session and trainee lists reveal 24 loaded records at a time with explicit load-more controls. Filtering resets the visible limit. This does not change the backend's dataset or pagination contract.
- Loading, empty, search-no-results and error are distinct states. Failed balance reads must never invent zero credits. Late read responses cannot overwrite a newer mutation or another roster.
- Motion uses brief transform/opacity transitions, existing page navigation and a shared selected navigation capsule. Reduced motion removes entrances and transitions. Palette adapters and shape rules are documented in DESIGN.md.

## Verification scope

The local browser fixture imports the actual admin routes/components and intercepts all data and notification requests. It exercises success/failure, busy dismissal, focus, nested popup ownership, responsive geometry and reduced motion without changing live data. It is created only during the test and removed in finally. Live RPC correctness remains covered by the existing domain tests/stress tooling; this visual pass does not authorize live mutation tests.

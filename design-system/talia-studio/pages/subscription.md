# Subscription page — October 2, 2026

The owner requested a fundamental redesign. The canonical visual source is `DESIGN.md` and the runtime `--studio-*` palette in `src/app/globals.css`; the generated nutrition/Latin typography suggestions in MASTER.md do not apply to this Hebrew studio app.

Use a weekly-rhythm selector with three native radio choices, one detailed selected-plan surface and one persistent purchase bar. All three choices remain visible on phones. Use natural document scrolling, without horizontal carousel gestures, snap scrolling or viewport-height page restrictions. Reserve space for the purchase bar and safe areas. The large Hebrew headline uses the existing Varela Round and the studio's restrained terracotta underline. Body and benefit copy are 16–17px; utility labels may be 13–14px.

Preserve the existing 4/8/12 training plans, prices and benefits. Compute the effective price per workout from monthly price divided by sessions; do not round down. No fabricated discounts, testimonials or popularity claims. The page is not an automatic payment processor: the Bit instruction dialog precedes the external handoff and explicitly states that Talia approves payment before crediting workouts. A handoff is not a successful purchase. Keep the selected plan and instructions available after returning from Bit.

The payment primitive remains `src/components/subscription/PaymentModal.tsx`, using the native dialog's modal focus/inertness/restore behavior with app-owned contents. Escape, backdrop and the explicit close button dismiss it. Clipboard and blocked-popup failures remain visible and recoverable. Shared notifications belong to `useToast`; member data belongs to `GymStoreProvider`. All new geometry and component presentation live in `src/app/subscription/subscription.css` and consume global studio tokens. Motion is a short content transition and is removed for reduced-motion users.

Verify with `node scripts/check-subscription-layout.mjs http://127.0.0.1:3110`, which uses synthetic local interaction data and never opens a real payment destination.

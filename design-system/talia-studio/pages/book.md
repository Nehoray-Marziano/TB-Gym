# Booking Schedule (לוח אימונים) — Mobile-Only PWA V2 Specification

> **PAGE OVERRIDE**: This file overrides `MASTER.md` for the Talia Studio Schedule & Booking screen (`/book`).
> Adheres strictly to the user mandate: **"mobile ONLY (not 'mobile first') PWA! Design should only take mobile looks and aesthetics into account. It should feel like a native app."**

---

## 1. Brand Identity & Atmosphere

- **Palette Alignment**: Strict usage of the canonical Talia Studio token set:
  - Canvas: `var(--studio-canvas)` (`#e9eadc`) with warm radial atmospheric glow.
  - Ink & Text: `var(--studio-ink)` (`#162218`) with high contrast (≥ 10:1).
  - Primary Surface: `var(--studio-card)` (`#f6f6ed`) with tactile boutique borders (`border-[var(--studio-ink)]/10`).
  - Hero / Accent: `var(--studio-deep)` (`#162218`), `var(--studio-brand)` (`#8b8e6f`), `var(--studio-accent-text)` (`#cbd3aa`).
  - Urgency & Coral: `var(--studio-coral-bg)` (`#c37a61`) / `var(--studio-coral-text)` (`#e5a38b`) for "last spots" and calendar accents.
  - Danger / Cancel: `var(--studio-danger)` (`#a53d35`).
- **Typography**: Single canonical Hebrew font: Varela Round. RTL reading flow with isolated LTR numeric time blocks (`18:00 - 19:00`).

---

## 2. Native Mobile Architecture

- **Mobile Viewport Shell**:
  - Container owns `h-full w-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]`.
  - Zero body or root scroll (`overflow-x-hidden`).
  - Top safe-area inset: `pt-[max(0.75rem,env(safe-area-inset-top))]`.
  - Bottom clearance: `pb-[calc(7.5rem+env(safe-area-inset-bottom))]` for the floating glass bottom dock.
- **Sticky Glass Navigation Bar**:
  - Pinned frosted header (`backdrop-blur-md bg-[#e9eadc]/88 sticky top-0 z-30`).
  - Studio identity & title with live ticket balance chip (`3 כרטיסיות` or `מנוי פעיל`), offering direct reassurance and navigation to `/subscription`.
  - Haptic feedback (`navigator.vibrate`) on all key touch actions.

---

## 3. Key Components & Interactions

### A. Horizontal Native Day Scroller (Weekly Date Strip)
- Next 14 days calendar pill carousel with momentum touch scroll.
- "הכל" (All) button + daily date capsules.
- Each capsule displays:
  - Hebrew day letter (`א׳`, `ב׳`, `ג׳`, etc.)
  - Day number (e.g. `2`, `3`, `4`)
  - Status indicators:
    - Terracotta / sage dot when workouts exist.
    - Checkmark / star dot when the trainee is already booked for a session on that day.
  - Active capsule: Elevated studio capsule with spring highlight.

### B. Segmented Filter Chips
- Toggles:
  - `הכל` (All)
  - `פנויים בלבד` (Available only)
  - `ההרשמות שלי` (My bookings count)
- Instant client filtering with zero network overhead.

### C. Luxury Session Cards (V2)
- Asymmetrical studio squircle or luxury rounded card (`rounded-[1.75rem]`).
- Time block: Prominent bold time, duration indicator (`50 דק׳`), and contextual "היום" / "מחר" pill.
- Session details: Title, description, coach attribution, capacity dot meter (8 dots showing filled vs empty).
- Spot status pill:
  - Registered: "את רשומה ✓" (soft forest/sage badge)
  - Last spots: "מקומות אחרונים! נותרו 2" (terracotta warning)
  - Normal: "נותרו 5 מקומות" (sage/olive)
  - Full: "האימון מלא" (muted)
- Actions:
  - If registered: "הוספה ליומן" (iOS `.ics` download or Google Calendar link) + "ביטול הרשמה" (opens cancellation sheet).
  - If available: "שמרי לי מקום" with tactile micro-press and loading spinner.
  - If full: "האימון מלא" (disabled).
  - If 0 tickets: "אין כרטיסיות פנויות" -> guides user to purchase ticket.

### D. Native Bottom Sheet Modals
- **Booking Details Sheet**: Full session summary, coach, ticket balance deduction notice, cancellation policy reminder, and big tactile confirm button.
- **Cancellation Sheet**: Confirmation with automatic ticket balance refund guarantee.
- Native sheet geometry: Grabber pill handle, rounded top corners (`rounded-t-[2rem]`), spring physics (`damping: 28, stiffness: 300`), backdrop scrim blur.

### E. Feedback & Celebration
- Micro-haptics (`navigator.vibrate(10)`).
- Confetti celebration upon confirmed booking (`canvas-confetti`) with studio brand palette.
- Immediate optimistic UI update + background synchronization with Supabase RPCs.

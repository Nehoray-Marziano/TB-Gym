# Talia Studio (סטודיו טליה) — Master Skill Handoff & Architecture Standard

> **AUTHORITATIVE DIRECTIVE FOR ALL AGENT SESSIONS**  
> This file is the permanent, single source of truth for all engineering, architectural, and design work on the Talia Studio web platform. Every AI agent and developer joining this project **must read this file in full** before modifying code.
>
> **Core Skills Referenced:**
> - `ui-ux-pro-max` (Searchable design intelligence, mobile/touch UX guidelines, pro-rules checklist, accessibility & animation standards)
> - `design-system` / `DESIGN.md` (Local runtime tokens and component specifications)
> - `design-system/talia-studio/pages/` (Page-specific overrides)

---

## 1. The App's Purpose & Brand Philosophy

### Who is Talia?
Talia is a certified fitness coach and licensed **Clinical Dietitian** based in Israel. Her studio is not a cold commercial gym or a generic fitness franchise; it is a holistic, female-empowered health haven (**מרחב נשי מעצים**) where strength training, movement, posture, and clinical nutrition converge.

### Studio Mission & Product Concept
Talia Studio provides small-group, personalized athletic training coupled with dietary guidance. Trainees need a fast, reliable, beautiful mobile web app to:
- View weekly class schedules and book/cancel workout slots in real time.
- Track their active session ticket balances and expiration dates.
- Manage monthly memberships (4, 8, or 12 sessions/month) and execute external payments via Bit.
- Maintain sensitive health declarations and personal metrics.
- Receive timely push updates regarding schedule changes and studio news.

Simultaneously, Talia requires an intuitive operational console to schedule workouts, manage attendee rosters, handle cancellations, adjust ticket balances, and broadcast updates.

### Brand Personality & Editorial Mood
- **Tone:** Refined athletic editorial, organic vitality, calm confidence, high-end boutique intimacy.
- **Visual Identity:** Built around the bespoke **Talia Studio Logo** (fine barbell geometry intertwining with organic olive branches — uniting physical strength and nutritional health), the **Terracotta Sun Orb** (warmth, morning energy), and rhythmic Hebrew typography.
- **Strict Aesthetic Guardrails ("What It Is NOT"):**
  - ❌ **NOT a loud, neon gym dashboard** (no generic dark gym themes, harsh fluorescent lime, aggressive iron graphics).
  - ❌ **NOT a generic spa / pastel wellness retreat** (no washed-out zen clichés, no superficial beauty salon tropes).
  - ❌ **NOT a "hippie-happy" or psychedelic vibe** (no messy tie-dye, rainbow gradients, or unfocused visual noise).
  - ❌ **ABSOLUTELY NO DECORATIVE IMAGES**: **Zero photos, zero stock illustrations, zero raster clip-art, zero AI-generated images.** The visual hierarchy is carried exclusively by typography, mathematical grids, vector SVG geometry, liquid glass surfaces, and restrained motion physics.

---

## 2. What the App Does: Complete Functional Tour & Route Map

The application is fully localized in Hebrew with Right-to-Left orientation (`lang="he"`, `dir="rtl"`). All text flows naturally from right to left, while numeric timestamps, phone numbers, and currency symbols maintain isolated Left-to-Right rendering (`<bdi>` or `dir="ltr"`).

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              TALIA APP ROUTE MAP                          │
└───────────────────────────────────────────────────────────────────────────┘
                                      │
         ┌────────────────────────────┴───────────────────────────┐
         ▼                                                        ▼
  [ Public / Guest ]                                     [ Authenticated Trainee ]
  ├── / (Landing & Introduction)                         ├── /dashboard (Member Home)
  ├── /auth/login (Bottom Sheet Login)                   ├── /book (Schedule & Class Booking)
  ├── /auth/callback (OAuth Redirection)                 ├── /my-bookings (Upcoming & History)
  ├── /onboarding (Health & Profile Setup)               ├── /subscription (Tier Carousel & Bit)
  └── /~offline (PWA Network Recovery)                   └── /profile (Settings & Health Form)
                                                                  │
                                                         [ Studio Administrator ]
                                                         ├── /admin (Ops Overview)
                                                         ├── /admin/schedule (Roster & Classes)
                                                         └── /admin/trainees (Member Balances)
```

### Route-by-Route Breakdown

| Route | Primary Purpose & Functional Logic | Key Components & Files |
| :--- | :--- | :--- |
| **`/` & `/auth/login`** | **Public Introduction & Auth Entry:** Tactile studio emblem, animated Hebrew title with wavy terracotta underline, 3 boutique value cards, social proof, and passwordless authentication (Google OAuth + Email OTP bottom sheet). Redirects active members directly to `/dashboard`. | `src/components/home/LandingPage.tsx`<br>`src/app/page.tsx`<br>`src/app/auth/login/page.tsx` |
| **`/onboarding`** | **First-Time Trainee Intake:** Captures full name, mobile phone number, age, and medical health declaration. Persists directly to `profiles` and `health_declarations` tables. | `src/app/onboarding/page.tsx` |
| **`/dashboard`** | **Trainee Home & Operations Hub:** Personalized Hebrew greeting, prominent focal workout card (next appointment with date/time, or dynamic CTA to book if empty), unboxed ticket balance summary, and persistent floating dock navigation. | `src/components/home/TraineeDashboard.tsx`<br>`src/components/home/home-layout.css`<br>`src/app/(trainee)/layout.tsx` |
| **`/book`** | **Class Booking Engine:** Real-time schedule calendar, coach identity, spot availability counter, and instantaneous atomic booking via `book_session` Postgres RPC. Enforces concurrency limits and balance checks. | `src/app/(trainee)/book/page.tsx` |
| **`/my-bookings`** | **Active Bookings & Cancellations:** Chronological list of reserved sessions. Enforces the strict **10-hour advance cancellation cutoff** via `cancel_booking` RPC. Automatically refunds ticket credits if cancelled on time. | `src/app/(trainee)/my-bookings/page.tsx` |
| **`/subscription`** | **Membership Plans & Payment Handoff:** High-end mobile-only 3-tier carousel (4 sessions / ₪240, 8 sessions / ₪450, 12 sessions / ₪650). Middle tier default, momentum card swiping, and manual Bit payment modal sheet. *Crucial:* Bit handoff does not auto-credit sessions; Talia manually verifies payment prior to ticket grant. | `src/app/subscription/page.tsx`<br>`src/components/subscription/SubscriptionExperience.tsx`<br>`src/components/subscription/PaymentModal.tsx` |
| **`/profile`** | **Member Profile & PWA Settings:** Editable personal information, health declaration history review, PWA installation trigger, and secure sign-out. | `src/app/(trainee)/profile/page.tsx`<br>`src/components/profile/ProfileClient.tsx` |
| **`/admin`** | **Talia's Studio Management Hub:** High-level studio metrics, quick shortcuts to day schedule and member directory. | `src/app/admin/page.tsx`<br>`src/app/admin/layout.tsx` |
| **`/admin/schedule`** | **Calendar & Session Management:** Class creation (regular group vs. private 1-on-1), spot capacity adjustments, trainee roster inspection, manual check-in, attendee cancellation, session cancellation, and push notification dispatch. | `src/app/admin/schedule/page.tsx` |
| **`/admin/trainees`** | **Trainee Directory & Ticket Overrides:** Full member database search, attendance history, and atomic ticket grant/decrement via `admin_grant_tickets` RPC. | `src/app/admin/trainees/page.tsx` |
| **`/~offline`** | **PWA Offline Fallback:** Native-styled offline state allowing trainees to access cached contact info and stored session reminders. | `src/app/~offline/page.tsx` |

---

## 3. How It Works: Technical Architecture & Core Systems

### Technology Stack
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript.
- **Styling & Design Engine:** Tailwind CSS 4 + custom `@theme` tokens in `src/app/globals.css`.
- **Motion & Physics:** Framer Motion 12 (spring physics, layout transitions, exit choreography) + GSAP 3 (high-precision vector line drawings & scroll timelines).
- **Icons & Visual Primitives:** `lucide-react` (strictly no emojis as icons) + Radix UI accessible primitives.
- **Glassmorphism:** `@liqui-design/glass` + custom physical rim specular CSS variables.
- **Backend & Database:** Supabase (PostgreSQL, Row Level Security, Auth SSR, Database RPC functions).
- **Push Notifications:** OneSignal PWA Web Push integration.

### Core Database RPCs & Concurrency Safety
The application relies on database-level stored procedures (PostgreSQL functions) to ensure atomicity, prevent race conditions during high-demand class bookings, and protect billing integrity:
1. **`book_session(p_session_id, p_trainee_id)`**:
   - Checks if session is in the future and not full.
   - Verifies the user has at least 1 unused, unexpired ticket.
   - Atomically decrements 1 ticket from `ticket_balances` and inserts an attendee record into `session_attendees`.
   - Prevents double-booking via unique constraints.
2. **`cancel_booking(p_session_id, p_trainee_id)`**:
   - Enforces the **10-hour cancellation policy** (`session_start_time - now() >= interval '10 hours'`).
   - If within policy, marks booking as cancelled and increments available ticket balance.
   - If inside the 10-hour window, marks as late-cancellation without refunding tickets.
3. **`admin_grant_tickets(p_trainee_id, p_amount, p_reason)`**:
   - Secure administrator RPC to grant, expire, or adjust workout credits.
4. **`admin_create_session`, `admin_cancel_booking`, `admin_delete_session`**:
   - Atomic scheduling operations that handle attendee notifications and credit rollbacks.

### Client-Side State & Context (`GymStoreProvider.tsx`)
- Centralized React context supplying profile identity, role verification (`trainee` vs. `administrator`), real-time ticket balance, active bookings, and subscription status.
- Implements optimistic UI updates for instant feedback, validated against Supabase mutations.

### Sensitive Data Governance
> [!CAUTION]
> Talia is a **Clinical Dietitian**. The `health_declarations` table stores confidential medical histories, medications, allergies, and physical limitations.
> - **NEVER** expose health data in public API routes, client logs, console messages, or screenshot artifacts.
> - Ensure all Supabase RLS policies restrict health declaration access strictly to the owner and Talia (admin).

---

## 4. Mobile-Only PWA Mandate & Viewport Best Practices

Talia Studio is engineered as an **installed Progressive Web App (PWA) running on mobile phones** (iOS Safari standalone & Android Chrome standalone). Desktop view is strictly a secondary, centered preview container (`max-w-md` or `max-w-lg`). All visual QA, layout budgets, and interaction testing must be executed on phone viewports.

### 1. Viewport Height Containment & Zero-Scroll Principle
A common flaw in mobile web apps is "rubber-banding", unwanted page scrolling, or content jumping when the browser's dynamic URL bar appears/disappears. Talia Studio enforces an **app-shell lock**:
- **Root Screen Lock:** Primary viewports (`/`, `/dashboard`, `/subscription` intro) are strictly locked to `100dvh` / `100svh` with `overflow: hidden` on root containers.
- **CSS App Shell Hook (`globals.css`):**
  ```css
  html:has(.studio-app-shell),
  body:has(.studio-app-shell),
  html:has(.studio-welcome),
  body:has(.studio-welcome) {
    height: 100%;
    height: 100dvh;
    overflow: hidden;
    overscroll-behavior: none;
  }
  ```
- **Internal Scroll Containment:** When a page genuinely contains long lists (e.g. Booking schedule, Trainee roster, FAQ list), the scroll container must be isolated to a dedicated child `div` using:
  ```css
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  ```
  The header, bottom navigation dock, and background scene remain rigidly fixed.

### 2. Device Safe Areas & Notch Geometry
All layout containers must respect iOS and Android system cutouts:
- **Top Safe Area:** `padding-top: env(safe-area-inset-top, 20px)` to avoid status bars, notches, and the Dynamic Island.
- **Bottom Safe Area:** `padding-bottom: env(safe-area-inset-bottom, 20px)` to prevent collisions with the iOS home indicator bar.
- **Floating Dock Navigation Clearance:**
  The floating glass navigation dock has a height of `72px` and sits `12px + env(safe-area-inset-bottom)` above the screen bottom. Scrollable pages must reserve a minimum bottom clearance of **`96px + env(safe-area-inset-bottom)`** so the lowest list items are never obscured.

### 3. Touch Ergonomics & Thumb Zone Architecture
Guided by `ui-ux-pro-max` touch standards:
- **Minimum Hit Targets:** All interactive elements (buttons, inputs, navigation tabs, back arrows) must have a clickable target of at least **`44×44pt` (iOS) / `48×48dp` (Android)**. Even if an icon glyph is 20px, its touch hitbox must be padded to 48px.
- **Thumb Zone Placement:** High-frequency CTAs (booking confirmation, plan purchase, filter triggers) are positioned in the bottom 40% of the screen.
- **Tactile Haptic Feedback:** Primary buttons trigger micro-vibrations on supported hardware:
  ```typescript
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(12); // Short, tactile confirmation
  }
  ```
- **No Reliance on Hover:** Touchscreens have no hover state. Hover styles must only enhance desktop previews. Tap/active states (`:active`, `whileTap={{ scale: 0.98 }}`) must provide instant visual feedback within **80–150ms** without shifting layout bounds.
- **Overscroll & Tap Callouts:** Tap highlighting (`-webkit-tap-highlight-color: transparent`) and iOS callout menus (`-webkit-touch-callout: none`) are globally disabled.

### 4. The RTL Momentum Carousel Architecture
Horizontal swipe carousels in Right-to-Left (Hebrew) web apps frequently suffer from cross-browser bugs (Safari and Chrome invert `scrollLeft` values unpredictably in RTL containers). 

Talia Studio solves this with an architectural design pattern:
- The carousel container is internally set to **`dir="ltr"`** with plans ordered physically as **`[Tier 12, Tier 8, Tier 4]`**.
- Each individual card interior is set to **`dir="rtl"`**.
- **Result:** Tier 4 (intro tier) naturally sits on the physical right, and Tier 12 sits on the left. Native CSS scroll snapping (`scroll-snap-type: x mandatory`), momentum touch physics, and center-card detection work consistently across iOS and Android without coordinate inversions.

---

## 5. Aesthetics & Design System (`ui-ux-pro-max` Integration)

The aesthetic direction is rooted in `ui-ux-pro-max` design intelligence, combining natural organic serenity with high-precision athletic typography.

### Canonical Talia Studio Palette (`src/app/globals.css`)
Theme switching has been unified into a single, rock-solid, boutique canonical palette to eliminate contrast drift across mobile OLED screens:

| CSS Variable Token | Hex Value | Semantic Purpose & Usage |
| :--- | :--- | :--- |
| `--studio-canvas` | `#e9eadc` | Warm boutique linen canvas; main page background |
| `--studio-ink` / `--studio-deep` | `#162218` | Deep Forest ink; primary typography, high-contrast buttons |
| `--studio-deep-contrast` | `#f6f6ed` | Luminous warm ivory text on dark surfaces |
| `--studio-brand` | `#8b8e6f` | Muted Sage Olive; studio identity, card borders, icons |
| `--studio-accent-text` | `#cbd3aa` | Luminous Sage; highlights, badges, active pill text |
| `--studio-coral-bg` / `--studio-terracotta` | `#c37a61` | Terracotta / Clay; warm sun orb, primary CTAs, hand-drawn strokes |
| `--studio-coral-text` | `#e5a38b` | Lighter terracotta; subtle badge text & active dots |
| `--studio-card` / `--studio-sheet` | `#f6f6ed` / `#f1f0e8` | Elevated card surfaces, bottom modal sheets |
| `--studio-muted` | `#5d6958` | Secondary body text, timestamps, subtitles |
| `--studio-danger` | `#a53d35` | Destructive actions, late cancellation warnings |
| *Dark Atmosphere Tokens* | `#181611` / `#2a251b` | Velvety moss/charcoal ambient glows for landing & hero |

### Physical Liquid Glass Tokens (`@liqui-design/glass`)
The floating bottom navigation and premium cards utilize physical liquid glass styling:
```css
.studio-navigation-glass {
  background: color-mix(in srgb, var(--studio-card) 78%, transparent);
  box-shadow: 0 12px 36px -12px rgb(12 25 13 / 30%),
              0 3px 10px -4px rgb(12 25 13 / 18%),
              inset 0 1px 0 rgb(255 255 255 / 35%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
```

### Typography Hierarchy & Formatting Rules
- **Primary Font:** `Varela Round` (Hebrew curved geometry loaded via `next/font/google`).
- **Heading Line Balancing:** Always use `text-wrap: balance` on Hebrew headlines to prevent orphan words.
- **Bidi Text Isolation:** Currency and numbers must be wrapped in `<bdi>` or styled LTR so that numbers like `₪240` or times like `08:30 - 09:15` render without reversed punctuation.
- **Contrast Ratios:** Primary body text maintains a contrast ratio **≥ 4.5:1** against all backgrounds. Display elements maintain **≥ 3:1**.

### Organic Architectural Shapes
To echo Talia's bespoke studio interior, featured cards (e.g. the focal workout card on `/dashboard`) use signature **asymmetrical organic corners**:
```css
border-radius: 30px 10px 30px 30px; /* Asymmetric organic studio curvature */
```

---

## 6. Motion, Animation & Physics Standards

Motion must feel **deliberate, tactile, and native** — never like a floating website.

### Physics-Based Spring Dynamics
Standard linear animations are strictly prohibited for interactive components. Always use spring physics via Framer Motion:
- **Modal Sheets & Overlays:** `transition: { type: "spring", stiffness: 400, damping: 28 }`
- **Card Swipe & Tilt:** Smooth spring damping with elastic resistance on boundary overscroll.
- **Exit Faster Than Enter:** Entrances take ~350–500ms for graceful arrival; dismissals and exits complete in ~150–200ms to preserve UI responsiveness.

### Vector Path & Atmosphere Animations
- **SVG Underline Drawing:** The hero Hebrew title features a handwritten terracotta wave that draws itself dynamically:
  ```css
  .studio-hand-underline {
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    animation: studio-draw-underline 1s 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  ```
- **Botanical Breathing & Sun Orbit:** Ambient vectors drift gently (`studio-botanical-breathe` and `studio-orbit`) to give the interface an organic heartbeat.

### Strict `prefers-reduced-motion` Compliance
All animations and ambient loops must respect user accessibility preferences:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```
In React components, leverage Framer Motion's `useReducedMotion()` hook to disable layout animations and provide instantaneous transitions.

---

## 7. Quality Assurance & Layout Verification Protocol

Before submitting or presenting any UI work, agents must execute automated mobile verification scripts.

### Automated Layout Check Scripts
Located in `scripts/`:
1. **`node scripts/check-home-layout.mjs`**:
   - Launches headless browser testing across standard phone viewports:
     - **320×568** (iPhone SE 1st gen — ultra-compact)
     - **375×667** (iPhone SE 2nd/3rd gen)
     - **390×844** (iPhone 13/14/15 standard)
     - **430×932** (iPhone 15 Pro Max / Large Android)
   - Checks: zero document scroll, element overlap detection, safe area margins, touch target heights.
2. **`node scripts/check-subscription-layout.mjs`**:
   - Tests carousel swipe gestures in both directions, middle-tier centering, safe area insets, Bit modal triggers, and synthetic network failure recoveries.
3. **`npm run lint` & `npm run build --webpack`**:
   - Validates TypeScript typing and Next.js compiler output.

---

## 8. Operational Rules for Future Agent Sessions

### The "One-Page-At-A-Time" Mandate
> [!IMPORTANT]
> The owner has explicitly established a strict sequential workflow:
> 1. Work on **one single mobile page at a time**.
> 2. Read the page's design specification in `design-system/talia-studio/pages/[page-name].md`.
> 3. Verify mobile responsiveness across all 4 benchmark viewports (320px, 375px, 390px, 430px).
> 4. Run automated QA scripts and capture mobile screenshots.
> 5. Present the verified mobile results to the owner and **await explicit approval** before moving to the next page.
> 6. Do **NOT** perform sweeping cross-page refactors without permission.

### The "Push-When-Done" Instrument & Mandate
> [!IMPORTANT]
> **AUTOMATED DEPLOYMENT & REPOSITORY SYNCHRONIZATION POLICY**  
> Every agent session working on Talia Studio must ensure that all completed, verified work is committed and pushed to the remote GitHub repository (`origin/main`) before concluding the session.
>
> **Why this is critical:**
> 1. Vercel automatically triggers production/preview builds upon every push to `origin/main` (`https://tb-gym.vercel.app`). Pushing ensures the owner can immediately test live changes on physical mobile devices.
> 2. Pushing guarantees that subsequent agent sessions and collaborators start with a clean, synchronized state without missing or uncommitted local work.
>
> **How to execute the Push-When-Done instrument:**
> An automated, safety-checked verification instrument is provided in the repository:
> ```bash
> # In the TB-Gym directory:
> npm run push:done -- "feat(scope): concise description of verified work"
> 
> # Or directly via node:
> node scripts/push-when-done.mjs "feat(scope): concise description of verified work"
> ```
> 
> **What the instrument automatically verifies before pushing:**
> 1. Detects modified, staged, and untracked files.
> 2. Executes `npm run lint` — if any lint errors or type failures are detected, the push is immediately halted.
> 3. Stages all changes (`git add -A`).
> 4. Commits using your provided conventional message.
> 5. Pushes cleanly to `origin` on the active branch (`main`) and outputs the deployed commit hash for verification.
> 
> **Rule:** Never conclude a session with uncommitted or unpushed verified code.

### Pre-Delivery Checklist (from `ui-ux-pro-max`)
Before concluding any session, verify every item:
- [ ] **No Emojis as Icons:** All icons use SVG (`lucide-react`).
- [ ] **Zero Decorative Photos:** No stock photos, raster illustrations, or AI images.
- [ ] **Touch Targets ≥ 44pt:** All buttons, links, and form controls have at least 44×44pt touch area.
- [ ] **Safe-Area Compliance:** Headers, fixed docks, and modals clear `env(safe-area-inset-*)`.
- [ ] **Zero Mobile Viewport Scroll:** Landing, Dashboard, and Subscription hero screens fit 100dvh without vertical document scroll.
- [ ] **Hebrew RTL Integrity:** RTL layout verified, text balanced, LTR isolation (`<bdi>`) on numbers, times, and prices.
- [ ] **Contrast Compliance:** Contrast ratio ≥ 4.5:1 for body text, ≥ 3:1 for graphical controls.
- [ ] **Reduced Motion Tested:** Interface remains fully functional and snappy with `prefers-reduced-motion` enabled.
- [ ] **Database Integrity:** Concurrency-critical actions use atomic RPCs (`book_session`, `cancel_booking`).
- [ ] **Privacy Protected:** Health declarations and trainee identities never leaked in screenshots or logs.
- [ ] **Push-When-Done Executed:** Code linted, committed, and pushed to `origin/main` via `npm run push:done` so live Vercel deployment triggers.

---
*Maintained with pride for Talia Studio. Crafted for athletic grace, organic health, and mobile excellence.*


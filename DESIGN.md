# Talia design context

## Overview

Talia is a Hebrew, right-to-left studio booking app, primarily used on phones. The public introduction carries the brand; the member home helps a returning member see her next workout and find the schedule. Product rules and the route inventory are maintained in `../TALIA-APP-HANDOFF.md`.

The home direction (October 1, 2026) keeps one prominent workout card, a balance row, and persistent navigation. The first sparse implementation was rejected as empty and lacking personality. Preserve the intro's expressive Hebrew typography, sage and terracotta palette, sun and botanical composition. Simpler navigation must not mean a generic or visually vacant page. Avoid repeated destination tiles and promotional content on the member home.

## Colors

Runtime ownership remains in `src/app/globals.css`: the light, classic, and dark theme selectors define the canonical `--studio-*` values. This document does not generate or duplicate palette values. The home uses `--studio-canvas` and `--studio-ink` for the page, `--studio-deep` and `--studio-deep-contrast` for its focal card, `--studio-accent-text` for the card label and empty-state action, and `--studio-muted` for secondary text. No new global tokens were introduced.

## Typography

`src/app/layout.tsx` loads Varela Round, consumed through the global font variables. Use one greeting, one section label, and the workout title; show the appointment date and time only once. Hebrew flows RTL; times are isolated LTR and user-provided workout titles use automatic direction. Long names and titles wrap rather than disappear.

## Layout

Member home is a single natural-height column, max-width `max-w-lg`, with 20px mobile gutters and safe-area-aware top and bottom padding. The fixed bottom navigation owns Home, Schedule, and Account. The card owns one contextual action: My workouts when booked, Find a workout when empty. Membership is a compact secondary link beside the balance. Installation stays in Account. Administrators retain a small header link.

## Elevation & Depth

The greeting has a decorative terracotta sun and existing leaf artwork beside large personal typography. The workout card carries tonal depth and a soft shadow; a separate date column gives booked sessions a recognizable appointment composition. The balance remains an unboxed row, with a larger numeral and a fine baseline. Space should frame these elements, not dominate the screen.

## Shapes

The workout card uses three 30px corners and one 10px corner, echoing the studio's existing asymmetric surfaces. Rounded controls and the circular appointment arrow soften the composition. Botanical art stays decorative and inaccessible to assistive technology.

## Components

- `src/components/home/TraineeDashboard.tsx` owns greeting, upcoming-workout rendering, and balance summary; `GymStoreProvider` owns balance and profile data.
- `src/components/BottomNav.tsx` remains the shared navigation owner. Labels are בית, לוח אימונים, חשבון. My bookings remains in the Home navigation family.
- Member navigation is a detached, fully rounded glass dock, at most 23rem wide with 16px side clearance and 12px plus device safe-area clearance below. Reuse `LiquidGlass` for the surface; `studio-navigation-*` in `globals.css` owns its business-specific elevation and active colors. Each labeled tab has a 60px minimum height. The selected capsule moves between tabs with a short spring; reduced-motion users get an immediate change. Light/classic selection is forest with cream text; dark selection is sage with forest text. Keep existing page bottom padding, which reserves room for the 72px dock and its lower clearance.
- Existing Next Links own navigation; links have focus, hover, and pressed feedback. No new dialog, form, payment, or booking mutation is introduced.
- Loading reserves the workout content region and announces progress. A failed request is distinct from an empty booking list. Empty copy makes no assertion about available class capacity.
- Existing toast, theme, and account-installation owners remain unchanged.

## Do's and Don'ts

- Keep one workout-related action inside the home card.
- Keep balance legible without turning it into another competing card.
- Do not add quick-action tiles that repeat the card or bottom navigation.
- Do not add decorative animation or additional welcome messages to the home page.

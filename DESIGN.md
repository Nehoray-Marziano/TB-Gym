# Talia design context

## Overview

Talia is a Hebrew, right-to-left studio booking app, primarily used on phones. The public introduction carries the brand; the member home helps a returning member see her next workout and find the schedule. Product rules and the route inventory are maintained in `../TALIA-APP-HANDOFF.md`.

The home direction (October 1, 2026) keeps one prominent workout card, a balance row, and persistent navigation. The first sparse implementation was rejected as empty and lacking personality. Preserve the intro's expressive Hebrew typography, sage and terracotta palette, sun and botanical composition. Simpler navigation must not mean a generic or visually vacant page. Avoid repeated destination tiles and promotional content on the member home.

## Colors

Runtime ownership remains in `src/app/globals.css`: the single canonical green-brownish boutique palette defines the `--studio-*` values (`#e9eadc` canvas, `#162218` deep ink, `#8b8e6f` brand, `#cbd3aa` accent text, `#c37a61` terracotta coral). Theme switching has been removed to guarantee rock-solid visual stability across all devices. The home uses `--studio-canvas` and `--studio-ink` for the page, `--studio-deep` and `--studio-deep-contrast` for its focal card, `--studio-accent-text` for the card label and empty-state action, and `--studio-muted` for secondary text. No extraneous color overrides are permitted.

## Typography

`src/app/layout.tsx` loads Varela Round, consumed through the global font variables. Use one greeting, one section label, and the workout title; show the appointment date and time only once. Hebrew flows RTL; times are isolated LTR and user-provided workout titles use automatic direction. Long names and titles wrap rather than disappear.

## Layout

The introduction and member home each own a `100dvh` viewport. `src/components/home/home-layout.css` implements their sizing: the introduction reserves the header and actions around its flexible hero; member home gives the extra height to the greeting above a content-sized workout card and balance row. The workout card reserves up to 300px (32% of viewport height on smaller phones), grows only when its content needs it, and must not stretch into every available pixel. The introduction is at most 544px wide; member home is at most 608px wide, with adaptive 20–32px gutters. Their main elements are size-query containers, so typography, emblems, controls, and spacing respond to usable height and content width rather than phone width alone. Keep body text at least 14px and primary touch targets at least 44px. Long names and titles must wrap without widening the grid or being clipped.

Safe-area padding is part of the available-height calculation. Member home reserves 96px plus the bottom safe area for the shared 72px navigation dock and its clearance. Wide screens with heights of 540px or less use two columns so landscape can fit without reducing every element. Other routes retain their existing scroll ownership. Verify text bounds, section overlap, navigation clearance, and actual document scrolling with `node scripts/check-home-layout.mjs` against a local development server.

The fixed bottom navigation owns Home, Schedule, and Account. The card owns one contextual action: My workouts when booked, Find a workout when empty. Membership is a compact secondary link beside the balance. Installation stays in Account. Administrators retain a small header link.

## Elevation & Depth

The greeting has a decorative terracotta sun and existing leaf artwork beside large personal typography. The workout card carries tonal depth and a soft shadow; a separate date column gives booked sessions a recognizable appointment composition. The balance remains an unboxed row, with a larger numeral and a fine baseline. Space should frame these elements, not dominate the screen.

## Shapes

The workout card uses three 30px corners and one 10px corner, echoing the studio's existing asymmetric surfaces. Rounded controls and the circular appointment arrow soften the composition. Botanical art stays decorative and inaccessible to assistive technology.

## Components

- Subscription uses a three-choice weekly-rhythm radio selector, one selected-plan surface, readable price and benefit text, and one persistent purchase bar. Its document scrolls naturally with safe-area and purchase-bar clearance. Page-specific geometry and verified product behavior are documented in `design-system/talia-studio/pages/subscription.md`; `src/app/subscription/subscription.css` consumes the canonical global studio colors and font. The shared Bit instruction dialog owns keyboard focus and payment handoff feedback. Payment requires Talia's approval before workouts are credited.

- `src/components/home/TraineeDashboard.tsx` owns greeting, upcoming-workout rendering, and balance summary; `GymStoreProvider` owns balance and profile data.
- In-app branding reuses `StudioLogo` and the clean `initials_logo.svg` TB mark without the tagline. The public introduction retains the full studio signature.
- `src/components/BottomNav.tsx` remains the shared navigation owner. Labels are בית, לוח אימונים, חשבון. My bookings remains in the Home navigation family.
- Member navigation is a detached, fully rounded glass dock, at most 23rem wide with 16px side clearance and 12px plus device safe-area clearance below. Reuse `LiquidGlass` for the surface; `studio-navigation-*` in `globals.css` owns its business-specific elevation and active colors. Each labeled tab has a 60px minimum height. The selected capsule moves between tabs with a short spring; reduced-motion users get an immediate change. Light/classic selection is forest with cream text; dark selection is sage with forest text. Keep existing page bottom padding, which reserves room for the 72px dock and its lower clearance.
- Existing Next Links own navigation; links have focus, hover, and pressed feedback. No new dialog, form, payment, or booking mutation is introduced.
- Loading reserves the workout content region and announces progress. A failed request is distinct from an empty booking list. Empty copy makes no assertion about available class capacity.
- Existing toast, theme, and account-installation owners remain unchanged.

## Do's and Don'ts

- Keep one workout-related action inside the home card.
- Keep balance legible without turning it into another competing card.
- Do not add quick-action tiles that repeat the card or bottom navigation.
- Keep the member home strictly zero-scroll on standard mobile viewports; omit bottom tips/notes that cause scrolling.

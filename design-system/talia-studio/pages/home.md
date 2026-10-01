# Home Page Design System Specification — Talia Studio

> **PAGE OVERRIDE**: This file overrides `MASTER.md` for the Talia Studio Landing & Home Page.
> Adheres strictly to the user mandate: **"while keeping the same theme and color language"**.

---

## 1. Brand Identity & Color Language

### Canonical Studio Palette
- **Background Atmosphere**: `#181611` (Deep velvety moss/charcoal) with radial warm gradients (`#2a251b` to `#100e0a`)
- **Brand Accent (Sage Olive)**: `#8b8e6f` (Backgrounds/Borders) & `#cbd3aa` (Text/Highlights)
- **Secondary Warmth (Terracotta / Clay)**: `#c37a61` (Sun Orb/Buttons) & `#e5a38b` (Accents/Dots)
- **High-Contrast Typography**: `#f6f6ed` (Warm Ivory on dark backgrounds, contrast > 14:1)
- **Deep Contrast Ink**: `#162218` (Forest Ink for light sheets/cards)
- **Sheet Background**: `#f1f0e8` (Frosted Linen Cream)

---

## 2. Layout & Responsive Structure

- **Viewport**: Mobile-first PWA layout constrained to `max-w-lg` centered, responding cleanly across 375px (small phone) up to desktop.
- **Vertical Rhythm**: 
  - Dynamic viewport sizing (`min-h-svh`) with safe-area insets (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).
  - Adaptive spacing for compact screens (`@media(max-height:650px)`).
- **Structure**:
  1. **Header**: Centered tactile Studio Emblem with glowing touch aura + boutique status pill.
  2. **Hero Typography**: Editorial Hebrew headline with RTL wavy terracotta underline and line balancing.
  3. **Feature Showcase**: 3 tactile, interactive boutique cards (לוח אימונים, קבוצות בוטיק, ניהול כרטיסיות) with spring micro-interactions.
  4. **Trust Strip**: Boutique social proof badges (יחס אישי מותאם • מרחב נשי מעצים • גמישות מלאה).
  5. **CTA Action Bar**: Physical Liquid Glass buttons (Google OAuth + Email OTP) with ambient radiant backlight.
  6. **Login Bottom Sheet**: Accessible modal dialog with auto-focus, keyboard navigation, and clear error recovery.

---

## 3. Interaction & Motion Rules

- **Spring Physics**: Smooth spring animations (`stiffness: 400`, `damping: 25`).
- **Reduced Motion**: Full compliance with `prefers-reduced-motion` via `useReducedMotion()`.
- **Touch Targets**: Minimum 48px height on all interactive buttons and inputs (exceeding WCAG 24px and Apple 44pt standards).
- **Haptic Feedback**: Tactile `navigator.vibrate(10-15)` triggers on primary tap actions.
- **Accessibility**:
  - Visible focus rings (`focus-visible:ring-2 focus-visible:ring-white/40`).
  - Text contrast ≥ 4.5:1 across all surfaces.
  - Proper ARIA labels, roles (`dialog`, `alert`), and input attributes (`inputMode`, `autoComplete`).

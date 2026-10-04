# Conservative PWA cleanup — 4 October 2026

Baseline: `eedaebe` on `main`. The tracked working tree was clean. `BOOST.md`, referenced by the supplied instructions, was not found in the workspace.

## Application model and audit scope

The app uses Next.js 16, React 19, TypeScript, npm, Tailwind 4, and Supabase. Public introduction/OTP/OAuth leads to onboarding and the member dashboard. The member shell provides booking, cancellation, and profile pages; subscription selection opens the manual Bit payment handoff. Administrator routes manage classes, attendees, and ticket balances.

Server identity checks, the shared gym store, database RPCs, and notification APIs own the relevant contracts. Booking/cancellation correctness remains in the database. PWA registration and updates have a separate lifecycle; navigation and RSC data remain network-only, while immutable assets and the offline fallback are cached. The current single-palette RTL interface and all route, authentication, persistence, and PWA infrastructure are retained.

Source, route entry points, imports, dynamic imports, tests, scripts, configuration, styling imports, dependency metadata, and public asset references were audited. Only the following verified removal set was changed.

## Removed

| Item | Evidence |
| --- | --- |
| `LandingPage.tsx`: `StudioFeature`, `STUDIO_FEATURES`, `activeFeature`, `toggleFeature`, four unused icon imports | The rendered features use inline markup/icons. The feature array has no reader, the state has no consumer, and no event binds the toggle handler. Remaining authentication, emblem interaction, and viewport effects are unchanged. |
| `src/components/ui/select.tsx` | No source, route, script, test, configuration, dynamic, or string-based import/reference. No registry exposes it. The active scheduling UI uses the calendar/popover and MUI time picker. |
| `src/styles/datepicker.css` | No CSS import or link, no `react-datepicker` dependency/component, and no matching markup. The active date/time controls use other implementations. |
| `@radix-ui/react-select` | Its only import was the orphan select component; no other runtime/build/test consumer. |
| `@liqui-design/glass` | No code/configuration/script/test import. The active `LiquidGlass` and `LiquidGlassButton` are implemented locally and retained. Documentation references the design inspiration. |
| Stale `next-themes` lockfile entry | Already absent from `package.json` and application imports. The local theme provider owns the existing preference cleanup. npm pruned this stale entry when regenerating the lockfile. |

npm 10.9.2 performed the uninstall and lockfile update offline with install scripts disabled. The ten removed installed packages comprise the two declared dependencies, the stale theme package, and seven exclusive Radix entries. No surviving locked package version changed. The temporary npm toolchain is outside the repository.

## Simplified

No runtime logic was rewritten. Deletion was sufficient; uncertain state, guards, compatibility behavior, and infrastructure were preserved.

## Validation

- Dependency validation: passes after removal; package declarations and lockfile agree. The baseline had the glass package missing from the lockfile and an extraneous theme package.
- Typecheck: passes, also with `--noUnusedLocals --noUnusedParameters`. The production build's TypeScript check passes too.
- Source lint (`src`, `next.config.ts`, and the new smoke script): passes with zero errors and four existing `<img>` advisories. The four original dead-code warnings are gone.
- Full repository lint: failed before cleanup (1,025 errors) and still fails (1,116 errors) while scanning generated QA/build/browser artifacts. These failures were not repaired or hidden by changing lint configuration.
- Unit tests: all six PWA-update tests and all seven gym-data tests pass before and after.
- Production build: passes; the final route inventory contains no temporary QA routes.
- New local smoke suite: passed before and after at 390×844 and 1366×768. Exercises login-sheet opening, synthetic OTP submission/error, Escape dismissal, onboarding steps and disabled validation, profile editing, populated/empty bookings, cancellation confirmation, all administrator screens, class creation dialog, offline recovery, and authentication error page. It creates an exclusive temporary route and removes it and its generated route checker afterward. Database writes and real email/payment actions are not performed.
- Existing booking baseline: phone layouts, booking dialog, scrolling clearance, and registered-session filtering passed.
- Existing home baseline: all 104 viewport/state cases passed, including loading/error, long content, administrator variants, and responsive layouts. The final broad rerun could not finish: the local compiler exceeded the original navigation timeout, and later browser evaluation still timed out with a temporary longer deadline. This remains an explicitly unverified check; no home layout or viewport code was changed.
- Subscription rerun: carousel/mobile scenarios, focus trapping/restoration, reduced motion, clipboard success/failure, blocked popup recovery, synthetic Bit handoff, motion profiling, interrupted gestures, and scroll-end fallback assertions completed successfully. The first baseline attempt had an undefined payment counter; it was recorded and no payment implementation was changed.
- Screenshots: 38 paired smoke states compared. After recapturing settled login dialogs, 35 are pixel-identical; three mobile intro captures differ by at most 1/255 per color channel around the decorative sun/glass. No pixel differs by more than one channel level; no geometry, text, or control differences were found. Initial larger dialog-backdrop differences disappeared after allowing the existing animation to settle.
- Production PWA/startup: native checks pass for metadata, pre-paint authentication redirects, manifest/icons, and all 46 opaque centered Apple startup images. Browser checks pass at 320×568, 360×640, 390×844, 430×932, and 844×390 for the initial document without JavaScript, delayed logo loading, reachable actions, relaunch, viewport settling, and resume. The original browser runner passed its first case, then encountered an already-decoded logo rather than a cold request. A temporary copy with service-worker bypass exercised the deliberately delayed network requests; the original runner and application cache policy were left unchanged.
- Production intro motion: normal branch/sun/ring/halo movement, visible artwork through both glass buttons at 320px and 390px, constant glass material through cancelled touch, and stationary artwork with reduced motion all pass.

Browser development screenshots consistently used the font fallback because the sandbox could not download Google Fonts. Live OAuth success, database mutations, real payment, physical-device native launch animation, and installed-device offline behavior were not exercised.

Private logs, screenshots, dependency inventory, and comparison JSON are in `scratch/cleanup/`; full-lint output and the temporary npm toolchain are in `../pwa-cleanup-validation/`. The runtime changes do not include temporary test routes, generated files, or configuration changes made by Next's development server.

## Preserved because uncertain

- Older publicly served icons/images and original artwork: installed clients, cached manifests, external URLs, and asset-generation workflows can outlive source references.
- Historical SQL migrations and maintenance/stress/asset scripts: external CLI and deployment roles are not equivalent to application import reachability.
- Compatibility exports and lifecycle/account-loading guards: external consumers, SSR, reload, account switching, private storage, and PWA resume remain relevant.
- Remaining CSS, motion, and shared UI implementations: dynamic state, portals, responsive variants, and third-party classes make static selector counts insufficient evidence for deletion.

## Metrics

- Application source removed: 299 lines across three files; two files deleted.
- Direct dependency declarations removed: two; one stale lockfile-only dependency also pruned.
- Lockfile reduction: 167 lines; no surviving version changes.
- Reusable behavior/screenshot smoke suite: 230 lines added, using existing Node/Chrome infrastructure and no new project dependency.
- Net code reduction excluding lockfile, package metadata, and this report: 69 lines.

# Talia Studio

Hebrew, right-to-left fitness studio app built with Next.js, React, TypeScript and Supabase. Members book and cancel workouts, view their ticket balance and update their profile. Administrators manage sessions, attendees and credits. The installable PWA uses OneSignal for push notifications.

## Local setup

Use Node.js 22.14 or newer and npm 10 or newer.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Set the Supabase URL and publishable/anon key in `.env.local`. Add `ONESIGNAL_REST_API_KEY` for server notification delivery. Environment files, test credentials and fixtures stay out of Git. On PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

Open http://localhost:3000. Development and production builds use webpack for the PWA integration.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run check` runs all four. Run `npm run build` before `npm run start`. The build downloads and bundles the Varela Round font; it needs access to Google Fonts. Use the lockfile with `npm ci` in CI and deployments.

The unit suite exercises actual application helpers and mutation handlers with local mocks. Browser fixture scripts are described in [scripts/README.md](scripts/README.md). They create temporary local routes; stop them and verify cleanup before a production build. Live database stress scripts require a separate, explicitly authorized test project or isolated fixtures. Never use a production secret in a browser-visible environment variable.

## Production contracts

- Supabase owns authentication and database permissions. Protected routes refresh session cookies before server rendering; layouts independently verify identity and administrator access.
- Apply and verify the ordered migrations in `src/utils/supabase/migrations/` against the intended database. A successful app build does not prove that deployed RPCs and row-level policies match those files.
- Booking and cancellation use atomic database RPCs. Cancellation retains the ten-hour cutoff. Admin mutation receipts prevent duplicate ticket grants and session creation after retries.
- Bit payment is a manual handoff. Opening Bit does not verify payment or grant credits; Talia approves payments before granting tickets.
- Authenticated HTML, RSC payloads and API responses stay out of service-worker caches. The worker caches immutable static assets and the offline fallback.
- Old public PWA icons remain available for installed clients and cached manifests. Do not remove historical public URLs based only on current imports.

Check OAuth redirect URLs, email-code delivery, OneSignal configuration, the deployed migrations and physical-device installation before release. Build/test credentials are not proof of those external services.

See [DESIGN.md](DESIGN.md), [UX-CONTRACT.md](UX-CONTRACT.md), [PWA startup](docs/pwa-startup.md), the [production scan](docs/production-scan-2026-10-11.md), and the [live correctness results](docs/correctness-campaign-2026-10-11.md) for maintained implementation and release evidence.

Older workspace copies and QA output are consolidated in `../.archive/2026-10-11-workspace-cleanup/`; the [workspace cleanup report](docs/workspace-cleanup-2026-10-11.md) records removals, archival and automatic browser-profile teardown. The optional local npm CLI now lives at `../.tools/npm/bin/npm-cli.js`.

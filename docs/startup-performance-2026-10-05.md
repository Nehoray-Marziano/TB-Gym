# Initial app launch investigation

The installed app starts at `/`. Before this change, a returning member's
launch rendered the root account provider (profile, available tickets, and
subscription) just to issue a redirect to `/dashboard`. The dashboard then
verified the session and fetched that account data again, plus the next class.
The public entry page also created its own Supabase client and verified claims
separately from the root provider's request-scoped identity helper.

There is no five-second splash timer. The operating system displays the native
TB launch image while the app prepares its first view. The account queries
already execute concurrently; payload size was not the main avoidable cost.

## Measurements before the change

Measured production `933578d` using an existing synthetic, onboarded trainee.
No bookings, balances, profiles, or subscriptions were changed. Tokens and
cookies are excluded from the reports.

- Three initial HTTP runs: `/` response headers in 6,322 / 1,846 / 1,849 ms;
  `/dashboard` in 2,363 / 2,702 / 1,882 ms. These are separate requests, not a
  measurement of native splash lifetime. The first sample may include cold
  infrastructure or connection costs; no server trace proves their allocation.
- A later mobile browser baseline (390 x 844, 4x CPU slowdown, 60 ms network
  latency, service worker bypass): first contentful paint in 4,352 ms cold and
  3,884 / 3,384 ms warm. The redirect alone consumed 1,707 / 1,925 / 1,930 ms.
- The old redirect included about 24 KB of discarded React HTML/payload.
- The actual test session uses `HS256`. `getClaims()` therefore calls
  `/auth/v1/user`; it is not local JWT verification in this project. Direct
  workstation samples recorded 1.1–3.4 seconds for that call, but those numbers
  must not be treated as Vercel-to-Supabase timings.
- Vercel responses identify the function region as `iad1`. Database region was
  not verified, so a geographic mismatch is a follow-up hypothesis, not a finding.

## Change

`next.config.ts` redirects `/` to `/dashboard` before rendering when the
project's session cookie or its first numbered chunk is present. The redirect
is temporary and preserves the existing manifest start URL and installed app
identity. Its body is only 10 bytes in the local production build.

Cookie presence is a routing hint only. The protected dashboard still verifies
the session, enforces onboarding, and awaits the account and next class before
rendering. An invalid cookie takes `/` -> `/dashboard` -> `/auth/login`; login
has no cookie-presence redirect, so it cannot loop. The public entry and login
also reuse `getGymIdentity()` to avoid an independent verification within the
same server render. Authenticated data remains request-scoped and uncached
across users.

## Verification

- Production build and TypeScript passed. Lint passed with four existing
  image-element warnings; seven account-data tests passed.
- Native startup check passed: auth redirects, early metadata, Android manifest
  and icons, and all 46 Apple startup images.
- Local production browser/HTTP regression passed: guest landing and protected
  routing, both cookie formats, forged-cookie denial without a redirect loop,
  real authenticated launch, account data present in the initial server HTML,
  no busy state at first dashboard DOM, and no browser runtime errors.
- Local redirect headers: 3 / 3 / 5 ms. Local browser first contentful paint:
  3,148 ms cold and 1,788 / 1,596 ms warm. These are not a production speedup
  claim: local and deployed server/network paths differ.
- Browser baseline initially timed out while setting cookies. Establishing
  the browser origin before setting cookies allowed the complete rerun to pass.

Reproduce with `node scripts/check-startup-performance.mjs <baseUrl> <label>`.
Use `--baseline` for an old deployment without the early redirect. It reads
the existing synthetic account from ignored `.dummy-users.json`. Evidence is
written under ignored `scratch/startup-performance/`; browser cookies are cleared
after each campaign. Native splash lifetime still requires an installed phone.

## Further infrastructure improvement

Migrating Supabase Auth to an asymmetric signing key would let `getClaims()`
verify supported tokens locally using cached public keys. This is a separate
auth configuration change; this fix does not rotate keys, weaken verification,
or cache private account data. Function placement should also be compared with
the actual database region before changing it.

References: [Supabase getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims),
[Next.js conditional redirects](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects),
[Vercel function regions](https://vercel.com/docs/functions/configuring-functions/region).

## Follow-up: colocate server execution with the database

After deploying `3b6f8c9`, the same browser campaign measured 3,576 ms cold
and 2,480 / 1,588 ms warm first contentful paint. Redirect time dropped to
142–162 ms. Initial data and guest/invalid-session regression checks passed.

The remaining location mismatch was subsequently verified through public DNS
and AWS's published address allocation data:

- `db.asoqaeujdduqqjfyayht.supabase.co` resolves to
  `2406:da14:1d4f:7400:8d18:cda:9832:abfe`.
- That address falls in AWS's EC2 prefix `2406:da14::/35`, allocated to
  `ap-northeast-1` (Tokyo). This identifies the database's region from its
  address allocation; no authenticated dashboard setting was available because
  the browser automation connection timed out.
- The live version endpoint for `3b6f8c9` returned
  `X-Vercel-Id: fra1::iad1::...`, placing server execution in Washington, D.C.

`vercel.json` now selects the single `hnd1` function region, Vercel's Tokyo
region. This follows Vercel's recommendation to execute database-backed functions
near their database. It changes execution placement only: the database, data,
signing keys, session validation, and complete-data rendering gate stay as they
are. Static files continue to use the global CDN. No additional regions or paid
add-ons are requested. Removing the region override restores the project default.

The benchmark now records `x-vercel-id` for every HTTP measurement so deployed
placement can be verified together with timings. Compare `before-colocation`
and `after-colocation` reports under `scratch/startup-performance/`; a local
build cannot establish the latency benefit of a production region change.

Location references: [AWS IP address allocations](https://ip-ranges.amazonaws.com/ip-ranges.json),
[Vercel region identifiers](https://vercel.com/docs/regions),
[Vercel region configuration](https://vercel.com/docs/functions/configuring-functions/region).

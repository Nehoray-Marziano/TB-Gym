# Launch handoff investigation

The reported sequence is the OS splash, a white frame, a glimpse of wallpaper,
then the signed-out introduction. The launch mark also moves as the status bar
changes. This investigation separates the web document from the OS compositor.

## Findings in Talia

- The follow-up regression checked the initial `<head>`, instead of merely
  searching the completed response. It caught Next.js streaming the generic
  capability, startup-image, and status-bar metadata into the body after the
  initial shell. This is also confirmed in deployed `ba72b75` for `/`,
  `/auth/login`, and `/dashboard`: the status-bar tag arrives after `</head>`.
  A late `black-translucent` declaration can change the screen's coordinate
  origin after the loading frame appears. `htmlLimitedBots: /.*/` disables
  metadata streaming for all user agents so launch metadata precedes the body.
  This can increase time to the first response if future metadata adds slow
  data dependencies; the current metadata is static. Content can still stream.
- Follow-up on the remaining header/mark jump found that Next.js 16.0.10's
  `appleWebApp.capable` emits only `mobile-web-app-capable`. Production HTML at
  `ba72b75` omitted `apple-mobile-web-app-capable`, although Apple's status-bar
  style and startup-image behavior depend on that Apple-specific declaration.
  It is now explicit in the root `<head>`, before the body or hydration. The
  generic tag remains for other browsers. Native OS chrome is not simulated by
  the browser checks; verify the remaining transient header on the affected
  phone before claiming that its native launch transition is resolved.
- The native splash and final canvas already shared `#e9eadc`, but the original
  HTML/body background was defined only in the external global stylesheet.
  Matching the manifest alone did not protect the initial HTML canvas.
- Root `loading.tsx` had been removed. Auth checks and the nested trainee layout
  could leave the first response waiting without a branded loading frame.
- The previous phone-padding rule reserved 59px, then used the greater of that
  and `safe-area-inset-top + 12px`. A 59px inset changes padding to 71px. It also
  did not reserve the home-indicator inset, which changes the hero's usable size.
- Seven portrait-only Apple startup images omitted newer screen sizes and
  landscape, and reused unversioned asset URLs.
- Service-worker registration does not automatically reload on launch. Keep
  the existing user-driven update lifecycle and network-only authenticated
  HTML/RSC caching; cached personal pages are not a safe startup shortcut.

## Implemented behavior

Initial HTML and body styles and a small critical stylesheet define the opaque
canvas. `color-scheme: light` explicitly matches the app's existing single
palette, including when the phone uses dark appearance. A lightweight,
server-rendered root loading frame continues the native TB splash while auth
resolves. Its SVG artwork and layout are inline, with no image, font, stylesheet,
or hydration dependency and no artificial minimum display time.

`pwa-launch.mjs` supplies one geometry definition to the native asset generator,
startup metadata, and HTML loading frame. Startup image URLs are versioned and
cover 13 portrait sizes and their landscape equivalents. On those installed Apple
screens, the loading mark uses the native image's screen coordinates instead of
following a viewport-height change while the status bar settles. Critical Apple-only,
standalone portrait CSS reserves both device insets before they become available;
the introduction keeps the larger of the reserve and the real inset. For shared
X/mini screen metrics, the reserve uses the larger notch inset. Unknown devices,
Android, and ordinary browser windows retain environment-provided safe areas.

The status-bar metadata remains `black-translucent`, consistently in the initial
response. Switching to `default` would place the web viewport below the status
bar and change every full-screen route's coordinate system. There is no verified
evidence that this switch cures the native flash.

## Primary-source research

- [Apple's supported meta tags](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html)
  document the different viewport geometry for translucent versus opaque bars.
- [Next.js issue 74524](https://github.com/vercel/next.js/issues/74524)
  reproduces broken Apple startup images after removal of the Apple capability
  tag and documents adding it explicitly alongside the generic tag. The installed
  Next.js metadata generator and the deployed HTML confirm the same omission here.
- [Next.js streaming metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#streaming-metadata)
  documents metadata arriving in the body after initial UI and the supported
  `htmlLimitedBots: /.*/` setting to keep it in the initial head.
- [Apple's startup image guidance](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
  explains the native startup-image mechanism.
- [WebKit's safe-area guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
  describes `viewport-fit=cover` and the safe-area environment variables.
- [Next.js loading convention](https://nextjs.org/docs/app/api-reference/file-conventions/loading)
  documents server-rendered Suspense fallback, automatic replacement, streaming,
  and fallback coverage of nested layouts.
- [Chrome's PWA manifest guidance](https://web.dev/learn/pwa/web-app-manifest)
  explains how Android derives its splash from manifest colors and icons.
- [WebKit 311569](https://bugs.webkit.org/show_bug.cgi?id=311569), still marked
  NEW when researched, reports an iOS standalone cold-start white flash even
  with matching manifest colors, inline root backgrounds, and critical CSS.
  This is evidence of an engine/OS limitation, not proof that Talia's exact
  wallpaper flash has the same cause.
- [WebKit 316008](https://bugs.webkit.org/show_bug.cgi?id=316008) reports viewport
  unit problems in standalone apps without the translucent status-bar setting.
- [WebKit 305546](https://bugs.webkit.org/show_bug.cgi?id=305546) reports a separate
  Safari status-bar regression during soft navigation. A `theme-color` change
  does not cure that report's problem.

## Verification and limits

Use `node scripts/check-launch-handoff.mjs http://127.0.0.1:3113` against a local
production build. It checks the initial response and all startup assets, withholds
CSS and JS, and exercises zero-to-real safe-area changes for each supported phone
size. Its iOS platform CSS gates are explicitly simulated in Chromium; it does
not reproduce Apple's native compositor. `check-pwa-startup.mjs` separately checks
delayed emblem decoding, reachable controls, resize, resume, and old start URLs.

Use `measure-launch.mjs` with `--path=/` and `--path=/dashboard`, cold and warm,
for CPU/network-throttled filmstrips. The original benchmark also records the
initial `about:blank` canvas, so its white frame must be interpreted with document
commit timing; it alone cannot establish an app-owned white flash.

On a physical iPhone, verify repeated force-quit launches and warm resumptions,
signed-out and signed-in destinations, portrait and landscape, light and dark OS
appearance, and a slow network. Native startup assets may remain cached until the
installed app refreshes its metadata; a fresh installation is a useful comparison,
not the fix itself. An OS-owned frame before the first web paint cannot be covered
by an HTML overlay. Do not claim a perfect native launch until this matrix has
been checked on the affected phone.

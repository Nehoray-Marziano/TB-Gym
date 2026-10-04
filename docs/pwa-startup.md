# Native PWA startup

The launch design is the existing dark TB mark centered on the canonical cream
canvas. The operating system owns its lifetime. There is no React splash,
root loading boundary, minimum display timer, animation, or client-side asset
generator. Login and authenticated destinations resolve normally on the server.

Android generates its native splash from the manifest's name, opaque
`background_color`, `theme_color`, and PNG icons. Normal v4 icons have a
transparent surround so their square bitmap is not a second cream tile inside
the native splash. Maskable v4 icons and the Apple home-screen icon stay opaque
for launcher cropping. Regenerate with `node scripts/generate-pwa-icons.mjs`.
Keep the 192/512 sizes, standalone display, `/` start URL, stable `/` ID, and
`/` scope.

iOS uses static `apple-touch-startup-image` links with device-size, pixel-ratio,
and orientation media queries. `src/lib/pwa-startup.mjs` describes 23 full-screen
sizes (14 phone sizes and nine tablet sizes), each in portrait and landscape.
`scripts/generate-pwa-startup.mjs` generates the 46 opaque PNGs from the existing
SVG using the project's installed Sharp dependency. The SVG box is 128 CSS
pixels on every device and centered in the image. No header, divider, or text
is drawn. Regenerate with `node scripts/generate-pwa-startup.mjs`; bump the
`v1` asset prefix when changing the artwork or geometry.

The root head declares Apple capability, title, startup links, and the existing
`default` status-bar style before the body. These declarations have one owner
and are not repeated through streamed Next metadata. Inline HTML/body backgrounds
match `--studio-canvas` and the manifest before CSS arrives. The app's single
light palette is declared explicitly. Device-specific safe-area CSS is not used
for the splash; app screens keep their existing environment-based padding.

The signed-out intro has an opaque, viewport-sized canvas in normal document
flow, declared in the server HTML. CSS owns its initial height. A passive
viewport listener corrects only an actual size discrepancy during keyboard or
resume changes. Do not synchronously replace its height during hydration or
make the entire intro a fixed compositor layer. Existing illustrations, glass
buttons, and interaction owners retain their design.

Startup assets are excluded from Workbox precaching. Apple selects the matching
image, so every browser need not download all device images when installing the
service worker. Both `cacheStartUrl` and `dynamicStartUrl` are disabled: this
plugin injects a NetworkFirst launch-page cache if only the first option is
disabled. Navigation and RSC remain network-only. Existing worker activation
cleans the old start-url cache; Workbox removes obsolete precache entries.
Updates remain user-driven, without an automatic launch reload.

## Cleanup audit

The removed implementation's components, root loading page, geometry helper,
native image URLs, CSS reserves, render-blocking hint, and legacy generators
are absent. The local `.next-launch-qa` build still contained the old code and
was deleted. The generated `public/sw.js` also referenced deleted images; a
fresh production build replaces it and verification rejects those old URLs.
PWA icons, manifest/install support, normal route skeletons, and startup QA
tools are maintained app capabilities, not a second splash implementation.

## Verification

Run a production build and server, then:

```text
node scripts/check-native-startup.mjs http://127.0.0.1:3116
node scripts/check-pwa-startup.mjs http://127.0.0.1:3116
```

The native check verifies cleanup, metadata in the initial head, HTTP redirects
before rendering, the manifest/icons, served PNG dimensions and opacity, and
that every pixel outside the centered logo box is plain cream. The browser
check also disables JavaScript and verifies an opaque, complete login canvas
with reachable actions before hydration, then verifies delayed logo downloads,
viewport changes, and resume. A physical installed app is still needed to validate the OS animation,
cold launches and warm resumes on the affected iPhone/Android phone. Static
startup images cover the listed full-screen windows; unlisted or iPad multitask
windows retain the platform fallback. Existing installations can retain cached
native launch assets until their installation metadata refreshes.

## Android screenshot investigation

The reported screenshot shows a rounded Android launch window, a square icon
boundary, and a line below the status region. Pixel inspection of the previous
v3 icons found no drawn border and no non-opaque pixels. The v4 transparent
normal icons remove the bitmap's background tile; this is an app-side
mitigation, not proof that the browser's native icon treatment is fixed.

Chromium's native `SplashController` explicitly handles a translucent window,
removes translucency, and waits for a compositor redraw before fading its
splash. Its source documents historical white flashes and wallpaper-related
glitches in that handoff. `WebappSplashController` also compensates native
system-bar insets to avoid moving its icon. CSS in a web document cannot draw
or remove a line in that native window. The screenshot alone does not establish
which browser/version rendered the line or what caused the wallpaper flash.
Do not describe browser-only checks as validation of that native transition.

WebAPK updates are separate from service-worker updates. A fresh installation
is the diagnostic control for changed manifest icons/colors; reloading the page
does not prove those native assets refreshed. Record the phone, Android version,
installation browser/version, fresh-install result, and signed-in/signed-out
comparison when reproducing the issue. A persistent flash with the verified
opaque login document needs a device/browser trace rather than another overlay.

## Research

- [Google: Web app manifest](https://web.dev/learn/pwa/web-app-manifest) — Android
  native splash generation and opaque manifest colors.
- [Google: PWA enhancements](https://web.dev/learn/pwa/enhancements) — Apple's
  static startup images, exact window sizes, orientation queries, and generation.
- [Apple: Configuring web applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
  — launch image links and home-screen app configuration.
- [Apple: Supported meta tags](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html)
  — stable status-bar modes and their viewport behavior.
- [PWA Asset Generator device data](https://github.com/elegantapp/pwa-asset-generator/blob/master/src/config/apple-fallback-data.json)
  — reference device pixel sizes for static native asset generation.
- [Next: redirect](https://nextjs.org/docs/app/api-reference/functions/redirect)
  — HTTP redirects before streaming versus client redirects after streaming.
- [Chromium: native splash controller](https://github.com/chromium/chromium/blob/main/chrome/android/java/src/org/chromium/chrome/browser/browserservices/ui/splashscreen/SplashController.java)
  — native translucency, compositor redraw, and splash dismissal.
- [Chromium: WebAPK splash and insets](https://github.com/chromium/chromium/blob/main/chrome/android/java/src/org/chromium/chrome/browser/browserservices/ui/splashscreen/webapps/WebappSplashController.java)
  — static native artwork and system-bar alignment.
- [Chromium: WebAPK update pipeline](https://github.com/chromium/chromium/blob/main/chrome/android/java/src/org/chromium/chrome/browser/webapps/README.md)
  — manifest changes update the installed Android package separately.

# Native PWA startup

The launch design is the existing dark TB mark centered on the canonical cream
canvas. The operating system owns its lifetime. There is no React splash,
root loading boundary, minimum display timer, animation, or client-side asset
generator. Login and authenticated destinations resolve normally on the server.

Android generates its native splash from the manifest's name, opaque
`background_color`, `theme_color`, and PNG icons. Keep the existing 192/512
normal and maskable icons, standalone display, `/` start URL, stable `/` ID,
and `/` scope.

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
check verifies login controls, delayed logo downloads, viewport changes, and
resume. A physical installed app is still needed to validate the OS animation,
cold launches and warm resumes on the affected iPhone/Android phone. Static
startup images cover the listed full-screen windows; unlisted or iPad multitask
windows retain the platform fallback. Existing installations can retain cached
native launch assets until their installation metadata refreshes.

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

// The native startup images and the HTML loading frame share this geometry.
// Colors mirror the canonical --studio-canvas / --studio-ink in globals.css.
export const LAUNCH_BACKGROUND = "#e9eadc";
export const LAUNCH_INK = "#162218";
export const LAUNCH_MARK_RATIO = 0.32;
export const LAUNCH_MARK_TOP = 0.45;

// CSS screen dimensions, pixel ratio, and portrait safe areas. These reserves
// exist before WebKit resolves env(safe-area-inset-*), including on cold launch.
export const APPLE_LAUNCH_SCREENS = [
  { width: 320, height: 568, scale: 2, top: 20, bottom: 0 },
  { width: 375, height: 667, scale: 2, top: 20, bottom: 0 },
  { width: 414, height: 736, scale: 3, top: 20, bottom: 0 },
  { width: 360, height: 780, scale: 3, top: 50, bottom: 34 },
  // X/XS/11 Pro and zoomed mini models share these metrics; reserve the larger inset.
  { width: 375, height: 812, scale: 3, top: 50, bottom: 34 },
  { width: 390, height: 844, scale: 3, top: 47, bottom: 34 },
  { width: 393, height: 852, scale: 3, top: 59, bottom: 34 },
  { width: 402, height: 874, scale: 3, top: 62, bottom: 34 },
  { width: 414, height: 896, scale: 2, top: 44, bottom: 34 },
  { width: 420, height: 912, scale: 3, top: 62, bottom: 34 },
  { width: 428, height: 926, scale: 3, top: 47, bottom: 34 },
  { width: 430, height: 932, scale: 3, top: 59, bottom: 34 },
  { width: 440, height: 956, scale: 3, top: 62, bottom: 34 },
];

function screenQuery(screen) {
  return `(device-width: ${screen.width}px) and (device-height: ${screen.height}px) and (-webkit-device-pixel-ratio: ${screen.scale})`;
}

export const APPLE_STARTUP_IMAGES = APPLE_LAUNCH_SCREENS.flatMap((screen) => {
  const width = screen.width * screen.scale;
  const height = screen.height * screen.scale;
  return [
    { url: `/apple-splash-v4-${width}-${height}.png`, media: `screen and ${screenQuery(screen)} and (orientation: portrait)` },
    { url: `/apple-splash-v4-${height}-${width}.png`, media: `screen and ${screenQuery(screen)} and (orientation: landscape)` },
  ];
});

// Keep this small and inline: the document must be opaque before CSS/JS downloads.
export const LAUNCH_CRITICAL_CSS = `
html{background:${LAUNCH_BACKGROUND};color-scheme:light;height:100%}
body{background:${LAUNCH_BACKGROUND};min-height:100%;margin:0}
@supports (-webkit-touch-callout:none){
${APPLE_LAUNCH_SCREENS.map((screen) => `@media (display-mode:standalone) and ${screenQuery(screen)}{
@media (orientation:portrait){
.studio-welcome{--studio-launch-safe-top:${screen.top}px;--studio-launch-safe-bottom:${screen.bottom}px}
[data-studio-launch]{--studio-launch-mark-size:${screen.width * LAUNCH_MARK_RATIO}px;--studio-launch-mark-top:${screen.height * LAUNCH_MARK_TOP}px}
}
@media (orientation:landscape){[data-studio-launch]{--studio-launch-mark-size:${screen.width * LAUNCH_MARK_RATIO}px;--studio-launch-mark-top:${screen.width * LAUNCH_MARK_TOP}px}}
}`).join("\n")}
}
`;

// Native PWA launch assets only. This module adds no browser layout or timers.
// Match the canonical --studio-canvas / --studio-ink in globals.css.
export const PWA_BACKGROUND = "#e9eadc";
export const PWA_INK = "#162218";
export const STARTUP_LOGO_SIZE = 128; // CSS pixels, independent of orientation

// Full-screen Apple window sizes: CSS width, CSS height, device pixel ratio.
// Equal-size devices share an image; DPR distinguishes XR/11 from XS Max/11 Pro Max.
// New device/window sizes require a new entry and regenerated static assets.
export const APPLE_SCREENS = [
  [320, 568, 2], [375, 667, 2], [414, 736, 3],
  [360, 780, 3], [375, 812, 3], [390, 844, 3], [393, 852, 3],
  [402, 874, 3], [414, 896, 2], [414, 896, 3], [420, 912, 3],
  [428, 926, 3], [430, 932, 3], [440, 956, 3],
  [744, 1133, 2], [768, 1024, 2], [810, 1080, 2], [820, 1180, 2],
  [834, 1112, 2], [834, 1194, 2], [834, 1210, 2],
  [1024, 1366, 2], [1032, 1376, 2],
];

export const APPLE_STARTUP_IMAGES = APPLE_SCREENS.flatMap(([width, height, scale]) =>
  ["portrait", "landscape"].map((orientation) => {
    const landscape = orientation === "landscape";
    return {
      href: `/pwa-startup/v1-${(landscape ? height : width) * scale}x${(landscape ? width : height) * scale}.png`,
      width: (landscape ? height : width) * scale,
      height: (landscape ? width : height) * scale,
      scale,
      media: `screen and (device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${scale}) and (orientation: ${orientation})`,
    };
  })
);

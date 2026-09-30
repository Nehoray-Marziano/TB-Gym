import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: false,
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: false,
  // The home page redirects according to the signed-in user. Never precache it.
  cacheStartUrl: false,
  // Fallback for offline pages
  fallbacks: {
    document: '/~offline',
  },
  // The default routes cache pages, RSC payloads and API responses. Those can
  // contain another user's booking, balance or profile after an account switch.
  extendDefaultRuntimeCaching: false,
  workboxOptions: {
    disableDevLogs: true,
    // Let the in-app update prompt activate the new worker at a safe moment.
    skipWaiting: false,
    clientsClaim: false,
    importScripts: ["/pwa-cache-cleanup.js", "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js"],
    runtimeCaching: [
      // Authenticated HTML and Next.js RSC requests always come from the
      // network. The precached offline page handles failed navigations.
      {
        urlPattern: ({ request, url }) => url.origin === self.location.origin && request.mode === "navigate",
        handler: "NetworkOnly",
      },
      {
        urlPattern: ({ request, url }) => url.origin === self.location.origin && request.headers.get("RSC") === "1",
        handler: "NetworkOnly",
      },
      // Keep only immutable build assets available offline. User data and API
      // responses are never placed in Cache Storage.
      {
        urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/_next/static/"),
        handler: "CacheFirst",
        options: { cacheName: "next-static-v1", expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 30 } },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {},
  distDir: process.env.TALIA_BUILD_DIR || ".next",
};

export default withPWA(nextConfig);

import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: false,
  // Disable aggressive features that cause issues
  cacheOnFrontEndNav: false, // Was causing navigation issues
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: false, // Was causing restarts
  dynamicStartUrl: false,
  // Fallback for offline pages
  fallbacks: {
    document: '/~offline',
  },
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    disableDevLogs: true,
    // CRITICAL: Both false to prevent aggressive takeover
    skipWaiting: false,
    clientsClaim: false, // Changed from true - this was causing issues!
    importScripts: ["https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js"],
    runtimeCaching: [
      {
        // Auth pages - NEVER cache
        urlPattern: /\/auth\/.*/i,
        handler: "NetworkOnly",
        options: {
          cacheName: "auth-pages-no-cache",
        },
      },
      {
        // Never replay personalized HTML or RSC payloads across accounts.
        urlPattern: /\/(?:dashboard|book|my-bookings|profile|subscription|onboarding|admin)(?:\/|\?|$)/i,
        handler: "NetworkOnly",
      },
      {
        // Supabase API - NEVER cache
        urlPattern: /^https:\/\/[^/]+\.supabase\.co\/rest\/v1\/.*/i,
        handler: "NetworkOnly",
        options: {
          cacheName: "supabase-api-no-cache",
        },
      },
      {
        // Supabase Auth - NEVER cache
        urlPattern: /^https:\/\/[^/]+\.supabase\.co\/auth\/.*/i,
        handler: "NetworkOnly",
        options: {
          cacheName: "supabase-auth-no-cache",
        },
      },
      {
        // Static Images
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "image-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
        },
      },
      {
        // JS/CSS Assets
        urlPattern: /\.(?:js|css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-assets",
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 60 * 60 * 24,
          },
        },
      },
      {
        // Google Fonts
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
        },
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

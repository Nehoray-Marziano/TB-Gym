import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: false, // Force enable to ensure sw.js is generated
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  // Enable dynamic start URL for faster app launch
  dynamicStartUrl: true,
  dynamicStartUrlRedirect: '/dashboard',
  // Fallback for offline pages
  fallbacks: {
    document: '/~offline',
  },
  workboxOptions: {
    disableDevLogs: true,
    // Skip waiting to activate new service worker immediately
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        // Supabase API: StaleWhileRevalidate for fast offline access
        urlPattern: /^https:\/\/asoqaeujdduqqjfayht\.supabase\.co\/rest\/v1\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "supabase-api-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // Supabase Auth endpoints - NetworkFirst for auth (needs fresh data)
        urlPattern: /^https:\/\/asoqaeujdduqqjfayht\.supabase\.co\/auth\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "supabase-auth-cache",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60, // 1 hour
          },
          networkTimeoutSeconds: 3,
        },
      },
      {
        // Static Images: CacheFirst
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "image-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
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
            maxAgeSeconds: 60 * 60 * 24, // 24 hours
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
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {}, // Silence Turbopack/Webpack conflict
  // allowedDevOrigins only needed for local dev, Vercel handles this automatically
};

export default withPWA(nextConfig);

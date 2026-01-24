import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: false, // Force enable to ensure sw.js is generated
  // CRITICAL: Enable aggressive caching for instant navigation
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true, // Reload when back online to refresh session
  // Enable dynamic start URL for faster app launch
  dynamicStartUrl: true,
  dynamicStartUrlRedirect: '/dashboard',
  // Fallback for offline pages
  fallbacks: {
    document: '/~offline',
  },
  // Exclude auth-sensitive routes from navigation fallback
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    disableDevLogs: true,
    // Skip waiting to activate new service worker immediately
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        // CRITICAL: Auth pages - NEVER cache (session-dependent)
        urlPattern: /\/auth\/.*/i,
        handler: "NetworkOnly",
        options: {
          cacheName: "auth-pages-no-cache",
        },
      },
      {
        // CRITICAL: Dashboard - NEVER cache (session-dependent)
        urlPattern: /\/dashboard/i,
        handler: "NetworkOnly",
        options: {
          cacheName: "dashboard-no-cache",
        },
      },
      {
        // Static pages - NetworkFirst to ensure fresh content
        // Falls back to cache quickly (3s) if network is slow/offline
        urlPattern: /\/(subscription|book|onboarding|profile)/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "static-pages-v2",
          networkTimeoutSeconds: 3, // Fast fallback to cache
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60, // 1 hour (reduced from 24h)
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        // Supabase API: NEVER cache data - must always be fresh
        // Tickets, sessions, bookings etc. must reflect current state
        urlPattern: /^https:\/\/asoqaeujdduqqjfayht\.supabase\.co\/rest\/v1\/.*/i,
        handler: "NetworkOnly",
        options: {
          cacheName: "supabase-api-no-cache",
        },
      },
      {
        // Supabase Auth endpoints - NEVER cache auth (must always be fresh)
        // This is critical for PWA session persistence
        urlPattern: /^https:\/\/asoqaeujdduqqjfayht\.supabase\.co\/auth\/.*/i,
        handler: "NetworkOnly",
        options: {
          // NetworkOnly doesn't use cache, but we can add background sync for offline
          cacheName: "supabase-auth-no-cache",
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

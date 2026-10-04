import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function getAppBuildId() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  // A deterministic fallback also works when the deployment omits Git metadata.
  const hash = createHash("sha256");
  const addDirectory = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) addDirectory(file);
      else if (entry.isFile() && !/^(sw\.js(\.map)?|workbox-.*|fallback-.*\.js)$/.test(entry.name)) {
        hash.update(file.slice(process.cwd().length));
        hash.update(readFileSync(file));
      }
    }
  };
  addDirectory(join(process.cwd(), "src"));
  addDirectory(join(process.cwd(), "public"));
  for (const file of ["next.config.ts", "package-lock.json"]) hash.update(readFileSync(join(process.cwd(), file)));
  return hash.digest("hex");
}

const withPWA = withPWAInit({
  dest: "public",
  disable: false,
  // ServiceWorkerRegister owns registration and the update lifecycle.
  register: false,
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: false,
  // The home page redirects according to the signed-in user. Never precache it.
  cacheStartUrl: false,
  // The plugin otherwise injects a separate NetworkFirst start-url cache even
  // with cacheStartUrl disabled, potentially reviving an obsolete launch page.
  dynamicStartUrl: false,
  // Apple downloads the matching native image. Do not precache every device's
  // launch image in every browser during service-worker installation.
  publicExcludes: ["!noprecache/**/*", "!pwa-startup/**/*"],
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
    // Also lets the previously deployed update button receive controllerchange.
    clientsClaim: true,
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
  env: { APP_BUILD_ID: getAppBuildId() },
  async headers() {
    return [{
      source: "/sw.js",
      headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
    }];
  },
};

export default withPWA(nextConfig);

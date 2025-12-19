import type { NextConfig } from "next";



import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {}, // Silence Turbopack/Webpack conflict
  // allowedDevOrigins only needed for local dev, Vercel handles this automatically
};

export default withPWA(nextConfig);

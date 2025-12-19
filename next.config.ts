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
  allowedDevOrigins: ["http://192.168.31.219", "http://192.168.31.219:3000", "http://localhost:3000"],
};

export default withPWA(nextConfig);

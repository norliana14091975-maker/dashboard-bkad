import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "127.0.0.1",
    ".space-z.ai",  // Allow all preview subdomains from the sandbox
  ],
  // Exclude pdfjs-dist and its optional deps from bundling.
  // This prevents Turbopack/webpack from trying to resolve deep
  // node_modules paths and browser-only modules (canvas, path2d-polyfill)
  // that don't have Node.js exports.
  serverExternalPackages: ["pdfjs-dist", "canvas", "path2d-polyfill"],
};

export default nextConfig;

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
};

export default nextConfig;

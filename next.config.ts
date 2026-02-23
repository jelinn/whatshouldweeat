import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Configure image domains if needed
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Set workspace root to this directory
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

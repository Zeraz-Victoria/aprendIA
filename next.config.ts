import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce memory usage during production builds (critical for Render 512MB)
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true, // Skip TS checks during build to save RAM (we already check locally)
  },
};

export default nextConfig;

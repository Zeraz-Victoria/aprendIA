import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce memory usage during production builds (critical for Render 512MB)
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

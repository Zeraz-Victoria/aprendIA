import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reduce memory usage during production builds
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
};

export default nextConfig;

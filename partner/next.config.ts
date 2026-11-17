import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  trailingSlash: true,
  // The build scripts set BUILD_MODE, but Next only hands a variable to the
  // browser when it is prefixed, so it is mapped here rather than in each of
  // the four scripts. A plain `next build` sets nothing and counts as release.
  env: {
    NEXT_PUBLIC_BUILD_MODE: process.env.BUILD_MODE === 'development' ? 'development' : 'production',
  },
};

export default nextConfig;

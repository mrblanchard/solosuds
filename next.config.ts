import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["dev.solosuds.app"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["dev.solosuds.com"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

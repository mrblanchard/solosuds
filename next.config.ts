import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["dev.soapsuds.app"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

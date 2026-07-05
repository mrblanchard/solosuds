import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["dev.solosuds.app"],
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      // Twilio's console has the status callback saved with a capital "T"
      // (/api/Twilio/status) and it can't be edited there, so route it to
      // the real (lowercase) handler instead of asking Twilio to change it.
      { source: "/api/Twilio/status", destination: "/api/twilio/status" },
    ];
  },
};

export default nextConfig;

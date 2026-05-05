import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["claude-box.orb.local"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;

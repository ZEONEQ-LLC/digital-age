import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["claude-box.orb.local"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "*.mzstatic.com" },
      { protocol: "https", hostname: "i.scdn.co" },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/**",
      },
      // Temporär: alte WP-Hosting-URLs der migrierten Artikel. Fällt mit
      // Phase 8e (Bilder ins Supabase-Storage) weg. Vor Domain-Switch
      // zwingend, sonst werden URLs tot.
      {
        protocol: "https",
        hostname: "digital-age.ch",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;

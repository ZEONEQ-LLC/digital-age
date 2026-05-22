import type { NextConfig } from "next";
import redirectMap from "./migration/redirect-map.json";

// WP→Vercel-Migration: 76 statische 301-Redirects. Quelle ist
// `migration/redirect-map.json` (separat gepflegt). Alle Einträge sind
// permanent (301), damit Google + Social-Media-Crawler langfristig die
// neuen Ziele lernen. Pre-Domain-Switch zwingend, sonst brechen alle
// eingehenden Links.
type RedirectEntry = {
  source: string;
  destination: string;
  type: string;
  confidence: string;
};

const nextConfig: NextConfig = {
  allowedDevOrigins: ["claude-box.orb.local"],
  // Next.js' Default-Verhalten (308 von /foo/ auf /foo) deaktivieren, damit
  // unsere Custom-Redirects die Slash-Variante direkt matchen können —
  // sonst Double-Redirect (308 slash-strip + 308 custom). Map enthält pro
  // Eintrag beide Varianten.
  skipTrailingSlashRedirect: true,
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
  async redirects() {
    // Runtime-Expansion gegen zwei Fallstricke:
    // (1) Next.js default ist `trailingSlash: false` → eingehende
    //     `/foo/` werden mit 308 auf `/foo` gestrippt. Würde das vor
    //     unserer 301-Logik laufen, hätten wir Double-Redirect. Daher
    //     pro Eintrag ZWEI Regeln registrieren: mit und ohne Slash.
    // (2) Map-Einträge bei denen source === destination (z.B. /impressum
    //     → /impressum, Snapshot identischer Slugs WP/Vercel) sind
    //     Self-Loops und werden ausgefiltert. Next.js würde sonst
    //     unendlich auf die gleiche URL umleiten.
    const map = redirectMap as RedirectEntry[];
    const rules: { source: string; destination: string; permanent: boolean }[] = [];
    for (const entry of map) {
      if (entry.source === entry.destination) continue;
      rules.push({
        source: entry.source,
        destination: entry.destination,
        permanent: true,
      });
      rules.push({
        source: `${entry.source}/`,
        destination: entry.destination,
        permanent: true,
      });
    }
    return rules;
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

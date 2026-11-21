import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/siteUrl";

// Crawl-Steuerung pro Environment:
//   - production: allow alle, sitemap-Hinweis dabei.
//   - preview / development / local: disallow alle. KEINE sitemap-Referenz —
//     sonst zieht ein neugieriger Crawler die Preview-Sitemap, obwohl wir
//     den Crawl per disallow gesperrt haben.
// Fehlt VERCEL_ENV (z.B. lokaler `next start`), default = disallow. Bewusst,
// schützt vor versehentlichem Crawl lokaler Test-Server.
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "production") {
    return {
      // /vorschau und /showcase/mitmachen: nur ueber einen Token-Link
      // erreichbar, nie indexieren.
      rules: [{ userAgent: "*", allow: "/", disallow: ["/vorschau/", "/showcase/mitmachen/", "/showcase/teilen/"] }],
      sitemap: `${getBaseUrl()}/sitemap.xml`,
    };
  }
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}

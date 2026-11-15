import type { MetadataRoute } from "next";

// Sitemap als XML, im selben Aufbau wie Next ihn aus app/sitemap.ts erzeugt
// hat (Reihenfolge loc, image:image, lastmod, changefreq, priority), damit
// sich fuer Suchmaschinen nichts aendert. Rein und getestet.

const HEAD =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function lastmod(value: string | Date | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  return value;
}

export function renderSitemapXml(entries: MetadataRoute.Sitemap): string {
  let xml = HEAD;
  for (const e of entries) {
    xml += "<url>\n";
    xml += `<loc>${escapeXml(e.url)}</loc>\n`;
    for (const image of e.images ?? []) {
      xml += `<image:image>\n<image:loc>${escapeXml(image)}</image:loc>\n</image:image>\n`;
    }
    const mod = lastmod(e.lastModified);
    if (mod) xml += `<lastmod>${escapeXml(mod)}</lastmod>\n`;
    if (e.changeFrequency) xml += `<changefreq>${e.changeFrequency}</changefreq>\n`;
    if (typeof e.priority === "number") xml += `<priority>${e.priority}</priority>\n`;
    xml += "</url>\n";
  }
  return `${xml}</urlset>\n`;
}

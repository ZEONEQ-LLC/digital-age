// npx tsx src/lib/sitemap/__tests__/xml.manual.ts
import assert from "node:assert/strict";

import { escapeXml, renderSitemapXml } from "../xml";

assert.equal(escapeXml(`a&b<c>d"e'f`), "a&amp;b&lt;c&gt;d&quot;e&apos;f");

const xml = renderSitemapXml([
  { url: "https://digital-age.ch/", lastModified: new Date("2026-11-15T19:15:05.495Z"), changeFrequency: "daily", priority: 1 },
  {
    url: "https://digital-age.ch/artikel/beispiel",
    lastModified: new Date("2026-10-05T14:04:42.201Z"),
    changeFrequency: "monthly",
    priority: 0.8,
    images: ["https://example.supabase.co/storage/v1/object/public/articles/x/bild.webp?a=1&b=2"],
  },
  { url: "https://digital-age.ch/tag/ki & recht" },
  { url: "https://digital-age.ch/ohne-datum", lastModified: new Date("kaputt"), priority: 0.3 },
  { url: "https://digital-age.ch/text-datum", lastModified: "2026-11-13T18:46:20.516Z", changeFrequency: "yearly" },
]);

// Genau der Aufbau, den Next bisher ausgegeben hat.
assert.equal(
  xml,
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
<url>
<loc>https://digital-age.ch/</loc>
<lastmod>2026-11-15T19:15:05.495Z</lastmod>
<changefreq>daily</changefreq>
<priority>1</priority>
</url>
<url>
<loc>https://digital-age.ch/artikel/beispiel</loc>
<image:image>
<image:loc>https://example.supabase.co/storage/v1/object/public/articles/x/bild.webp?a=1&amp;b=2</image:loc>
</image:image>
<lastmod>2026-10-05T14:04:42.201Z</lastmod>
<changefreq>monthly</changefreq>
<priority>0.8</priority>
</url>
<url>
<loc>https://digital-age.ch/tag/ki &amp; recht</loc>
</url>
<url>
<loc>https://digital-age.ch/ohne-datum</loc>
<priority>0.3</priority>
</url>
<url>
<loc>https://digital-age.ch/text-datum</loc>
<lastmod>2026-11-13T18:46:20.516Z</lastmod>
<changefreq>yearly</changefreq>
</url>
</urlset>
`,
);

assert.equal(
  renderSitemapXml([]),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
</urlset>
`,
);

console.log("sitemap xml: alle Tests gruen");

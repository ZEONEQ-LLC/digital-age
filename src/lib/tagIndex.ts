// Tag-Seiten mit sehr wenigen Beitraegen sind fuer Google duenne Listen
// (Search Console 18.11.2026: 98 Seiten «gecrawlt, nicht indexiert»).
// Unter der Schwelle: noindex, follow und nicht in der Sitemap. Gezaehlt
// werden publizierte Beitraege mit dem Tag (redaktionell und Showcase),
// gleich wie `get_top_tags`, damit Sitemap und Seite nie widersprechen.
export const TAG_INDEX_MIN_ARTICLES = 3;

export function tagIsIndexable(publishedCount: number): boolean {
  return publishedCount >= TAG_INDEX_MIN_ARTICLES;
}

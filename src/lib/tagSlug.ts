// Tag-Slugifier. Identische Logik wie `migration/migrate-tags.ts` (für
// einen sauberen Roundtrip nach der Migration). Slug-Konvention:
//   - lowercase
//   - Umlaute translit (ä → ae usw.)
//   - `&` → `und`
//   - Sonderzeichen → `-`
//   - Trim `-` an Rändern
//   - max 80 Zeichen
export function slugifyTag(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/&/g, "und")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

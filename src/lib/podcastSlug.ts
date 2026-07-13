// Podcast-Slugifier. IDENTISCHE Logik wie der Backfill in der Migration
// 20260713201930_podcast_self_hosted_schema.sql (lowercase, Umlaut-Translit
// ae/oe/ue/ss, & -> und, Sonderzeichen -> '-', Raender trimmen, max 80).
// Muss konsistent bleiben, damit server-generierte Slugs zum DB-Backfill
// passen.
export function slugifyPodcast(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/&/g, "und")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return base === "" ? "podcast" : base;
}

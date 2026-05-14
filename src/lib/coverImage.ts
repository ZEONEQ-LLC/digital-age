// Default-Cover für Artikel ohne eigenes Bild. Liegt unter
// `public/images/defaults/article-cover-default.png`.
export const DEFAULT_COVER_URL = "/images/defaults/article-cover-default.png";

// Resolver für article-cover-URLs: leerer/nullish-Wert fällt auf das
// Default-Bild zurück. Wird in allen Card- und Hero-Render-Stellen verwendet,
// damit kein leerer Bild-Slot entsteht.
export function getCoverUrl(
  source: { cover_image_url?: string | null } | null | undefined,
): string {
  const v = source?.cover_image_url;
  if (!v || v.trim() === "") return DEFAULT_COVER_URL;
  return v;
}

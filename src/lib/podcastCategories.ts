// Feste Kategorienliste fuer Podcast-Empfehlungen. Eine Quelle fuer das
// Formular (PodcastForm) und die automatische Anreicherung (podcasts/ingest).
export const PODCAST_CATEGORIES = [
  "KI & Forschung",
  "KI im Business",
  "News & Updates",
  "Tech & Society",
  "Future Tech",
  "Swiss AI",
] as const;

export type PodcastCategory = (typeof PODCAST_CATEGORIES)[number];

export function isPodcastCategory(value: string): value is PodcastCategory {
  return (PODCAST_CATEGORIES as readonly string[]).includes(value);
}

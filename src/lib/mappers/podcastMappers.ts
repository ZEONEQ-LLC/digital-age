import type { PodcastWithRecommender, PodcastLanguage } from "@/lib/podcastApi";

export const PODCAST_LANGUAGES: readonly {
  code: PodcastLanguage;
  label: string;
  short: string;
}[] = [
  { code: "de", label: "Deutsch", short: "DE" },
  { code: "en", label: "Englisch", short: "EN" },
  { code: "fr", label: "Français", short: "FR" },
  { code: "it", label: "Italiano", short: "IT" },
] as const;

export type PodcastCardVM = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover: string;
  language: PodcastLanguage;
  langShort: string;
  langLabel: string;
  category: string;
  sourceType: "external" | "self_hosted";
  audioUrl: string | null;
  durationSeconds: number | null;
  aiGenerated: boolean;
  spotifyUrl: string | null;
  applePodcastsUrl: string | null;
  youtubeUrl: string | null;
  soundcloudUrl: string | null;
  audibleUrl: string | null;
  recommendedAtIso: string;
  recommendedAtFormatted: string;
  recommender: {
    name: string;
    handle: string | null;
  } | null;
};

function formatDateDE(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function langMeta(code: string): { short: string; label: string } {
  const found = PODCAST_LANGUAGES.find((l) => l.code === code);
  return found
    ? { short: found.short, label: found.label }
    : { short: code.toUpperCase(), label: code };
}

export function podcastToCardVM(row: PodcastWithRecommender): PodcastCardVM {
  const meta = langMeta(row.language);
  const recommender = row.recommended_by
    ? {
        name: row.recommended_by.display_name,
        handle: row.recommended_by.handle ?? row.recommended_by.slug,
      }
    : null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    cover: row.cover_image_url ?? "",
    language: row.language as PodcastLanguage,
    langShort: meta.short,
    langLabel: meta.label,
    category: row.podcast_category,
    sourceType: (row.source_type as "external" | "self_hosted") ?? "external",
    audioUrl: row.audio_url,
    durationSeconds: row.duration_seconds,
    aiGenerated: row.ai_generated ?? false,
    spotifyUrl: row.spotify_url,
    applePodcastsUrl: row.apple_podcasts_url,
    youtubeUrl: row.youtube_url,
    soundcloudUrl: row.soundcloud_url,
    audibleUrl: row.audible_url,
    recommendedAtIso: row.recommended_at,
    recommendedAtFormatted: formatDateDE(row.recommended_at),
    recommender,
  };
}

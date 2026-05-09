// TODO Phase 7+: Replace with Supabase row types (podcasts table).

import type { ListenLinksMap } from "@/components/ListenLinks";

export type PodcastLanguage = "de" | "en" | "fr" | "it";

export const PODCAST_LANGUAGES: { code: PodcastLanguage; label: string; short: string }[] = [
  { code: "de", label: "Deutsch",  short: "DE" },
  { code: "en", label: "Englisch", short: "EN" },
  { code: "fr", label: "Français", short: "FR" },
  { code: "it", label: "Italiano", short: "IT" },
];

export const PODCAST_CATEGORIES = [
  "KI & Forschung",
  "KI im Business",
  "News & Updates",
  "Tech & Society",
  "Future Tech",
  "Swiss AI",
  "Tools & Praxis",
] as const;

export type PodcastCategory = typeof PODCAST_CATEGORIES[number];

// Structurally identical to ListenLinksMap; re-exported so podcast-related
// code stays inside the podcast type namespace.
export type PodcastListenLinks = ListenLinksMap;

export type Podcast = {
  id: string;
  title: string;
  description: string;
  cover: string;
  language: PodcastLanguage;
  category: PodcastCategory;
  tags?: string[];
  recommendedByAuthorId: string;
  recommendedByNote?: string;
  listenLinks: PodcastListenLinks;
  relatedArticleSlug?: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PodcastInput = Omit<Podcast, "id" | "createdAt" | "updatedAt"> & {
  publishedAt?: string;
};

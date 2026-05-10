// In-memory mock API for podcast recommendations.
// State is module-scoped and survives within a single browser session only —
// reloads reset to seed data. The author management UI shows a DemoBanner
// to make this explicit.
// TODO Phase 7+: Replace with Supabase queries (podcasts table).

import { getAuthor } from "@/lib/mockAuthorApi";
import type {
  Podcast,
  PodcastInput,
  PodcastListenLinks,
} from "@/types/podcast";

const ALI_ID = "auth-editor-ali";
const ANDREAS_ID = "auth-author-andreas";

/**
 * Strip empty / whitespace-only listen-link entries.
 * Returns a fresh object containing only entries with a non-empty trimmed URL.
 */
export function cleanListenLinks(input: PodcastListenLinks): PodcastListenLinks {
  const out: PodcastListenLinks = {};
  (Object.keys(input) as (keyof PodcastListenLinks)[]).forEach((key) => {
    const v = input[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  });
  return out;
}

const seedPodcasts = (): Podcast[] => {
  const now = "2026-05-09T08:00:00Z";
  return [
    {
      id: "pod-1",
      title: "KI-Podcast",
      description:
        "Der wöchentliche KI-Podcast von ARD und BR24. Forschung, Anwendungen und Risiken — auf Deutsch verständlich aufbereitet.",
      cover: "https://picsum.photos/seed/podcast-ki/600",
      language: "de",
      category: "Tech & Society",
      tags: ["KI", "Wissenschaft", "Gesellschaft"],
      recommendedByAuthorId: ALI_ID,
      listenLinks: {
        spotify: "https://open.spotify.com/show/0WIWmpfdimHmhVXJpc56sC",
        applePodcasts: "https://podcasts.apple.com/de/podcast/ki-verstehen/id1701430245",
      },
      publishedAt: "2026-05-02",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pod-2",
      title: "heise KI-Update",
      description:
        "Das tägliche Briefing zur KI-Welt von heise online. Kompakt, kuratiert, ohne Hype-Zyklen.",
      cover: "https://picsum.photos/seed/podcast-heise/600",
      language: "de",
      category: "News & Updates",
      tags: ["News", "heise", "Daily"],
      recommendedByAuthorId: ALI_ID,
      listenLinks: {
        spotify: "https://open.spotify.com/show/3KZTI0VeXCJtGvDVHhsTdz",
        applePodcasts: "https://podcasts.apple.com/de/podcast/ki-update/id1641029931",
      },
      publishedAt: "2026-04-25",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pod-3",
      title: "The TED AI Show",
      description:
        "Bilawal Sidhu im Gespräch mit Forschenden, Founders und Kritikern über das, was KI gerade real verändert.",
      cover: "https://picsum.photos/seed/podcast-tedai/600",
      language: "en",
      category: "KI & Forschung",
      tags: ["TED", "Research", "Interviews"],
      recommendedByAuthorId: ALI_ID,
      listenLinks: {
        spotify: "https://open.spotify.com/show/7ipYIkF1RLqujGVXjWS3w8",
        applePodcasts: "https://podcasts.apple.com/us/podcast/the-ted-ai-show/id1742887382",
      },
      publishedAt: "2026-04-18",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pod-4",
      title: "Data Skeptic",
      description:
        "Kyle Polich seziert Machine Learning, Statistik und Daten-Storytelling — kritisch, neugierig, technisch fundiert.",
      cover: "https://picsum.photos/seed/podcast-dataskeptic/600",
      language: "en",
      category: "KI & Forschung",
      tags: ["Data Science", "ML", "Research"],
      recommendedByAuthorId: ALI_ID,
      listenLinks: {
        spotify: "https://open.spotify.com/show/1BZN7H3ikovSejhwQTzNm4",
        applePodcasts: "https://podcasts.apple.com/us/podcast/data-skeptic/id890348705",
      },
      publishedAt: "2026-04-10",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pod-5",
      title: "Tim Ferriss & Eric Schmidt",
      description:
        "Ein Long-Form-Gespräch zwischen Tim Ferriss und Eric Schmidt über AI, Future of Warfare und das, was Schmidt für die nächsten zehn Jahre wirklich erwartet.",
      cover: "https://picsum.photos/seed/podcast-ferriss/600",
      language: "en",
      category: "Tech & Society",
      tags: ["Long-Form", "AI Strategy", "Geopolitics"],
      recommendedByAuthorId: ALI_ID,
      recommendedByNote:
        "Eric Schmidt über AI, Future of Warfare und Meaning of Life — eine der substantiellsten Folgen 2024.",
      listenLinks: {
        spotify: "https://open.spotify.com/show/5qSUyCrk9KR69lEiXbjwXM",
        applePodcasts: "https://podcasts.apple.com/us/podcast/the-tim-ferriss-show/id863897795",
      },
      publishedAt: "2026-03-28",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "pod-6",
      title: "Edge-AI im Mittelstand",
      description:
        "Audio-Vertiefung zum Beitrag: drei Mittelstands-Pilotprojekte, ein gemeinsamer Faden — wer Edge-AI ernst nimmt, gewinnt nicht im Pitch, sondern in der Wartung.",
      cover: "https://picsum.photos/seed/extguest1/600",
      language: "de",
      category: "KI im Business",
      tags: ["Edge AI", "Mittelstand", "Praxis"],
      recommendedByAuthorId: ANDREAS_ID,
      recommendedByNote:
        "Vertieft die Themen rund um KMU-Edge-AI, die ich in meinen Banking-Beiträgen diskutiere.",
      listenLinks: {
        soundcloud: "https://soundcloud.com/digital-age/edge-ai-mittelstand",
      },
      relatedArticleSlug: "gastbeitrag-edge-ai-mittelstand",
      publishedAt: "2026-04-04",
      createdAt: now,
      updatedAt: now,
    },
  ];
};

let podcasts: Podcast[] = seedPodcasts();

const cloneListen = (l: PodcastListenLinks): PodcastListenLinks => ({ ...l });
const clone = (p: Podcast): Podcast => ({
  ...p,
  tags: p.tags ? [...p.tags] : undefined,
  listenLinks: cloneListen(p.listenLinks),
});

const sortByPublishedDesc = (list: Podcast[]): Podcast[] =>
  [...list].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0));

export function getPodcasts(): Podcast[] {
  return sortByPublishedDesc(podcasts).map(clone);
}

function assertRecommenderEligible(authorId: string): void {
  const author = getAuthor(authorId);
  if (!author) throw new Error("Recommender not found.");
  if (author.type === "external") {
    throw new Error("External authors cannot be podcast recommenders.");
  }
}

export function createPodcast(input: PodcastInput): Podcast {
  assertRecommenderEligible(input.recommendedByAuthorId);
  const now = new Date().toISOString();
  const created: Podcast = {
    id: `pod-${Date.now()}`,
    title: input.title,
    description: input.description,
    cover: input.cover,
    language: input.language,
    category: input.category,
    tags: input.tags,
    recommendedByAuthorId: input.recommendedByAuthorId,
    recommendedByNote: input.recommendedByNote,
    listenLinks: cleanListenLinks(input.listenLinks),
    relatedArticleSlug: input.relatedArticleSlug,
    publishedAt: input.publishedAt ?? now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
  };
  podcasts = [created, ...podcasts];
  return clone(created);
}

export function updatePodcast(id: string, patch: Partial<PodcastInput>): Podcast | null {
  const idx = podcasts.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  if (patch.recommendedByAuthorId) {
    assertRecommenderEligible(patch.recommendedByAuthorId);
  }
  const existing = podcasts[idx];
  const next: Podcast = {
    ...existing,
    ...patch,
    listenLinks: patch.listenLinks ? cleanListenLinks(patch.listenLinks) : existing.listenLinks,
    tags: patch.tags ?? existing.tags,
    updatedAt: new Date().toISOString(),
  };
  podcasts = [...podcasts.slice(0, idx), next, ...podcasts.slice(idx + 1)];
  return clone(next);
}

export function deletePodcast(id: string): boolean {
  const before = podcasts.length;
  podcasts = podcasts.filter((p) => p.id !== id);
  return podcasts.length < before;
}

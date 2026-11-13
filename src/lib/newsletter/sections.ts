// Quellen der Newsletter-Rubriken (PR 203): Zeilen aus news_items, ai_prompts
// und podcasts in die Form von issue.ts bringen. Rein, ohne DB und ohne
// "server-only": Entwurfs-Job (Service-Client) und Admin-Seite (Session-
// Client, Auswahllisten) teilen Abfrage-Spalten, Rangfolge und Abbildung.
// Test: __tests__/issue.manual.ts.

import { PROMPT_CATEGORIES, PROMPT_DIFFICULTIES } from "@/lib/mappers/promptMappers";
import { newsAnchor } from "@/lib/newsAnchor";
import {
  ASSESSMENT_DIMENSIONS,
  LEVEL_LABEL,
  assessmentHighlights,
  readAssessment,
  readImportance,
  type Assessment,
} from "@/lib/newsTicker/assessment";
import { PICK_TEASER_MAX, type IssueHype, type IssueNews, type IssuePick } from "@/lib/newsletter/issue";

export const NEWS_SELECT = "id, title, teaser, source_name, generated_at, assessment, importance";
export const PROMPT_SELECT = "id, slug, title, category, difficulty, context, status, published_at";
export const PODCAST_SELECT = "id, slug, title, description, podcast_category, language, cover_image_url, recommended_at";

export type NewsRow = {
  id: string;
  title: string;
  teaser: string | null;
  source_name: string | null;
  generated_at: string;
  assessment: unknown;
  importance: number | null;
};

export type PromptRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  context: string;
  status: string;
  published_at: string | null;
};

export type PodcastRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  podcast_category: string;
  language: string;
  cover_image_url: string | null;
  recommended_at: string;
};

const LANG: Record<string, string> = { de: "Deutsch", en: "Englisch", fr: "Französisch", it: "Italienisch" };

// Auf Wortgrenze kuerzen, mit « …».
export function shortenText(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.\s]+$/, "")} …`;
}

function levelSum(a: Assessment | null): number {
  return a ? ASSESSMENT_DIMENSIONS.reduce((n, d) => n + a[d.key], 0) : 0;
}

// Rangfolge fuer «Die wichtigsten News»: Wichtigkeit, dann Summe der Stufen,
// dann die neuere. Ohne Einordnung ganz hinten.
export function rankNews<T extends NewsRow>(rows: T[]): T[] {
  return [...rows].sort((x, y) => {
    const ix = readImportance(x.importance) ?? 0;
    const iy = readImportance(y.importance) ?? 0;
    if (ix !== iy) return iy - ix;
    const sx = levelSum(readAssessment(x.assessment));
    const sy = levelSum(readAssessment(y.assessment));
    if (sx !== sy) return sy - sx;
    return y.generated_at.localeCompare(x.generated_at);
  });
}

// «Wirtschaft hoch · Dringlichkeit mittel» wie auf /news (nur ab «mittel»).
export function einordnungLine(a: Assessment | null): string {
  return a ? assessmentHighlights(a).map((h) => `${h.label} ${LEVEL_LABEL[h.level]}`).join(" · ") : "";
}

// Stufen fuer die KI, z. B. «Wirtschaft 3, Gesellschaft 1, Umwelt 0, Dringlichkeit 2».
export function levelsForPrompt(a: Assessment | null): string {
  return a ? ASSESSMENT_DIMENSIONS.map((d) => `${d.label} ${a[d.key]}`).join(", ") : "";
}

export function newsToSection(r: NewsRow): IssueNews {
  const a = readAssessment(r.assessment);
  return {
    newsId: r.id,
    title: r.title,
    why: a?.warum ?? "",
    source: r.source_name ?? "",
    anchor: newsAnchor(r),
    einordnung: einordnungLine(a),
  };
}

export function newsToHype(r: NewsRow, text: string): IssueHype {
  return { newsId: r.id, title: r.title, text, source: r.source_name ?? "", anchor: newsAnchor(r) };
}

function label(list: readonly { code: string; label: string }[], code: string): string {
  return list.find((x) => x.code === code)?.label ?? code;
}

export function promptToPick(r: PromptRow, teaser?: string): IssuePick {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    teaser: teaser?.trim() || shortenText(r.context, 200),
    label: `${label(PROMPT_CATEGORIES, r.category)} · ${label(PROMPT_DIFFICULTIES, r.difficulty)}`,
    coverUrl: null,
  };
}

export function podcastToPick(r: PodcastRow, siteUrl: string, teaser?: string): IssuePick {
  const cover = r.cover_image_url?.trim() ?? "";
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    teaser: (teaser?.trim() || shortenText(r.description ?? "", 200)).slice(0, PICK_TEASER_MAX),
    label: [r.podcast_category, LANG[r.language] ?? r.language].filter(Boolean).join(" · "),
    coverUrl: cover.startsWith("/") ? `${siteUrl}${cover}` : cover || null,
  };
}

// Prompt der Woche ohne KI: zuerst ein featured, sonst der neueste.
export function defaultPrompt<T extends PromptRow>(rows: T[]): T | null {
  return rows.find((r) => r.status === "featured") ?? rows[0] ?? null;
}

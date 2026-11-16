import "server-only";

import { getCurrentAuthor } from "@/lib/authorApi";
import { createClient } from "@/lib/supabase/server";
import {
  buildArticleLines,
  fillSeries,
  resolveWindow,
  sumTotals,
  toTotals,
  zeroTotals,
  zurichToday,
  type ArticleLine,
  type ArticleStatRow,
  type Bucket,
  type RangeKey,
  type SeriesPoint,
  type StatTotals,
  type StatsArticle,
} from "@/lib/stats/summary";

// Lesestatistik lesen (Seiten unter /autor/statistiken). Sitzungs-Client:
// Die RLS von article_stats_daily laesst Autorinnen und Autoren nur die
// Zeilen eigener Beitraege sehen, die Redaktion alle. Beitraege werden
// zusaetzlich ausdruecklich auf die eigene Person begrenzt, weil
// veroeffentlichte Beitraege fuer alle lesbar sind.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type StatsWindow = { from: string; to: string; bucket: Bucket };

export type StatsFacts = { published: number; inProgress: number; words: number };

export type StatsOverview = {
  range: RangeKey;
  window: StatsWindow;
  totals: StatTotals;
  series: SeriesPoint[];
  lines: ArticleLine[];
  isEditor: boolean;
  // Filter der Redaktion: null = alle Beitraege.
  authorId: string | null;
  authors: { id: string; name: string }[];
  facts: StatsFacts;
};

export type ArticleStats = {
  range: RangeKey;
  window: StatsWindow;
  article: StatsArticle;
  totals: StatTotals;
  series: SeriesPoint[];
  isEditor: boolean;
};

type ArticleQueryRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  author_id: string | null;
  content_type: string;
  word_count: number | null;
  author: { display_name: string } | null;
};

const ARTICLE_SELECT =
  "id, title, slug, status, published_at, author_id, content_type, word_count, author:authors(display_name)";

function toStatsArticle(r: ArticleQueryRow): StatsArticle {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    status: r.status,
    published_at: r.published_at,
    author_id: r.author_id,
    author_name: r.author?.display_name ?? null,
    content_type: r.content_type,
  };
}

function minDay(rows: ArticleStatRow[]): string | null {
  let first: string | null = null;
  for (const r of rows) if (r.first_day && (!first || r.first_day < first)) first = r.first_day;
  return first;
}

export async function getStatsOverview(opts: {
  range: RangeKey;
  authorId?: string | null;
}): Promise<StatsOverview | null> {
  const me = await getCurrentAuthor();
  if (!me) return null;
  const isEditor = me.role === "editor";
  const supabase = await createClient();
  const today = zurichToday();

  // Wessen Beitraege: Autorinnen und Autoren immer die eigenen, die Redaktion
  // alle oder die einer gewaehlten Person.
  const filterId = isEditor ? (opts.authorId && UUID_RE.test(opts.authorId) ? opts.authorId : null) : me.id;

  let articleQuery = supabase.from("articles").select(ARTICLE_SELECT).order("published_at", { ascending: false });
  if (filterId) articleQuery = articleQuery.eq("author_id", filterId);
  const { data: articleData, error: articleErr } = await articleQuery;
  if (articleErr) console.error("[stats] articles failed:", articleErr.message);
  const articleRows = (articleData as ArticleQueryRow[] | null) ?? [];
  const articles = articleRows.map(toStatsArticle);
  const ids = new Set(articles.map((a) => a.id));

  // Erst die Summen (bei «Gesamt» ohne Anfang), daraus das Fenster.
  const probe = resolveWindow(opts.range, today, null);
  const summaryFrom = opts.range === "alle" ? undefined : probe.from;
  const { data: summaryData, error: summaryErr } = await supabase.rpc("article_stats_summary", {
    ...(summaryFrom ? { p_from: summaryFrom } : {}),
    p_to: today,
  });
  if (summaryErr) console.error("[stats] summary failed:", summaryErr.message);
  const rows = ((summaryData as ArticleStatRow[] | null) ?? []).filter((r) => ids.has(r.article_id));

  const window = resolveWindow(opts.range, today, minDay(rows));
  const { data: seriesData, error: seriesErr } = await supabase.rpc("article_stats_series", {
    p_from: window.from,
    p_to: window.to,
    p_bucket: window.bucket,
    ...(filterId ? { p_author: filterId } : {}),
  });
  if (seriesErr) console.error("[stats] series failed:", seriesErr.message);
  const series = fillSeries((seriesData as SeriesPoint[] | null) ?? [], window.from, window.to, window.bucket);

  const lines = buildArticleLines(articles, rows);

  // Auswahl fuer den Filter der Redaktion: wer veroeffentlichte Beitraege hat.
  let authors: { id: string; name: string }[] = [];
  if (isEditor) {
    const { data: authorData } = await supabase
      .from("articles")
      .select("author_id, author:authors(display_name)")
      .eq("status", "published");
    const seen = new Map<string, string>();
    for (const r of (authorData as { author_id: string | null; author: { display_name: string } | null }[] | null) ?? []) {
      if (r.author_id && r.author?.display_name) seen.set(r.author_id, r.author.display_name);
    }
    authors = [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "de"));
  }

  const facts: StatsFacts = { published: 0, inProgress: 0, words: 0 };
  for (const r of articleRows) {
    if (r.status === "published") {
      facts.published += 1;
      facts.words += r.word_count ?? 0;
    } else if (r.status === "draft" || r.status === "in_review") {
      facts.inProgress += 1;
    }
  }

  return {
    range: opts.range,
    window,
    totals: sumTotals(lines.map((l) => l.totals)),
    series,
    lines,
    isEditor,
    authorId: isEditor ? filterId : null,
    authors,
    facts,
  };
}

export async function getArticleStats(id: string, range: RangeKey): Promise<ArticleStats | null> {
  if (!UUID_RE.test(id)) return null;
  const me = await getCurrentAuthor();
  if (!me) return null;
  const isEditor = me.role === "editor";
  const supabase = await createClient();
  const today = zurichToday();

  const { data } = await supabase.from("articles").select(ARTICLE_SELECT).eq("id", id).maybeSingle();
  const row = data as ArticleQueryRow | null;
  if (!row) return null;
  // Fremde Beitraege sind fuer Autorinnen und Autoren lesbar, sobald sie
  // veroeffentlicht sind. Ihre Zahlen nicht.
  if (!isEditor && row.author_id !== me.id) return null;

  const probe = resolveWindow(range, today, null);
  const { data: summaryData, error: summaryErr } = await supabase.rpc("article_stats_summary", {
    ...(range === "alle" ? {} : { p_from: probe.from }),
    p_to: today,
  });
  if (summaryErr) console.error("[stats] summary failed:", summaryErr.message);
  const own = ((summaryData as ArticleStatRow[] | null) ?? []).find((r) => r.article_id === id) ?? null;

  const window = resolveWindow(range, today, own?.first_day ?? null);
  const { data: seriesData, error: seriesErr } = await supabase.rpc("article_stats_series", {
    p_from: window.from,
    p_to: window.to,
    p_bucket: window.bucket,
    p_article: id,
  });
  if (seriesErr) console.error("[stats] series failed:", seriesErr.message);

  return {
    range,
    window,
    article: toStatsArticle(row),
    totals: own ? toTotals(own) : zeroTotals(),
    series: fillSeries((seriesData as SeriesPoint[] | null) ?? [], window.from, window.to, window.bucket),
    isEditor,
  };
}

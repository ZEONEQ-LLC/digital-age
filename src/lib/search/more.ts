import "server-only";

import { PROMPT_CATEGORIES, PROMPT_TESTED_WITH } from "@/lib/mappers/promptMappers";
import { PODCAST_LANGUAGES } from "@/lib/mappers/podcastMappers";
import { createPublicClient } from "@/lib/supabase/public";

// Volltextsuche ueber Prompts, Podcasts und Startups (Entscheid Ali
// 12.11.2026, Migration 20261112140000). Wie searchArticles: RPC liefert Rang
// und Ausschnitt, danach die Anzeige-Daten per Anon-Client mit expliziten,
// oeffentlichen Spalten (keine Einreicher-Daten). Reihenfolge = Rang.

export type OtherKind = "prompts" | "podcasts" | "startups";

export type OtherHit = {
  id: string;
  href: string;
  title: string;
  meta: string;
  image: string | null;
  snippet: string;
};

export type OtherResult = { hits: OtherHit[]; failed: boolean };

export const OTHER_LIMIT = 30;

type Ranked = { id: string; rank: number; snippet: string };

const RPC: Record<OtherKind, "search_prompts" | "search_podcasts" | "search_startups"> = {
  prompts: "search_prompts",
  podcasts: "search_podcasts",
  startups: "search_startups",
};

function label(list: readonly { code: string; label: string }[], code: string): string {
  return list.find((it) => it.code === code)?.label ?? code;
}

async function ranked(kind: OtherKind, query: string): Promise<Ranked[] | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc(RPC[kind], { p_query: query, p_limit: OTHER_LIMIT });
  if (error) {
    console.error(`[search] ${RPC[kind]} failed:`, error.message);
    return null;
  }
  return (data as Ranked[] | null) ?? [];
}

function inRankOrder<T extends { id: string }>(order: Ranked[], rows: T[], toHit: (row: T, snippet: string) => OtherHit): OtherHit[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return order.flatMap((r) => {
    const row = byId.get(r.id);
    return row ? [toHit(row, r.snippet)] : [];
  });
}

export async function searchPrompts(query: string): Promise<OtherResult> {
  if (query.trim() === "") return { hits: [], failed: false };
  const order = await ranked("prompts", query);
  if (!order) return { hits: [], failed: true };
  if (order.length === 0) return { hits: [], failed: false };
  const { data, error } = await createPublicClient()
    .from("ai_prompts")
    .select("id, slug, title, category, tested_with")
    .in("status", ["published", "featured"])
    .in("id", order.map((r) => r.id));
  if (error) {
    console.error("[search] prompt rows failed:", error.message);
    return { hits: [], failed: true };
  }
  const hits = inRankOrder(order, data ?? [], (p, snippet) => ({
    id: p.id,
    href: `/ai-prompts/${p.slug}`,
    title: p.title,
    meta: `${label(PROMPT_CATEGORIES, p.category)} · getestet mit ${label(PROMPT_TESTED_WITH, p.tested_with)}`,
    image: null,
    snippet,
  }));
  return { hits, failed: false };
}

export async function searchPodcasts(query: string): Promise<OtherResult> {
  if (query.trim() === "") return { hits: [], failed: false };
  const order = await ranked("podcasts", query);
  if (!order) return { hits: [], failed: true };
  if (order.length === 0) return { hits: [], failed: false };
  const { data, error } = await createPublicClient()
    .from("podcasts")
    .select("id, slug, title, podcast_category, language, cover_image_url")
    .eq("is_published", true)
    .in("id", order.map((r) => r.id));
  if (error) {
    console.error("[search] podcast rows failed:", error.message);
    return { hits: [], failed: true };
  }
  const languages = PODCAST_LANGUAGES.map((l) => ({ code: l.code as string, label: l.label }));
  const hits = inRankOrder(order, data ?? [], (p, snippet) => ({
    id: p.id,
    href: `/podcast/${p.slug}`,
    title: p.title,
    meta: [p.podcast_category, label(languages, p.language)].filter(Boolean).join(" · "),
    image: p.cover_image_url,
    snippet,
  }));
  return { hits, failed: false };
}

export async function searchStartups(query: string): Promise<OtherResult> {
  if (query.trim() === "") return { hits: [], failed: false };
  const order = await ranked("startups", query);
  if (!order) return { hits: [], failed: true };
  if (order.length === 0) return { hits: [], failed: false };
  const { data, error } = await createPublicClient()
    .from("ai_startups")
    .select("id, slug, name, industry, city, logo_url")
    .in("status", ["published", "featured"])
    .in("id", order.map((r) => r.id));
  if (error) {
    console.error("[search] startup rows failed:", error.message);
    return { hits: [], failed: true };
  }
  const hits = inRankOrder(order, data ?? [], (s, snippet) => ({
    id: s.id,
    href: `/swiss-ai/${s.slug}`,
    title: s.name,
    meta: [s.industry, s.city].filter(Boolean).join(" · "),
    image: s.logo_url,
    snippet,
  }));
  return { hits, failed: false };
}

import "server-only";

import { RELATIONS_SHORT, type ArticleWithRelations } from "@/lib/articleApi";
import { createPublicClient } from "@/lib/supabase/public";

// Startseite (Design-Check 12.11.2026): Aufmacher, «Im Fokus» und zwei
// Rubriken, jeder Artikel hoechstens einmal.
//   Aufmacher = neuester Rubrik-Hero (is_hero), sonst neuester Featured,
//               sonst neuester Artikel.
//   Im Fokus  = weitere Heroes und Featured, aufgefuellt mit den neuesten.
//   Rubriken  = je vier neueste der Rubrik, ohne die oben gezeigten.
export type HomeArticles = {
  lead: ArticleWithRelations | null;
  focus: ArticleWithRelations[];
  kiBusiness: ArticleWithRelations[];
  futureTech: ArticleWithRelations[];
};

const FOCUS_COUNT = 3;
const RUBRIC_COUNT = 4;

export async function getHomeArticles(): Promise<HomeArticles> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select(RELATIONS_SHORT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  if (error) console.error("[home] articles failed:", error.message);
  const all = ((data ?? []) as unknown as ArticleWithRelations[]);

  const heroes = all.filter((a) => a.is_hero);
  const featured = all.filter((a) => a.is_featured && !a.is_hero);
  const lead = heroes[0] ?? featured[0] ?? all[0] ?? null;

  const used = new Set<string>(lead ? [lead.id] : []);
  const take = (pool: ArticleWithRelations[], n: number, out: ArticleWithRelations[] = []) => {
    for (const a of pool) {
      if (out.length >= n) break;
      if (used.has(a.id)) continue;
      used.add(a.id);
      out.push(a);
    }
    return out;
  };

  const focus = take(all, FOCUS_COUNT, take([...heroes, ...featured], FOCUS_COUNT));
  const kiBusiness = take(all.filter((a) => a.category?.slug === "ki-business"), RUBRIC_COUNT);
  const futureTech = take(all.filter((a) => a.category?.slug === "future-tech"), RUBRIC_COUNT);
  return { lead, focus, kiBusiness, futureTech };
}

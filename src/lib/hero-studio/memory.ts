// Anti-Wiederholung (Diagnose H): die zuletzt uebernommenen Heroes anderer
// Artikel, damit neue Vorschlaege davon abweichen. Browser-Client, RLS
// entscheidet (Autor: eigene plus publizierte, Editor: alle). Ersetzt
// Team-Gedaechtnis und localStorage des Prototyps.

import { createClient } from "@/lib/supabase/client";
import { parseHeroRecipe } from "./recipe";
import type { HeroMemoryEntry } from "./vendor";

export const HERO_MEMORY_LIMIT = 40;

export async function loadHeroMemory(excludeArticleId: string): Promise<HeroMemoryEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, updated_at, cover_recipe")
    .not("cover_recipe", "is", null)
    .neq("id", excludeArticleId)
    .order("updated_at", { ascending: false })
    .limit(HERO_MEMORY_LIMIT);
  if (error || !data) return [];
  const out: HeroMemoryEntry[] = [];
  for (const row of data) {
    // Nur Objekte mit numerischem version: der Restore schreibt fuer alte
    // Snapshots JSON-null statt SQL-NULL (Migration 20261102150000).
    const r = parseHeroRecipe(row.cover_recipe);
    if (!r) continue;
    out.push({
      key: r.seedKey,
      engine: r.engine,
      title: (row.title ?? r.snapshot.title ?? "").slice(0, 140),
      variant: r.variant,
      overrides: { ...r.overrides },
      text: r.text,
      fp: r.fp,
      kiMotifs: r.kiMotifs,
      animated: r.animated,
      savedAtMs: row.updated_at ? Date.parse(row.updated_at) || 0 : 0,
    });
  }
  return out;
}

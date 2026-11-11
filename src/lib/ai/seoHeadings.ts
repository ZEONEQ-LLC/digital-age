// Gliederung fuer die SEO-Analyse (seo_review): H2 und H3 in der Reihenfolge
// des Artikels. Bis PR 189 sah das Modell nur die H2-Liste und schlug bei
// fehlendem Keyword neue H2 vor, obwohl passende H3 schon da waren.

import type { Block } from "@/types/blocks";

export type SeoHeading = { level: 2 | 3; text: string };

export function seoHeadingOutline(blocks: Block[] | null | undefined): SeoHeading[] {
  const out: SeoHeading[] = [];
  for (const b of blocks ?? []) {
    if (b.type !== "heading") continue;
    if (b.level !== 2 && b.level !== 3) continue;
    const text = b.content.trim();
    if (text) out.push({ level: b.level, text });
  }
  return out;
}

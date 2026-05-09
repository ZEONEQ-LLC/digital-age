// Minimal in-memory registry of article slugs that have rendered detail pages.
// TODO Phase 7+: Replace with Supabase query (articles table, slug column).
//
// Used wherever code references an article by slug and needs to:
//   1. Validate that the slug points to an actual article.
//   2. Render the article title without duplicating it inline.

const REGISTRY: Record<string, string> = {
  "data-driven-banking":
    "Data-Driven Banking: Warum KI allein das eigentliche Problem nicht löst",
  "gastbeitrag-edge-ai-mittelstand":
    "Edge-AI im Mittelstand: Ein Praxisbericht aus drei Pilotprojekten",
  "gastbeitrag-autonome-lagerroboter":
    "Autonome Lagerroboter: Was im Schweizer KMU funktioniert",
};

export function getArticleTitleBySlug(slug: string): string | null {
  if (!slug) return null;
  return REGISTRY[slug] ?? null;
}

export function listKnownSlugs(): string[] {
  return Object.keys(REGISTRY);
}

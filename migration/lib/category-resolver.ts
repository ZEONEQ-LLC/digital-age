import type { SupabaseClient } from "@supabase/supabase-js";

// Mapping WP-Category-Name → digital-age categories.slug.
// `null` heisst "ignorieren" (z.B. WP-Featured-Marker — User featured manuell).
export const WP_CATEGORY_MAP: Record<string, string | null> = {
  "KI & Business": "ki-business",
  "Future Tech": "future-tech",
  "IoT & Edge AI": "future-tech",
  "Blockchain & AI DAOs": "future-tech",
  "Business Model Innovation": "future-tech",
  "Mobile Business": "future-tech",
  Allgemein: "future-tech",
  Featured: null,
};

const DEFAULT_SLUG = "future-tech";

export function pickPrimaryCategorySlug(wpCategories: string[]): string {
  for (const c of wpCategories) {
    if (c in WP_CATEGORY_MAP) {
      const slug = WP_CATEGORY_MAP[c];
      if (slug !== null) return slug;
    }
  }
  return DEFAULT_SLUG;
}

export type CategoryResolver = {
  resolveSlugToId: (slug: string) => Promise<string | null>;
};

export function createCategoryResolver(supabase: SupabaseClient): CategoryResolver {
  const cache = new Map<string, string | null>();

  return {
    async resolveSlugToId(slug) {
      if (cache.has(slug)) return cache.get(slug) ?? null;
      const { data, error } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data) {
        cache.set(slug, null);
        return null;
      }
      cache.set(slug, data.id as string);
      return data.id as string;
    },
  };
}

// Sammelt alle WP-Categories die NICHT im Map vorkommen — Eskalations-Helper.
export function unmappedCategories(allWpCategories: Set<string>): string[] {
  const out: string[] = [];
  for (const c of allWpCategories) {
    if (!(c in WP_CATEGORY_MAP)) out.push(c);
  }
  return out;
}

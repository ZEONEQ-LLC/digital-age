"use server";

import { createClient } from "@/lib/supabase/server";

export type TagSearchResult = { id: string; slug: string; name: string };

// Tag-Suche für den Editor-Autocomplete. Public-read auf `tags` (RLS-Policy
// `tags_public_read`), darum kein Editor-Gate hier.
export async function searchTags(
  query: string,
  options: { limit?: number; exclude?: string[] } = {},
): Promise<TagSearchResult[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const supabase = await createClient();
  const limit = Math.min(options.limit ?? 8, 25);

  let req = supabase
    .from("tags")
    .select("id, slug, name")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(limit);

  if (options.exclude && options.exclude.length > 0) {
    req = req.not("name", "in", `(${options.exclude.map((e) => `"${e.replace(/"/g, '\\"')}"`).join(",")})`);
  }

  const { data, error } = await req;
  if (error) return [];
  return data ?? [];
}

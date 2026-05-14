import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthorResolver = {
  resolve: (email: string) => Promise<{ id: string; slug: string } | null>;
};

export function createAuthorResolver(supabase: SupabaseClient): AuthorResolver {
  const cache = new Map<string, { id: string; slug: string } | null>();

  return {
    async resolve(emailRaw) {
      const email = emailRaw.trim().toLowerCase();
      if (!email) return null;
      if (cache.has(email)) return cache.get(email) ?? null;

      const { data, error } = await supabase
        .from("authors")
        .select("id, slug")
        .ilike("email", email)
        .maybeSingle();

      if (error || !data) {
        cache.set(email, null);
        return null;
      }
      const hit = { id: data.id as string, slug: data.slug as string };
      cache.set(email, hit);
      return hit;
    },
  };
}

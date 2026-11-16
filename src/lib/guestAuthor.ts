import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { authorSlugFromName, escapeIlike } from "@/lib/authorSlug";
import type { Database } from "@/lib/database.types";

// Gast-Autor:in ohne Login (role = external), per E-Mail finden oder anlegen.
// Gemeinsam fuer «Pitch -> Entwurf» (pitch/adminActions.ts) und den
// Showcase-Entwurf (showcase/draftActions.ts). Der Aufrufer prueft vorher die
// Redaktion; RLS laesst nur Editor:innen Autoren anlegen.
type Sb = SupabaseClient<Database>;

export type GuestAuthorInput = {
  name: string;
  email: string;
  jobTitle?: string | null;
  bio?: string | null;
  website?: string | null;
};

// Bestehendes Profil zur Adresse; mit Login zuerst.
export async function findAuthorByEmail(supabase: Sb, email: string): Promise<string | null> {
  const { data } = await supabase
    .from("authors")
    .select("id")
    .ilike("email", escapeIlike(email.trim()))
    .order("user_id", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// Muster insertAuthorPlaceholder (inviteActions.ts): Slug aus dem Namen, bei
// Kollision mit Zufalls-Suffix. Existiert die Adresse inzwischen, gilt das
// bestehende Profil.
export async function createGuestAuthor(supabase: Sb, input: GuestAuthorInput): Promise<string> {
  const email = input.email.trim();
  const name = input.name.trim();
  const base = authorSlugFromName(name || email.split("@")[0]);
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from("authors")
      .insert({
        email,
        display_name: name,
        slug,
        role: "external",
        bio: input.bio?.trim() || null,
        job_title: input.jobTitle?.trim() || null,
        social_links: input.website ? { website: input.website } : null,
      })
      .select("id")
      .single();
    if (!error) return data.id;
    if (error.code !== "23505") throw error;
    if (error.message.includes("authors_email_key")) {
      const existing = await findAuthorByEmail(supabase, email);
      if (existing) return existing;
      throw error;
    }
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  throw new Error("Kein freier Slug für den Gast-Autor.");
}

export async function findOrCreateGuestAuthor(supabase: Sb, input: GuestAuthorInput): Promise<{ id: string; created: boolean }> {
  const existing = await findAuthorByEmail(supabase, input.email);
  if (existing) return { id: existing, created: false };
  return { id: await createGuestAuthor(supabase, input), created: true };
}

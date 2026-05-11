"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type PodcastRow = Database["public"]["Tables"]["podcasts"]["Row"];
type PodcastLanguage = "de" | "en" | "fr" | "it";

async function requireInternalAuthor(): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");
  const { data: author } = await supabase
    .from("authors")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (!author) throw new Error("Author-Profil nicht gefunden.");
  if (author.role === "external") {
    throw new Error("Externe Autoren können keine Podcast-Empfehlungen anlegen.");
  }
  return { id: author.id };
}

export type PodcastInput = {
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  language: PodcastLanguage;
  podcast_category: string;
  spotify_url?: string | null;
  apple_podcasts_url?: string | null;
  recommended_by_note?: string | null;
  related_article_slug?: string | null;
};

export async function createPodcast(input: PodcastInput): Promise<PodcastRow> {
  const supabase = await createClient();
  const me = await requireInternalAuthor();

  const { data, error } = await supabase
    .from("podcasts")
    .insert({
      title: input.title,
      description: input.description ?? null,
      cover_image_url: input.cover_image_url ?? null,
      language: input.language,
      podcast_category: input.podcast_category,
      spotify_url: input.spotify_url ?? null,
      apple_podcasts_url: input.apple_podcasts_url ?? null,
      recommended_by_note: input.recommended_by_note ?? null,
      related_article_slug: input.related_article_slug ?? null,
      recommended_by_id: me.id,
      is_published: true,
    })
    .select("*")
    .single();

  if (error) throw error;
  revalidatePath("/autor/podcasts");
  revalidatePath("/podcasts");
  return data;
}

export async function updatePodcast(
  id: string,
  patch: Partial<PodcastInput>,
): Promise<PodcastRow> {
  const supabase = await createClient();
  await requireInternalAuthor();

  const { data, error } = await supabase
    .from("podcasts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath("/autor/podcasts");
  revalidatePath("/podcasts");
  return data;
}

export async function deletePodcast(id: string): Promise<void> {
  const supabase = await createClient();
  await requireInternalAuthor();

  const { error } = await supabase.from("podcasts").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/autor/podcasts");
  revalidatePath("/podcasts");
}

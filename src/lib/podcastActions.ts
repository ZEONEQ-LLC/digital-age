"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugifyPodcast } from "@/lib/podcastSlug";
import type { Database } from "@/lib/database.types";

type PodcastRow = Database["public"]["Tables"]["podcasts"]["Row"];
type PodcastLanguage = "de" | "en" | "fr" | "it";
type PodcastSourceType = "external" | "self_hosted";

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
  source_type: PodcastSourceType;
  audio_url?: string | null;
  duration_seconds?: number | null;
  file_size_bytes?: number | null;
  ai_generated?: boolean;
  spotify_url?: string | null;
  apple_podcasts_url?: string | null;
  youtube_url?: string | null;
  soundcloud_url?: string | null;
  audible_url?: string | null;
  recommended_by_note?: string | null;
  related_article_slug?: string | null;
};

// Server-seitige Kern-Validierung (unabhaengig vom Formular). self_hosted
// braucht audio_url. Titel-Pflicht wird beim Insert ohnehin von der DB
// erzwungen.
function assertValidPodcast(input: PodcastInput): void {
  if (input.source_type === "self_hosted") {
    if (!input.audio_url || input.audio_url.trim() === "") {
      throw new Error("Self-hosted Podcast braucht ein Audio-File.");
    }
  }
}

// Eindeutigen Slug aus dem Titel erzeugen. Basis via slugifyPodcast
// (identisch zum Migration-Backfill), dann bei Kollision mit -2, -3, …
// suffixen. RLS-Sichtbarkeit deckt nicht alle fremden Rows ab, daher faengt
// der Insert zusaetzlich Unique-Violations ab (siehe createPodcast).
async function nextPodcastSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
): Promise<string> {
  const base = slugifyPodcast(title);
  let candidate = base;
  let counter = 1;
  // Best-effort-Kollisionscheck gegen sichtbare Rows (Unique-Violation beim
  // Insert faengt fremde/unsichtbare Rows zusaetzlich ab).
  while (counter < 1000) {
    const { data } = await supabase
      .from("podcasts")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return `${base}-${counter}`;
}

export async function createPodcast(input: PodcastInput): Promise<PodcastRow> {
  const supabase = await createClient();
  const me = await requireInternalAuthor();
  assertValidPodcast(input);

  const baseRow = {
    title: input.title,
    description: input.description ?? null,
    cover_image_url: input.cover_image_url ?? null,
    language: input.language,
    podcast_category: input.podcast_category,
    source_type: input.source_type,
    audio_url: input.audio_url ?? null,
    duration_seconds: input.duration_seconds ?? null,
    file_size_bytes: input.file_size_bytes ?? null,
    ai_generated: input.ai_generated ?? false,
    spotify_url: input.spotify_url ?? null,
    apple_podcasts_url: input.apple_podcasts_url ?? null,
    youtube_url: input.youtube_url ?? null,
    soundcloud_url: input.soundcloud_url ?? null,
    audible_url: input.audible_url ?? null,
    recommended_by_note: input.recommended_by_note ?? null,
    related_article_slug: input.related_article_slug ?? null,
    recommended_by_id: me.id,
    is_published: true,
  };

  // Bis zu 5 Versuche: bei Slug-Unique-Violation (23505, fremde/unsichtbare
  // Row) mit Zufallssuffix neu probieren, damit der Save nicht hart scheitert.
  let slug = await nextPodcastSlug(supabase, input.title);
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("podcasts")
      .insert({ ...baseRow, slug })
      .select("*")
      .single();
    if (!error) {
      revalidatePath("/autor/podcasts");
      revalidatePath("/podcasts");
      revalidatePath("/podcast/" + slug);
      return data;
    }
    if (error.code === "23505") {
      const suffix = Math.floor(Math.random() * 9000 + 1000);
      slug = `${slugifyPodcast(input.title)}-${suffix}`;
      continue;
    }
    throw error;
  }
  throw new Error("Konnte keinen eindeutigen Slug erzeugen.");
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
  if (data.slug) revalidatePath("/podcast/" + data.slug);
  if (data.related_article_slug) {
    revalidatePath("/artikel/" + data.related_article_slug);
  }
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

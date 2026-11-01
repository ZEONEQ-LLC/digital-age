"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthor } from "@/lib/authorApi";
import { createClient } from "@/lib/supabase/server";
import { enrichPodcastDraft } from "@/lib/podcasts/ingest";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Freigaben (/autor/admin/freigaben): nur Editoren, RLS podcasts_editor_all
// bleibt das Netz. Veroeffentlichen setzt is_published, Verwerfen loescht den
// Entwurf, Erneut versuchen wiederholt die Anreicherung.
async function requireEditor() {
  const me = await getCurrentAuthor();
  if (!me || me.role !== "editor") throw new Error("Nur Editoren können freigeben.");
  return me;
}

function revalidate(slug?: string | null): void {
  revalidatePath("/autor/admin/freigaben");
  revalidatePath("/autor/podcasts");
  revalidatePath("/podcasts");
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/podcast/${slug}`);
}

export async function approvePodcastDraft(id: string): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("podcasts")
      .update({ is_published: true, recommended_at: new Date().toISOString() })
      .eq("id", id)
      .eq("is_published", false)
      .select("slug")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Entwurf nicht gefunden oder schon veröffentlicht." };
    revalidate(data.slug);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function discardPodcastDraft(id: string): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    const { error } = await supabase.from("podcasts").delete().eq("id", id).eq("is_published", false);
    if (error) return { ok: false, error: error.message };
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function retryPodcastIngest(id: string): Promise<ActionResult> {
  try {
    await requireEditor();
    const supabase = await createClient();
    await supabase.from("podcasts").update({ ingest_status: "pending", ingest_error: null }).eq("id", id).eq("is_published", false);
    await enrichPodcastDraft(id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

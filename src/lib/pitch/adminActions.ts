"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { inviteAuthorFromPitch, type PitchInviteOutcome } from "@/lib/inviteActions";
import { renderBlockDocumentToMarkdown } from "@/lib/blockDocumentMarkdown";
import { isArticleSlugConflict, slugFromTitle } from "@/lib/articleSlug";
import { authorSlugFromName, escapeIlike } from "@/lib/authorSlug";
import { pitchCategorySlug, pitchToDocument, pitchWebsite } from "@/lib/pitch/draftFromPitch";
import type { Json } from "@/lib/database.types";

async function requireEditor(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");
  const { data: author } = await supabase
    .from("authors")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (!author || author.role !== "editor") {
    throw new Error("Nur Editoren dürfen Pitches verwalten.");
  }
}

type Status = "new" | "reviewing" | "accepted" | "rejected";

export async function updatePitchStatus(
  id: string,
  status: Status,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireEditor();
  const supabase = await createClient();
  const patch: { status: Status; reviewed_at?: string } = { status };
  if (status !== "new") {
    patch.reviewed_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("article_pitches")
    .update(patch)
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/autor/admin/pitches");
  return { ok: true };
}

export async function updatePitchNotes(
  id: string,
  notes: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireEditor();
  const trimmed = notes.trim();
  if (trimmed.length > 2000) {
    return { ok: false, message: "Notiz zu lang (max. 2000 Zeichen)." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("article_pitches")
    .update({ editor_notes: trimmed === "" ? null : trimmed })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/autor/admin/pitches");
  return { ok: true };
}

export type PitchDraftResult =
  | {
      ok: true;
      articleId: string;
      authorCreated: boolean;
      invite: PitchInviteOutcome | "failed" | null;
      warnings: string[];
    }
  | { ok: false; message: string };

type Sb = Awaited<ReturnType<typeof createClient>>;
type PitchAuthorInput = {
  author_name: string;
  author_email: string;
  author_role: string | null;
  author_bio: string;
  author_website: string | null;
};

async function findAuthorByEmail(supabase: Sb, email: string): Promise<string | null> {
  const { data } = await supabase
    .from("authors")
    .select("id")
    .ilike("email", escapeIlike(email.trim()))
    .order("user_id", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// Gast-Autor: role=external, ohne Login, Muster insertAuthorPlaceholder.
async function createGuestAuthor(supabase: Sb, pitch: PitchAuthorInput): Promise<string> {
  const email = pitch.author_email.trim();
  const base = authorSlugFromName(pitch.author_name.trim() || email.split("@")[0]);
  const website = pitchWebsite(pitch.author_website);
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from("authors")
      .insert({
        email,
        display_name: pitch.author_name.trim(),
        slug,
        role: "external",
        bio: pitch.author_bio.trim() || null,
        job_title: pitch.author_role?.trim() || null,
        social_links: website ? { website } : null,
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

// Pitch -> Artikel-Entwurf: Volltext durch die MD-Cleanup-Pipeline, Gast-Autor
// per E-Mail finden oder anlegen, Pitch verknuepfen und auf «akzeptiert» setzen.
// Status-Wechsel versenden keine Mail; nur die optionale Einladung tut das.
// Ein Pitch mit Entwurf liefert diesen zurueck, statt einen zweiten anzulegen.
export async function createDraftFromPitch(
  id: string,
  options: { invite: boolean },
): Promise<PitchDraftResult> {
  try {
    await requireEditor();
  } catch (e) {
    // Eigene Meldungen (nicht eingeloggt, keine Editor-Rolle) durchreichen;
    // geworfene Fehler kaeme in Production nur generisch an.
    return { ok: false, message: e instanceof Error ? e.message : "Keine Berechtigung." };
  }
  try {
    const supabase = await createClient();
    const { data: pitch, error: readErr } = await supabase
      .from("article_pitches")
      .select("title, excerpt, category, body_md, author_name, author_email, author_role, author_bio, author_website, article_id")
      .eq("id", id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!pitch) return { ok: false, message: "Pitch nicht gefunden." };
    if (pitch.article_id) {
      return { ok: true, articleId: pitch.article_id, authorCreated: false, invite: null, warnings: [] };
    }

    const { data: categories, error: catErr } = await supabase.from("categories").select("id, slug");
    if (catErr) throw catErr;
    const categorySlug = pitchCategorySlug(pitch.category, categories.map((c) => c.slug));
    const category = categories.find((c) => c.slug === categorySlug);
    if (!category) return { ok: false, message: `Kategorie ${categorySlug} nicht gefunden.` };

    const existingAuthor = await findAuthorByEmail(supabase, pitch.author_email);
    const authorId = existingAuthor ?? (await createGuestAuthor(supabase, pitch));

    const title = pitch.title.trim();
    const { doc, warnings } = pitchToDocument(pitch.body_md, title);
    const baseSlug = slugFromTitle(title) || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const insertWith = (slug: string) =>
      supabase
        .from("articles")
        .insert({
          title,
          slug,
          excerpt: pitch.excerpt.trim(),
          category_id: category.id,
          author_id: authorId,
          status: "draft",
          body_md: renderBlockDocumentToMarkdown(doc),
          body_blocks: doc as unknown as Json,
        })
        .select("id")
        .single();
    let inserted = await insertWith(baseSlug);
    for (let n = 2; n <= 20 && isArticleSlugConflict(inserted.error); n++) {
      inserted = await insertWith(`${baseSlug}-${n}`);
    }
    if (inserted.error) throw inserted.error;
    const articleId = inserted.data.id;

    const { error: linkErr } = await supabase
      .from("article_pitches")
      .update({ article_id: articleId, status: "accepted", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (linkErr) {
      // Ohne Verknuepfung gaebe der naechste Klick einen zweiten Entwurf.
      await supabase.from("articles").delete().eq("id", articleId);
      throw linkErr;
    }

    let invite: PitchInviteOutcome | "failed" | null = null;
    if (options.invite) {
      try {
        invite = await inviteAuthorFromPitch(authorId);
      } catch (e) {
        console.error("[pitch] invite failed:", e);
        invite = "failed";
      }
    }

    revalidatePath("/autor/admin/pitches");
    revalidatePath("/autor/admin/artikel");
    revalidatePath("/autor/admin/autoren");
    revalidatePath("/autor/artikel");
    revalidatePath("/autor/dashboard");
    return { ok: true, articleId, authorCreated: !existingAuthor, invite, warnings };
  } catch (e) {
    console.error("[pitch] draft from pitch failed:", e);
    return { ok: false, message: "Der Entwurf konnte nicht erstellt werden. Bitte nochmals versuchen." };
  }
}

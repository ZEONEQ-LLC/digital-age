"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteAllArticleImages } from "@/lib/storageActions";
import { renderBlockDocumentToMarkdown } from "@/lib/blockDocumentMarkdown";
import { emptyBlockDocument, type BlockDocument } from "@/types/blocks";
import type { Database, Json } from "@/lib/database.types";

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];

async function requireCurrentAuthor(): Promise<{ id: string; role: AuthorRow["role"] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");
  const { data: author } = await supabase
    .from("authors")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (!author) throw new Error("Author-Profil nicht gefunden.");
  return author;
}

export async function createDraft(input?: {
  title?: string;
  category_slug?: string;
}): Promise<{ id: string }> {
  const supabase = await createClient();
  const me = await requireCurrentAuthor();

  // Default category: ki-business (first in display_order)
  const categorySlug = input?.category_slug ?? "ki-business";
  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();
  if (!cat) throw new Error(`Kategorie ${categorySlug} nicht gefunden.`);

  const baseTitle = input?.title?.trim() || "Unbenannter Artikel";
  const draftSlug = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await supabase
    .from("articles")
    .insert({
      title: baseTitle,
      slug: draftSlug,
      category_id: cat.id,
      author_id: me.id,
      status: "draft",
      body_md: "",
      body_blocks: emptyBlockDocument() as unknown as Json,
    })
    .select("id")
    .single();

  if (error) throw error;
  revalidatePath("/autor/artikel");
  revalidatePath("/autor/dashboard");
  return { id: data.id };
}

export type ArticlePatch = {
  title?: string;
  subtitle?: string | null;
  slug?: string;
  excerpt?: string | null;
  body_md?: string;
  body_blocks?: BlockDocument | null;
  category_id?: string;
  subcategory?: string | null;
  cover_image_url?: string | null;
  tags?: string[];
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keyword?: string | null;
};

export async function saveArticle(id: string, patch: ArticlePatch): Promise<ArticleRow> {
  const supabase = await createClient();
  await requireCurrentAuthor();

  // Visual-Editor ist Source-of-Truth: wenn body_blocks im Patch, regeneriert
  // der Server body_md daraus (überschreibt ggf. einen mitgesendeten body_md-
  // Wert). Markdown-Modus-Edits auf Legacy-Artikeln senden nur body_md →
  // bleiben unverändert durchgeschleift.
  type ArticleUpdate = Database["public"]["Tables"]["articles"]["Update"];
  const { body_blocks: patchBlocks, ...rest } = patch;
  const dbPatch: ArticleUpdate = { ...rest };
  if (patchBlocks !== undefined && patchBlocks !== null) {
    dbPatch.body_md = renderBlockDocumentToMarkdown(patchBlocks);
    dbPatch.body_blocks = patchBlocks as unknown as Json;
  } else if (patchBlocks === null) {
    dbPatch.body_blocks = null;
  }

  const { data, error } = await supabase
    .from("articles")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  revalidatePath("/autor/artikel");
  revalidatePath(`/autor/artikel/${id}`);
  return data;
}

export async function submitForReview(id: string): Promise<ArticleRow> {
  const supabase = await createClient();
  await requireCurrentAuthor();

  const { data: current } = await supabase
    .from("articles")
    .select("status")
    .eq("id", id)
    .single();
  if (current?.status !== "draft") {
    throw new Error("Nur Drafts können zur Review eingereicht werden.");
  }

  const { data, error } = await supabase
    .from("articles")
    .update({ status: "in_review" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath("/autor/artikel");
  revalidatePath(`/autor/artikel/${id}`);
  return data;
}

export async function publishArticle(id: string): Promise<ArticleRow> {
  const supabase = await createClient();
  const me = await requireCurrentAuthor();
  if (me.role !== "editor") throw new Error("Nur Editors können publishen.");

  const { data: current } = await supabase
    .from("articles")
    .select("published_at")
    .eq("id", id)
    .single();

  const patch: Partial<ArticleRow> = { status: "published" };
  if (!current?.published_at) {
    patch.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("articles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath("/autor/artikel");
  revalidatePath(`/autor/artikel/${id}`);
  revalidatePath("/");
  return data;
}

export async function archiveArticle(id: string): Promise<ArticleRow> {
  const supabase = await createClient();
  const me = await requireCurrentAuthor();
  if (me.role !== "editor") throw new Error("Nur Editors können archivieren.");

  const { data, error } = await supabase
    .from("articles")
    .update({ status: "archived" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath("/autor/artikel");
  revalidatePath(`/autor/artikel/${id}`);
  return data;
}

export async function deleteArticle(id: string): Promise<void> {
  const supabase = await createClient();
  await requireCurrentAuthor();

  // Cascade: Storage-Objects vor DB-Row löschen. Wenn Storage-Cleanup
  // fehlschlägt, brechen wir ab — verwaiste Storage-Files sind teurer als
  // ein temporär nicht löschbarer Article. RLS gated den Storage-Zugriff.
  await deleteAllArticleImages(id);

  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/autor/artikel");
}

export type AuthorProfilePatch = {
  display_name?: string;
  handle?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  job_title?: string | null;
  location?: string | null;
  social_links?: Record<string, string | null | undefined> | null;
};

export async function updateAuthorProfile(patch: AuthorProfilePatch): Promise<AuthorRow> {
  const supabase = await createClient();
  const me = await requireCurrentAuthor();
  const { data, error } = await supabase
    .from("authors")
    .update(patch)
    .eq("id", me.id)
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath("/autor/profil");
  if (data.handle) revalidatePath(`/autor/${data.handle}`);
  return data;
}

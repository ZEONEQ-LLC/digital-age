"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteAllArticleImages } from "@/lib/storageActions";
import { renderBlockDocumentToMarkdown } from "@/lib/blockDocumentMarkdown";
import {
  sendArticlePublishedNotification,
  sendArticleSubmittedForReviewNotification,
} from "@/lib/articles/mail";
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
  published_at?: string | null;
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

  // Auto-Reset von Featured/Hero bei Kategorie-Wechsel. Frontend zeigt vorher
  // einen Bestätigungs-Dialog (Block D in PR 2b), aber wir doppeln server-
  // seitig damit der State garantiert konsistent bleibt.
  if (dbPatch.category_id !== undefined) {
    const { data: current } = await supabase
      .from("articles")
      .select("category_id, is_featured, is_hero")
      .eq("id", id)
      .single();
    if (
      current &&
      current.category_id !== dbPatch.category_id &&
      (current.is_featured || current.is_hero)
    ) {
      dbPatch.is_featured = false;
      dbPatch.is_hero = false;
    }
  }

  const { data, error } = await supabase
    .from("articles")
    .update(dbPatch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  // Tags-Sync: tags-Tabelle + article_tags-Junction. Läuft NACH dem Article-
  // Update, damit der RLS-Check (Author-of-article) gegen den finalen
  // author_id-State greift. articles.tags[] wird oben via dbPatch
  // mitgepflegt (Backwards-Compat); hier kümmern wir uns nur um die
  // neue Tabellen-Struktur.
  if (patch.tags !== undefined) {
    await syncArticleTags(supabase, id, patch.tags);
  }

  revalidatePath("/autor/artikel");
  revalidatePath(`/autor/artikel/${id}`);
  return data;
}

// Tags-Sync: Upsert in `tags` (slug = canonicalized name), dann
// `article_tags`-Junction für den Article komplett neu setzen.
async function syncArticleTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  articleId: string,
  tagNames: string[],
): Promise<void> {
  const clean = tagNames
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // Slug aus Name ableiten (gleiche Logik wie im Migrations-Skript).
  const slugify = (s: string): string =>
    s
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/&/g, "und")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

  // Dedup nach Slug (z.B. "AI" und "ai" geben den gleichen Slug).
  const tagsBySlug = new Map<string, string>();
  for (const name of clean) {
    const slug = slugify(name);
    if (!slug) continue;
    if (!tagsBySlug.has(slug)) tagsBySlug.set(slug, name);
  }

  let tagIds: string[] = [];
  if (tagsBySlug.size > 0) {
    const rows = Array.from(tagsBySlug.entries()).map(([slug, name]) => ({
      slug,
      name,
    }));
    // Upsert ohne Name-Update bei Conflict: existierende Tags behalten ihren
    // kanonischen Name (z.B. wenn jemand "ki" tippt, bleibt "KI" wie's ist).
    const { data: upserted, error: upErr } = await supabase
      .from("tags")
      .upsert(rows, { onConflict: "slug", ignoreDuplicates: true })
      .select("id, slug");
    // upserted enthält nur neue Rows; existierende müssen wir separat laden.
    if (upErr) throw new Error(`Tag-Upsert: ${upErr.message}`);

    const slugList = Array.from(tagsBySlug.keys());
    const { data: allRelevant } = await supabase
      .from("tags")
      .select("id, slug")
      .in("slug", slugList);
    tagIds = (allRelevant ?? []).map((t) => t.id);
    // Vermerke unused upserted-Var damit der Linter ruhig ist
    void upserted;
  }

  // Junction komplett neu setzen: delete alle bestehenden, insert neue.
  // Bei Author-Role greift RLS-Policy `article_tags_author_write`/`_delete`
  // (Author kann nur für eigene Articles), bei Editor `article_tags_editor_all`.
  const { error: delErr } = await supabase
    .from("article_tags")
    .delete()
    .eq("article_id", articleId);
  if (delErr) throw new Error(`Junction-Delete: ${delErr.message}`);

  if (tagIds.length === 0) return;
  const junctionRows = tagIds.map((tagId) => ({
    article_id: articleId,
    tag_id: tagId,
  }));
  const { error: insErr } = await supabase
    .from("article_tags")
    .upsert(junctionRows, {
      onConflict: "article_id,tag_id",
      ignoreDuplicates: true,
    });
  if (insErr) throw new Error(`Junction-Insert: ${insErr.message}`);
}

export async function submitForReview(id: string): Promise<ArticleRow> {
  const supabase = await createClient();
  await requireCurrentAuthor();

  // Status-Check + Author-Daten in einer Query, damit wir nach erfolgreichem
  // Update direkt für die Editor-Notification weiterarbeiten können. Der
  // Action-Guard "nur draft" macht den Doppel-Submit-Schutz inherent: bei
  // Doppelklick fliegt der zweite Aufruf raus bevor er Mails versenden kann.
  const { data: current } = await supabase
    .from("articles")
    .select("status, title, author:authors(display_name, email)")
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

  // Editor-Notification fire-and-await. Failure ist nicht-kritisch
  // (Status-Update bleibt durch, Editor sieht im Admin trotzdem).
  const author = (current.author ?? null) as {
    display_name: string;
    email: string;
  } | null;
  if (author?.email && current.title) {
    await sendArticleSubmittedForReviewNotification({
      title: current.title,
      authorName: author.display_name,
      authorEmail: author.email,
    });
  } else {
    console.log(
      `[article] no author email or title, skipping review notification, articleId=${id}`,
    );
  }

  revalidatePath("/autor/artikel");
  revalidatePath(`/autor/artikel/${id}`);
  return data;
}

export async function publishArticle(id: string): Promise<ArticleRow> {
  const supabase = await createClient();
  const me = await requireCurrentAuthor();
  if (me.role !== "editor") throw new Error("Nur Editors können publishen.");

  // Idempotenz-Signal: published_at wird nur beim ersten Publish gesetzt
  // (bestehende Logik). Wenn es vorher schon einen Wert hatte, war der
  // Artikel mindestens einmal live → keine zweite "ist veröffentlicht"-
  // Mail. Deckt Re-Publish-after-Edit UND archived→published-Edge-Case ab.
  const { data: current } = await supabase
    .from("articles")
    .select("published_at, slug, title, author:authors(display_name, email)")
    .eq("id", id)
    .single();
  const wasPublishedBefore = current?.published_at != null;

  const patch: Partial<ArticleRow> = { status: "published" };
  if (!wasPublishedBefore) {
    patch.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("articles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;

  // Author-Notification nur beim ERSTEN Publish, und nur wenn Author-Email
  // vorhanden ist. authors.email ist im Schema NOT NULL — der Skip-Pfad
  // ist defensiv für den Fall dass mal jemand Daten manuell manipuliert
  // oder ein zukünftiger Gast-Author ohne Mail-Adresse existiert.
  if (!wasPublishedBefore) {
    const author = (current?.author ?? null) as {
      display_name: string;
      email: string | null;
    } | null;
    if (author?.email && current?.slug && current?.title) {
      await sendArticlePublishedNotification({
        authorEmail: author.email,
        authorName: author.display_name,
        title: current.title,
        slug: current.slug,
      });
    } else {
      console.log(
        `[article] no author email or slug/title, skipping publish notification, articleId=${id}`,
      );
    }
  }

  revalidatePath("/autor/artikel");
  revalidatePath(`/autor/artikel/${id}`);
  revalidatePath("/");
  return data;
}

export async function archiveArticle(id: string): Promise<ArticleRow> {
  const supabase = await createClient();
  const me = await requireCurrentAuthor();
  if (me.role !== "editor") throw new Error("Nur Editors können archivieren.");

  // Beim Archivieren wird Featured/Hero gleich mit zurückgesetzt — ein
  // archivierter Artikel hat in den Spotlight-Sections nichts verloren.
  const { data, error } = await supabase
    .from("articles")
    .update({ status: "archived", is_featured: false, is_hero: false })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  revalidatePath("/autor/artikel");
  revalidatePath(`/autor/artikel/${id}`);
  revalidatePath("/");
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

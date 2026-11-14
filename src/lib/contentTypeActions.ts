"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FormError, runAction, type ActionResult } from "@/lib/actionResult";
import {
  SHOWCASE_CATEGORY_SLUG,
  SHOWCASE_PUBLISHING_ENABLED,
  contentTypeDbError,
  isContentType,
  planContentTypeChange,
  type ContentTypeInput,
} from "@/lib/contentType";

export type ContentTypeResult = {
  content_type: string;
  startup_id: string | null;
  is_paid: boolean;
  category_id: string;
};

// Einordnung eines Artikels setzen: redaktionell oder Unternehmensbeitrag.
// Nur Editor:innen. Eigene Action statt Feld im Speichern-Patch, weil der
// Wechsel Folgen hat (Kategorie, Featured/Hero, Sichtbarkeit in Listen) und
// sofort gelten soll. Der DB-Trigger articles_guard_content_type sichert
// dieselbe Regel ab.
export async function setArticleContentType(
  articleId: string,
  input: ContentTypeInput,
): Promise<ActionResult<ContentTypeResult>> {
  return runAction("article.setContentType", () => setArticleContentTypeInner(articleId, input), contentTypeDbError);
}

async function setArticleContentTypeInner(articleId: string, input: ContentTypeInput): Promise<ContentTypeResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new FormError("Nicht eingeloggt.");
  const { data: me } = await supabase.from("authors").select("role").eq("user_id", user.id).maybeSingle();
  if (me?.role !== "editor") throw new FormError("Nur die Redaktion kann die Einordnung eines Artikels ändern.");
  if (!isContentType(input?.content_type)) throw new FormError("Ungültiger Inhaltstyp.");

  const [{ data: article }, { data: categories }] = await Promise.all([
    supabase.from("articles").select("id, slug, status, category_id").eq("id", articleId).maybeSingle(),
    supabase.from("categories").select("id, slug"),
  ]);
  if (!article) throw new FormError("Artikel nicht gefunden.");

  let startupListed = false;
  if (input.content_type === "company" && input.startup_id) {
    const { data: startup } = await supabase
      .from("ai_startups")
      .select("id, status")
      .eq("id", input.startup_id)
      .maybeSingle();
    startupListed = startup?.status === "published" || startup?.status === "featured";
  }

  const cats = categories ?? [];
  const plan = planContentTypeChange(input, {
    status: article.status,
    category_id: article.category_id,
    showcaseCategoryId: cats.find((c) => c.slug === SHOWCASE_CATEGORY_SLUG)?.id ?? null,
    editorialCategoryIds: cats.filter((c) => c.slug !== SHOWCASE_CATEGORY_SLUG).map((c) => c.id),
    startupListed,
    publishingEnabled: SHOWCASE_PUBLISHING_ENABLED,
  });
  if (!plan.ok) throw new FormError(plan.message);

  const { data, error } = await supabase
    .from("articles")
    .update(plan.patch)
    .eq("id", articleId)
    .select("content_type, startup_id, is_paid, category_id, status, slug")
    .single();
  if (error) throw error;

  revalidatePath(`/autor/artikel/${articleId}`);
  revalidatePath("/autor/artikel");
  revalidatePath("/autor/admin/artikel");
  // Ein publizierter Artikel wechselt die Listen: Startseite und Beitragsseite
  // neu bauen.
  if (data.status === "published") {
    revalidatePath("/");
    revalidatePath(`/artikel/${data.slug}`);
  }
  return {
    content_type: data.content_type,
    startup_id: data.startup_id,
    is_paid: data.is_paid,
    category_id: data.category_id,
  };
}

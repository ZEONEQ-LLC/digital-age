"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];
type AuthorUpdate = Database["public"]["Tables"]["authors"]["Update"];

async function requireEditor(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");
  const { data: me } = await supabase
    .from("authors")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) throw new Error("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new Error("Nur Editor:innen dürfen Author-Management nutzen.");
}

function revalidateAdminPaths(): void {
  revalidatePath("/autor/admin/autoren");
  revalidatePath("/autor/admin/einladungen");
  revalidatePath("/autor/dashboard");
}

export type AuthorAdminPatch = {
  display_name?: string;
  email?: string;
  handle?: string | null;
  job_title?: string | null;
  location?: string | null;
  bio?: string | null;
  role?: "external" | "author" | "editor";
  social_links?: Record<string, string> | null;
};

export async function updateAuthorAsEditor(id: string, patch: AuthorAdminPatch): Promise<AuthorRow> {
  await requireEditor();
  const supabase = await createClient();

  const update: AuthorUpdate = {};
  if (patch.display_name !== undefined) {
    const v = patch.display_name.trim();
    if (!v) throw new Error("Anzeigename darf nicht leer sein.");
    update.display_name = v;
  }
  if (patch.email !== undefined) {
    const v = patch.email.trim();
    if (!v) throw new Error("E-Mail darf nicht leer sein.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error("E-Mail-Format ungültig.");
    update.email = v;
  }
  if (patch.handle !== undefined) update.handle = patch.handle ?? null;
  if (patch.job_title !== undefined) update.job_title = patch.job_title ?? null;
  if (patch.location !== undefined) update.location = patch.location ?? null;
  if (patch.bio !== undefined) update.bio = patch.bio ?? null;
  if (patch.role !== undefined) update.role = patch.role;
  if (patch.social_links !== undefined) {
    update.social_links = patch.social_links === null ? null : patch.social_links;
  }
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("authors")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("Slug oder E-Mail bereits vergeben.");
    }
    throw error;
  }
  revalidateAdminPaths();
  return data;
}

// Weist einen Artikel einem anderen Author zu. Editor-only. RLS-Policy
// `articles_editor_all` deckt die Update-Permission ab.
export async function updateArticleAuthor(
  articleId: string,
  newAuthorId: string,
): Promise<void> {
  await requireEditor();
  const supabase = await createClient();

  const { data: targetAuthor } = await supabase
    .from("authors")
    .select("id")
    .eq("id", newAuthorId)
    .maybeSingle();
  if (!targetAuthor) throw new Error("Ziel-Author existiert nicht.");

  const { error } = await supabase
    .from("articles")
    .update({ author_id: newAuthorId })
    .eq("id", articleId);
  if (error) throw new Error(`Author-Zuweisung fehlgeschlagen: ${error.message}`);

  revalidatePath(`/autor/artikel/${articleId}`);
  revalidatePath("/autor/admin/artikel");
}

export async function deleteAuthorAsEditor(id: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();

  const { count: articleCount, error: countErr } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("author_id", id);
  if (countErr) throw countErr;
  if ((articleCount ?? 0) > 0) {
    throw new Error(
      `Author hat ${articleCount} Artikel und kann nicht gelöscht werden. Bitte Artikel zuerst archivieren oder einem anderen Author zuordnen.`,
    );
  }

  const { error } = await supabase.from("authors").delete().eq("id", id);
  if (error) throw error;
  revalidateAdminPaths();
}

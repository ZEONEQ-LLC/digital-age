"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RestoreResult = { ok: true } | { ok: false; message: string };

// Stellt eine Revision wieder her (Time-Machine). Die RPC schreibt zuerst den
// aktuellen Stand als 'restore'-Revision (rueckgaengig machbar) und setzt dann
// die redaktionellen Felder atomar zurueck. Status wird nie geaendert; der
// Slug nur, wenn der Artikel nie publiziert war. Berechtigung wird in der RPC
// wie die articles-UPDATE-Policies geprueft (Editor: alle; Autor: eigene in
// draft/in_review) → false, wenn nicht erlaubt oder Revision nicht
// restaurierbar.
export async function restoreRevision(
  articleId: string,
  revisionId: string,
): Promise<RestoreResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("restore_article_revision", {
    p_article_id: articleId,
    p_revision_id: revisionId,
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  if (data !== true) {
    return {
      ok: false,
      message:
        "Wiederherstellung nicht möglich (keine Berechtigung oder Revision nicht restaurierbar).",
    };
  }
  revalidatePath(`/autor/artikel/${articleId}`);
  return { ok: true };
}

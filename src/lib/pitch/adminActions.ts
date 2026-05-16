"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

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
    throw new Error("Nur Editoren dürfen Nachrichten verwalten.");
  }
}

type Status = "new" | "replied" | "archived";

export async function updateContactStatus(
  id: string,
  status: Status,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireEditor();
  const supabase = await createClient();
  const patch: { status: Status; replied_at?: string | null } = { status };
  if (status === "replied") patch.replied_at = new Date().toISOString();
  const { error } = await supabase
    .from("contact_messages")
    .update(patch)
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/autor/admin/nachrichten");
  return { ok: true };
}

export async function updateContactNotes(
  id: string,
  notes: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireEditor();
  const trimmed = notes.trim();
  if (trimmed.length > 1000) {
    return { ok: false, message: "Notiz zu lang (max. 1000 Zeichen)." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .update({ notes: trimmed === "" ? null : trimmed })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/autor/admin/nachrichten");
  return { ok: true };
}

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
    throw new Error("Nur Editoren dürfen Abonnent:innen verwalten.");
  }
}

export async function unsubscribeSubscriber(
  subscriberId: string,
): Promise<{ success: true } | { success: false; message: string }> {
  await requireEditor();
  const supabase = await createClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("id", subscriberId);
  if (error) {
    return { success: false, message: error.message };
  }
  revalidatePath("/autor/admin/newsletter");
  return { success: true };
}

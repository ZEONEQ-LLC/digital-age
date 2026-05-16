"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  sendSubmissionApproved,
  sendSubmissionConfirmation,
  sendSubmissionNotification,
  sendSubmissionRejected,
} from "@/lib/submissions/mail";
import type { Database } from "@/lib/database.types";

type PromptRow = Database["public"]["Tables"]["ai_prompts"]["Row"];
type PromptDifficulty = Database["public"]["Enums"]["prompt_difficulty"];

async function requireInternalAuthor(): Promise<{ id: string; role: "author" | "editor" }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");
  const { data: author } = await supabase
    .from("authors")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (!author) throw new Error("Author-Profil nicht gefunden.");
  if (author.role === "external") {
    throw new Error("Externe Autoren können keine Prompts anlegen.");
  }
  return { id: author.id, role: author.role as "author" | "editor" };
}

async function requireEditor(): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");
  const { data: me } = await supabase
    .from("authors")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) throw new Error("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new Error("Nur Editor:innen.");
  return { id: me.id };
}

function revalidateAll(): void {
  revalidatePath("/ai-prompts");
  revalidatePath("/autor/prompts");
  revalidatePath("/autor/admin/prompts");
  revalidatePath("/");
}

function validateBasics(input: {
  title: string;
  prompt_text: string;
  context: string;
  category: string;
  tested_with: string;
  difficulty: string;
}): void {
  const title = input.title.trim();
  const body = input.prompt_text.trim();
  const ctx = input.context.trim();
  if (!title) throw new Error("Titel ist erforderlich.");
  if (title.length > 80) throw new Error("Titel zu lang (max 80 Zeichen).");
  if (body.length < 20) throw new Error("Prompt-Text zu kurz (min 20 Zeichen).");
  if (body.length > 4000) throw new Error("Prompt-Text zu lang (max 4000 Zeichen).");
  if (!ctx) throw new Error("Kontext ist erforderlich.");
  if (!input.category) throw new Error("Kategorie ist erforderlich.");
  if (!input.tested_with) throw new Error("Tool ist erforderlich.");
  if (!["beginner", "intermediate", "expert"].includes(input.difficulty)) {
    throw new Error("Schwierigkeit ungültig.");
  }
}

export type CreatePromptInput = {
  title: string;
  prompt_text: string;
  context: string;
  example_output?: string | null;
  category: string;
  tested_with: string;
  difficulty: PromptDifficulty;
};

export async function createPrompt(input: CreatePromptInput): Promise<PromptRow> {
  const me = await requireInternalAuthor();
  validateBasics(input);
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ai_prompts")
    .insert({
      title: input.title.trim(),
      prompt_text: input.prompt_text.trim(),
      context: input.context.trim(),
      example_output: input.example_output?.trim() || null,
      category: input.category,
      tested_with: input.tested_with,
      difficulty: input.difficulty,
      author_id: me.id,
      status: "published",
      published_at: now,
    })
    .select("*")
    .single();
  if (error) throw error;
  revalidateAll();
  return data;
}

export type UpdatePromptPatch = Partial<{
  title: string;
  prompt_text: string;
  context: string;
  example_output: string | null;
  category: string;
  tested_with: string;
  difficulty: PromptDifficulty;
  status: "published" | "archived";
}>;

export async function updatePrompt(id: string, patch: UpdatePromptPatch): Promise<PromptRow> {
  await requireInternalAuthor();
  if (
    patch.title !== undefined ||
    patch.prompt_text !== undefined ||
    patch.context !== undefined ||
    patch.category !== undefined ||
    patch.tested_with !== undefined ||
    patch.difficulty !== undefined
  ) {
    validateBasics({
      title: patch.title ?? "placeholder",
      prompt_text: patch.prompt_text ?? "placeholder " + "x".repeat(20),
      context: patch.context ?? "placeholder",
      category: patch.category ?? "placeholder",
      tested_with: patch.tested_with ?? "placeholder",
      difficulty: patch.difficulty ?? "beginner",
    });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_prompts")
    .update({
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.prompt_text !== undefined && { prompt_text: patch.prompt_text.trim() }),
      ...(patch.context !== undefined && { context: patch.context.trim() }),
      ...(patch.example_output !== undefined && { example_output: patch.example_output?.trim() || null }),
      ...(patch.category !== undefined && { category: patch.category }),
      ...(patch.tested_with !== undefined && { tested_with: patch.tested_with }),
      ...(patch.difficulty !== undefined && { difficulty: patch.difficulty }),
      ...(patch.status !== undefined && { status: patch.status }),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  revalidateAll();
  return data;
}

export async function deletePrompt(id: string): Promise<void> {
  await requireInternalAuthor();
  const supabase = await createClient();
  const { error } = await supabase.from("ai_prompts").delete().eq("id", id);
  if (error) throw error;
  revalidateAll();
}

export type ExternalSubmitInput = {
  title: string;
  prompt_text: string;
  context: string;
  example_output?: string | null;
  category: string;
  tested_with: string;
  difficulty: PromptDifficulty;
  submitter_name: string;
  submitter_email: string;
  submitter_url?: string | null;
};

export async function submitPromptExternal(input: ExternalSubmitInput): Promise<void> {
  validateBasics(input);
  const name = input.submitter_name.trim();
  const email = input.submitter_email.trim();
  if (!name) throw new Error("Name ist erforderlich.");
  if (!email) throw new Error("E-Mail ist erforderlich.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-Mail-Format ungültig.");

  const title = input.title.trim();
  const supabase = await createClient();
  // Kein .select() nach insert — anon hat keine SELECT-Policy auf pending-
  // Rows. Wir brauchen aber die row-id eh nicht für Mail-Dispatch: der
  // Editor-Notification-Link zeigt auf die Listing-Page /autor/admin/prompts,
  // nicht auf eine konkrete Detail-Row.
  const { error } = await supabase.from("ai_prompts").insert({
    title,
    prompt_text: input.prompt_text.trim(),
    context: input.context.trim(),
    example_output: input.example_output?.trim() || null,
    category: input.category,
    tested_with: input.tested_with,
    difficulty: input.difficulty,
    submitter_name: name,
    submitter_email: email,
    submitter_url: input.submitter_url?.trim() || null,
    status: "pending",
    author_id: null,
  });
  if (error) throw error;

  // Mail-Versand fire-and-await. Beide Mails parallel; Failure ist
  // nicht-kritisch (DB-Insert ist durch, Editor sieht im Admin). Pattern
  // wie bei contact/pitch.
  await Promise.allSettled([
    sendSubmissionConfirmation({
      type: "prompt",
      email,
      name,
      title,
    }),
    sendSubmissionNotification({
      type: "prompt",
      title,
      submitterName: name,
      submitterEmail: email,
    }),
  ]);

  revalidatePath("/autor/admin/prompts");
}

export async function approvePrompt(id: string, opts?: { feature?: boolean }): Promise<void> {
  const me = await requireEditor();
  const supabase = await createClient();
  const targetStatus = opts?.feature ? "featured" : "published";

  // Idempotenz: aktuellen Status + Submitter-Daten VOR dem Update lesen.
  // Wenn schon im Ziel-Status → kein Re-Send der Approval-Mail (Doppel-
  // Klick-Schutz).
  const { data: current } = await supabase
    .from("ai_prompts")
    .select("status, submitter_email, submitter_name, title")
    .eq("id", id)
    .maybeSingle();
  const alreadyApproved =
    current?.status === "published" || current?.status === "featured";

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("ai_prompts")
    .update({
      status: targetStatus,
      reviewed_by_id: me.id,
      reviewed_at: now,
      published_at: now,
      rejection_reason: null,
    })
    .eq("id", id);
  if (error) throw error;

  // Mail nur bei echtem Statuswechsel auf approved + vorhandener
  // Submitter-Email (Author-interne Prompts haben submitter_email=null).
  if (
    !alreadyApproved &&
    current?.submitter_email &&
    current?.submitter_name &&
    current?.title
  ) {
    await sendSubmissionApproved({
      type: "prompt",
      email: current.submitter_email,
      name: current.submitter_name,
      title: current.title,
      liveUrl: `/ai-prompts/${id}`,
    });
  }

  revalidateAll();
}

export async function rejectPrompt(
  id: string,
  reason?: string | null,
): Promise<void> {
  const me = await requireEditor();
  const supabase = await createClient();
  // Reason ist jetzt optional (Spec): leer/null → null in DB, Submitter
  // bekommt generic-Mail-Text statt eingebetteten Grund.
  const r = (reason ?? "").trim();
  const reasonValue = r === "" ? null : r;

  const { data: current } = await supabase
    .from("ai_prompts")
    .select("status, submitter_email, submitter_name, title")
    .eq("id", id)
    .maybeSingle();
  const alreadyRejected = current?.status === "rejected";

  const { error } = await supabase
    .from("ai_prompts")
    .update({
      status: "rejected",
      reviewed_by_id: me.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reasonValue,
    })
    .eq("id", id);
  if (error) throw error;

  if (
    !alreadyRejected &&
    current?.submitter_email &&
    current?.submitter_name &&
    current?.title
  ) {
    await sendSubmissionRejected({
      type: "prompt",
      email: current.submitter_email,
      name: current.submitter_name,
      title: current.title,
      reason: reasonValue,
    });
  }

  revalidateAll();
}

export async function toggleFeatured(id: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();
  const { data: cur } = await supabase
    .from("ai_prompts")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (!cur) throw new Error("Prompt nicht gefunden.");
  const next = cur.status === "featured" ? "published" : "featured";
  const { error } = await supabase
    .from("ai_prompts")
    .update({ status: next })
    .eq("id", id);
  if (error) throw error;
  revalidateAll();
}

export async function archivePromptAsEditor(id: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_prompts")
    .update({ status: "archived" })
    .eq("id", id);
  if (error) throw error;
  revalidateAll();
}

export async function restoreToPending(id: string): Promise<void> {
  await requireEditor();
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_prompts")
    .update({
      status: "pending",
      rejection_reason: null,
      reviewed_by_id: null,
      reviewed_at: null,
    })
    .eq("id", id);
  if (error) throw error;
  revalidateAll();
}

export async function incrementPromptUses(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("increment_prompt_uses", { p_id: id });
}

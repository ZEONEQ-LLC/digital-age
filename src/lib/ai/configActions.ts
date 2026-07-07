"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AiTask } from "@/lib/ai/types";
import {
  cleanPromptOverrides,
  type EditablePromptId,
} from "@/lib/ai/promptRegistry";

// Editor-Check wie in den anderen Admin-Server-Actions. Wir erwarten,
// dass RLS ohnehin greift — aber die Action soll Nicht-Editoren mit einer
// klaren Fehlermeldung abweisen statt sie auf einen rohen Postgres-RLS-
// Error rennen zu lassen.
async function requireEditorAuthor(): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");
  const { data: author } = await supabase
    .from("authors")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (!author) throw new Error("Author-Profil nicht gefunden.");
  if (author.role !== "editor") {
    throw new Error("Nur Editoren dürfen die AI-Konfiguration ändern.");
  }
  return { id: author.id };
}

// Tasks, die das Editor-UI als Override-Dropdown anbietet. Spiegelt
// KNOWN_TASKS aus src/lib/ai/config.ts — beide Listen müssen synchron
// gehalten werden. Bei Save werden Overrides für Tasks ausserhalb dieser
// Liste rausgefiltert (Self-Cleanup-Pfad für stale Werte).
const KNOWN_TASKS: ReadonlySet<AiTask> = new Set<AiTask>([
  "title_variants",
  "tone_check",
  "summary",
  "closing_paragraph",
  "seo_pipeline",
  "seo_review",
  "news_item_generation",
  "abstract_generate",
  "highlight_suggestions",
  "image_alt",
]);

export type SaveAiConfigInput = {
  systemPrompt: string;
  defaultModel: string;
  taskModelOverrides: Partial<Record<AiTask, string>>;
  // Editierbare Strategie-Overrides pro Prompt-ID (nicht AiTask —
  // seo_pipeline ist zwei Prompts). Leere/whitespace-Werte werden beim
  // Speichern gedroppt (Resolver faellt dann auf den Code-Default).
  taskPromptOverrides: Partial<Record<EditablePromptId, string>>;
};

export type SaveAiConfigResult =
  | { ok: true }
  | { ok: false; message: string };

export async function saveAiConfig(
  input: SaveAiConfigInput,
): Promise<SaveAiConfigResult> {
  let editor;
  try {
    editor = await requireEditorAuthor();
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Auth-Fehler.",
    };
  }

  const defaultModel = input.defaultModel.trim();
  if (defaultModel === "") {
    return { ok: false, message: "Default-Modell darf nicht leer sein." };
  }

  // Overrides säubern: leere Strings → Key weglassen; unbekannte Tasks
  // ignorieren (defensiv, kein Throw — die UI verhindert das eh).
  const cleaned: Record<string, string> = {};
  for (const [task, model] of Object.entries(input.taskModelOverrides)) {
    if (!KNOWN_TASKS.has(task as AiTask)) continue;
    if (typeof model !== "string") continue;
    const trimmed = model.trim();
    if (trimmed === "") continue;
    cleaned[task] = trimmed;
  }

  // Strategie-Prompt-Overrides säubern (gleiche Politik: leer/whitespace →
  // Key weg; unbekannte Prompt-IDs ignorieren). Logik in seoPrompts.ts, damit
  // sie mit dem Prompt-ID-Schlüsselraum an einer Stelle lebt.
  const cleanedPrompts = cleanPromptOverrides(input.taskPromptOverrides);

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_config")
    .update({
      system_prompt: input.systemPrompt,
      default_model: defaultModel,
      task_model_overrides: cleaned,
      task_prompt_overrides: cleanedPrompts,
      updated_at: new Date().toISOString(),
      updated_by: editor.id,
    })
    .eq("id", "global");

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/autor/admin/ai-config");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import { isAiTask, TASKS_WITH_OWN_MODEL_SETTING, type AiTask } from "@/lib/ai/types";
import { isKnownModel } from "@/lib/ai/models";
import { FormError, runAction, type ActionResult } from "@/lib/actionResult";
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
  if (!user) throw new FormError("Nicht eingeloggt.");
  const { data: author } = await supabase
    .from("authors")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (!author) throw new FormError("Author-Profil nicht gefunden.");
  if (author.role !== "editor") {
    throw new FormError("Nur Editoren dürfen die AI-Konfiguration ändern.");
  }
  return { id: author.id };
}

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
  // ignorieren (defensiv, kein Throw — die UI verhindert das eh). Tasks mit
  // eigener Modellwahl (News-Ticker) kommen unverändert aus der DB, damit ein
  // Speichern hier deren Einstellung nicht mit einem alten Stand überschreibt.
  const supabase = await createClient();
  const current = await readTaskModelOverrides(supabase);
  const ownSetting = new Set<AiTask>(TASKS_WITH_OWN_MODEL_SETTING);
  const cleaned: Record<string, string> = {};
  for (const [task, model] of Object.entries(input.taskModelOverrides)) {
    if (!isAiTask(task) || ownSetting.has(task)) continue;
    if (typeof model !== "string") continue;
    const trimmed = model.trim();
    if (trimmed === "") continue;
    cleaned[task] = trimmed;
  }
  for (const task of ownSetting) {
    // DB nicht lesbar: lieber den Stand der Seite als den Override verlieren.
    const v = current ? current[task] : input.taskModelOverrides[task];
    if (typeof v === "string" && v.trim() !== "") cleaned[task] = v.trim();
  }

  // Strategie-Prompt-Overrides säubern (gleiche Politik: leer/whitespace →
  // Key weg; unbekannte Prompt-IDs ignorieren). Logik in seoPrompts.ts, damit
  // sie mit dem Prompt-ID-Schlüsselraum an einer Stelle lebt.
  const cleanedPrompts = cleanPromptOverrides(input.taskPromptOverrides);

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

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Aktuelle task_model_overrides (null, wenn die Row nicht lesbar ist).
async function readTaskModelOverrides(
  supabase: ServerClient,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("ai_config")
    .select("task_model_overrides")
    .eq("id", "global")
    .single();
  if (error || !data) return null;
  const raw = data.task_model_overrides;
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

// Modell für den News-Ticker (Task news_item_generation), gewählt auf der
// News-Ticker-Seite. Ändert nur diesen einen Schlüssel in
// task_model_overrides; "" = Standard (default_model der AI-Konfiguration).
export async function saveNewsTickerModel(model: string): Promise<ActionResult<null>> {
  return runAction("ai.saveNewsTickerModel", async () => {
    const editor = await requireEditorAuthor();
    const next = model.trim();
    if (next !== "" && !isKnownModel(next)) {
      throw new FormError("Unbekanntes Modell. Bitte eines aus der Liste wählen.");
    }
    const supabase = await createClient();
    const current = await readTaskModelOverrides(supabase);
    if (!current) throw new FormError("Die KI-Konfiguration konnte nicht gelesen werden.");
    const overrides: Record<string, unknown> = { ...current };
    if (next === "") delete overrides.news_item_generation;
    else overrides.news_item_generation = next;
    const { error } = await supabase
      .from("ai_config")
      .update({
        task_model_overrides: overrides as Json,
        updated_at: new Date().toISOString(),
        updated_by: editor.id,
      })
      .eq("id", "global");
    if (error) throw error;
    revalidatePath("/autor/news-ticker");
    revalidatePath("/autor/admin/ai-config");
    return null;
  });
}

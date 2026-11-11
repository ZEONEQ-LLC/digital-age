import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { EditablePromptId } from "@/lib/ai/promptRegistry";

// Editierbare Strategie-Overrides aus ai_config.task_prompt_overrides (Admin
// «Task-Prompts»). Ein Modul fuer alle KI-Actions; vorher hatte jede Action
// eine eigene Kopie, weil "use server"-Module nur async Actions exportieren
// duerfen. Nur nicht-leere Strings zaehlen, alles andere faellt weg und der
// Builder nimmt den Code-Default. Bei jedem Fehler (RLS, 0 Rows, Netz) → {}.
// Kein Cache: frisch pro Call wie resolveLLMConfig.
export async function getPromptOverrides(): Promise<Partial<Record<EditablePromptId, string>>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_config")
      .select("task_prompt_overrides")
      .eq("id", "global")
      .single();
    if (error || !data) return {};
    const raw = (data as { task_prompt_overrides?: unknown }).task_prompt_overrides;
    if (!raw || typeof raw !== "object") return {};
    const out: Partial<Record<EditablePromptId, string>> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim() !== "") out[k as EditablePromptId] = v;
    }
    return out;
  } catch (err) {
    console.warn(
      "[ai] task_prompt_overrides read failed, using code defaults:",
      err instanceof Error ? err.message : String(err),
    );
    return {};
  }
}

export async function getPromptOverride(id: EditablePromptId): Promise<string | undefined> {
  return (await getPromptOverrides())[id];
}

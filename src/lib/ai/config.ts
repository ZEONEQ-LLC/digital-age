import "server-only";

import { createClient } from "@/lib/supabase/server";
import { resolveTaskModel } from "@/lib/ai/taskModel";
import type { AiTask, LLMParams } from "@/lib/ai/types";

// Runtime-Set der Tasks, für die das Editor-UI in /autor/admin/ai-config
// Override-Dropdowns rendert. Spiegelt aktuell die volle AiTask-Union
// (Source-of-Truth in types.ts). Keys in task_model_overrides, die hier
// nicht stehen, werden vom Resolver ignoriert (Self-Cleanup-Pfad für
// stale Werte aus früheren Schema-Ständen).
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

// Schema der Row (deckt sich mit Database["public"]["Tables"]["ai_config"]
// — bewusst lokal getypt, damit dieses Modul nicht hart von der gen-types
// abhängt).
type AiConfigRow = {
  system_prompt: string;
  default_model: string;
  task_model_overrides: Record<string, unknown>;
};

// Bildet effektive `LLMParams` durch Merge mit der DB-Config. Bei jedem
// Failure (Tabelle fehlt, Service down, RLS unerwartet, 0 Rows) fällt
// die Funktion graceful auf die Caller-Werte zurück und loggt einmalig
// eine Warnung — `callLLM` soll daran NICHT crashen und auch nicht
// `kind:"config"` zurückgeben (das ist Env-Konfig-Fehlen vorbehalten).
export async function resolveLLMConfig(params: LLMParams): Promise<LLMParams> {
  let row: AiConfigRow | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_config")
      .select("system_prompt, default_model, task_model_overrides")
      .eq("id", "global")
      .single();
    if (error || !data) {
      console.warn(
        "[ai-config] resolve failed, falling back to env:",
        error?.code ?? "no-row",
      );
      // Auch im DB-Fallback muss der Task-Default greifen (image_alt → Vision),
      // sonst laeuft der Task auf ANTHROPIC_MODEL, das evtl. keine Bilder kann.
      return { ...params, model: resolveTaskModel(params.task, undefined, params.model) };
    }
    row = data as unknown as AiConfigRow;
  } catch (err) {
    console.warn(
      "[ai-config] resolve threw, falling back to env:",
      err instanceof Error ? err.message : String(err),
    );
    return { ...params, model: resolveTaskModel(params.task, undefined, params.model) };
  }

  const dbSystem = row.system_prompt ?? "";
  const callerSystem = params.system;
  const effectiveSystem =
    dbSystem + (dbSystem && callerSystem ? "\n\n" : "") + callerSystem;

  // Modell-Auflösung (resolveTaskModel): (a) gueltiger Admin-Override [nur wenn
  // Key in KNOWN_TASKS + bekanntes Modell], sonst (b) hartkodierter Task-Default
  // [z.B. image_alt → Vision-Modell], sonst (c) genereller default_model. Ist
  // auch der unbekannt, greift zuletzt der Env-Fallback im Provider.
  const overrides = row.task_model_overrides ?? {};
  const candidate =
    KNOWN_TASKS.has(params.task as AiTask) ? overrides[params.task] : undefined;
  const effectiveModel = resolveTaskModel(
    params.task,
    candidate,
    row.default_model,
  );

  return {
    ...params,
    system: effectiveSystem,
    model: effectiveModel,
  };
}

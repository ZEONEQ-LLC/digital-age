// Reine Task→Modell-Auflösung (kein "server-only" — testbar). Wird von
// resolveLLMConfig (config.ts) genutzt.

import { isKnownModel } from "@/lib/ai/models";
import type { AiTask } from "@/lib/ai/types";

// Hartkodierte Task-Default-Modelle — greifen NACH einem Admin-Override, aber
// VOR dem generellen default_model.
//
// image_alt ist ein VISION-Task: ohne vision-faehiges Modell failt Schritt 4
// des Co-Pilot-Laufs (und der manuelle ALT-Button) bei JEDEM Lauf, bis ein
// Admin-Override gesetzt ist — das Feature waere nach Deploy kaputt. Haiku 5.5
// ist vision-faehig und guenstig; ALT-Texte brauchen kein grosses Modell.
//
// podcast_ingest: kurze Beschreibung + Kategorie aus Metadaten — guenstiges
// Modell reicht; Admin-Override bleibt moeglich.
//
// hero_proposals: 1200 Output-Tokens plus Thinking muessen in den 30-s-Timeout
// passen — Haiku 5.5 als Default, Sonnet per Admin-Override moeglich.
//
// platform_research / prompt_generation (PR 197): Hintergrund-Jobs ohne
// Freigabe, die direkt veroeffentlichen. Urteil und Qualitaet zaehlen mehr
// als die Kosten (ein Lauf pro Woche): Sonnet 5.5.
export const TASK_MODEL_DEFAULTS: Partial<Record<AiTask, string>> = {
  image_alt: "claude-haiku-5-5",
  podcast_ingest: "claude-haiku-5-5",
  hero_proposals: "claude-haiku-5-5",
  platform_research: "claude-sonnet-5-5",
  prompt_generation: "claude-sonnet-5-5",
};

// Auflösung: gueltiger Override → Task-Default → genereller Default.
//   rawOverride  = task_model_overrides[task] (ungeprueft) bzw. undefined
//   defaultModel = row.default_model bzw. undefined (DB-Fallback → dann greift
//                  fuer image_alt der Task-Default, sonst der Provider-Env-Fallback)
export function resolveTaskModel(
  task: AiTask,
  rawOverride: unknown,
  defaultModel: string | undefined,
): string | undefined {
  const overrideModel =
    typeof rawOverride === "string" &&
    rawOverride.trim() !== "" &&
    isKnownModel(rawOverride.trim())
      ? rawOverride.trim()
      : undefined;
  if (overrideModel) return overrideModel;
  const taskDefault = TASK_MODEL_DEFAULTS[task];
  if (taskDefault) return taskDefault;
  return defaultModel;
}

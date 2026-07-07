// Reine Task→Modell-Auflösung (kein "server-only" — testbar). Wird von
// resolveLLMConfig (config.ts) genutzt.

import { isKnownModel } from "@/lib/ai/models";
import type { AiTask } from "@/lib/ai/types";

// Hartkodierte Task-Default-Modelle — greifen NACH einem Admin-Override, aber
// VOR dem generellen default_model.
//
// image_alt ist ein VISION-Task: ohne vision-faehiges Modell failt Schritt 4
// des Co-Pilot-Laufs (und der manuelle ALT-Button) bei JEDEM Lauf, bis ein
// Admin-Override gesetzt ist — das Feature waere nach Deploy kaputt. Haiku 4.5
// ist vision-faehig und guenstig; ALT-Texte brauchen kein grosses Modell.
export const TASK_MODEL_DEFAULTS: Partial<Record<AiTask, string>> = {
  image_alt: "claude-haiku-4-5",
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

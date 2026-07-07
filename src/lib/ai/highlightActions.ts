"use server";

import { callLLM } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import {
  buildHighlightSuggestionsSystem,
  buildHighlightSuggestionsPrompt,
  parseHighlights,
  type HighlightSuggestion,
} from "@/lib/ai/highlightPrompts";
import type { AiErrorKind } from "@/lib/ai/types";

export type HighlightSuggestionsResult =
  | { ok: true; suggestions: HighlightSuggestion[] }
  | { ok: false; error: AiErrorKind };

// Liest den editierbaren Strategie-Override fuer highlight_suggestions aus
// ai_config.task_prompt_overrides. Bewusst klein dupliziert (analog
// seoActions.getTaskPromptOverrides), um kein "use server"-Modul quer zu
// importieren. Bei jedem Fehler → undefined (Code-Default greift im Builder).
async function getHighlightStrategyOverride(): Promise<string | undefined> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_config")
      .select("task_prompt_overrides")
      .eq("id", "global")
      .single();
    if (error || !data) return undefined;
    const raw = (data as { task_prompt_overrides?: unknown })
      .task_prompt_overrides;
    if (!raw || typeof raw !== "object") return undefined;
    const v = (raw as Record<string, unknown>)["highlight_suggestions"];
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  } catch {
    return undefined;
  }
}

// Schlaegt 3-6 woertliche Kernaussagen zum Markieren vor. Reiner Vorschlag —
// die AI schreibt/fuegt NICHTS; das Setzen der Marks macht der Editor nach
// Auswahl im Modal. bodyText sollte MARKER-FREIER Plain-Text sein (Editor-
// textContent), damit die Zitate im Text wiederfindbar sind.
export async function generateHighlightSuggestions(args: {
  bodyText: string;
  locale: "de-CH" | "en";
  articleId: string;
}): Promise<HighlightSuggestionsResult> {
  const override = await getHighlightStrategyOverride();
  const result = await callLLM({
    system: buildHighlightSuggestionsSystem(args.locale, override),
    prompt: buildHighlightSuggestionsPrompt({ bodyText: args.bodyText }),
    // Output-Budget: 3-6 Zitate (je ggf. ein Satz) + kurze reason. 700 Puffer.
    maxTokens: 700,
    task: "highlight_suggestions",
  });

  if (!result.ok) {
    return { ok: false, error: result.kind };
  }

  const suggestions = parseHighlights(result.text);
  if (!suggestions) {
    console.error(
      `[highlight] JSON-Parse failed for article ${args.articleId}`,
    );
    return { ok: false, error: "invalid_json" };
  }
  return { ok: true, suggestions };
}

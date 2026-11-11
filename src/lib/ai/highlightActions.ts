"use server";

import { callLLM } from "@/lib/ai/client";
import {
  buildHighlightSuggestionsSystem,
  buildHighlightSuggestionsPrompt,
  parseHighlights,
  type HighlightSuggestion,
} from "@/lib/ai/highlightPrompts";
import type { AiErrorKind } from "@/lib/ai/types";
import { getPromptOverride } from "@/lib/ai/promptOverrides";

export type HighlightSuggestionsResult =
  | { ok: true; suggestions: HighlightSuggestion[] }
  | { ok: false; error: AiErrorKind };

// Schlaegt 3-6 woertliche Kernaussagen zum Markieren vor. Reiner Vorschlag —
// die AI schreibt/fuegt NICHTS; das Setzen der Marks macht der Editor nach
// Auswahl im Modal. bodyText sollte MARKER-FREIER Plain-Text sein (Editor-
// textContent), damit die Zitate im Text wiederfindbar sind.
export async function generateHighlightSuggestions(args: {
  bodyText: string;
  locale: "de-CH" | "en";
  articleId: string;
}): Promise<HighlightSuggestionsResult> {
  const override = await getPromptOverride("highlight_suggestions");
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

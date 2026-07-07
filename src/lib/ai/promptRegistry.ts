// Registry der editierbaren Strategie-Prompts (Admin-UI /autor/admin/ai-config).
// Bewusst KEIN "use server" — pur, damit Server Actions, die Server-Page und
// der Test importieren koennen.
//
// Prompt-ID-Schluesselraum ist BEWUSST nicht die AiTask-Enum (seo_pipeline
// sind zwei Prompts). Gespeichert in ai_config.task_prompt_overrides
// { promptId: strategyText }. Neue Prompt-IDs brauchen KEINE Migration (jsonb).
//
// Frueher lag das in seoPrompts.ts (SEO_PROMPT_IDS). Mit dem zweiten
// editierbaren Task (highlight_suggestions) hierher generalisiert.

import {
  SEO_KEYWORD_CANDIDATES_STRATEGY,
  SEO_DERIVE_STRATEGY,
  SEO_REVIEW_STRATEGY,
} from "@/lib/ai/seoPrompts";
import { HIGHLIGHT_SUGGESTIONS_STRATEGY } from "@/lib/ai/highlightPrompts";
import { IMAGE_ALT_STRATEGY } from "@/lib/ai/imageAltPrompts";

export const EDITABLE_PROMPT_IDS = [
  "seo_keyword_candidates",
  "seo_derive",
  "seo_review",
  "highlight_suggestions",
  "image_alt",
] as const;

export type EditablePromptId = (typeof EDITABLE_PROMPT_IDS)[number];

// Code-Default-Strategien pro Prompt-ID — von der Admin-UI als Placeholder
// genutzt und der Fallback, wenn kein Override gesetzt ist.
export const EDITABLE_DEFAULT_STRATEGIES: Record<EditablePromptId, string> = {
  seo_keyword_candidates: SEO_KEYWORD_CANDIDATES_STRATEGY,
  seo_derive: SEO_DERIVE_STRATEGY,
  seo_review: SEO_REVIEW_STRATEGY,
  highlight_suggestions: HIGHLIGHT_SUGGESTIONS_STRATEGY,
  image_alt: IMAGE_ALT_STRATEGY,
};

// Saeuberung analog Modell-Overrides: nur bekannte Prompt-IDs, leere/
// whitespace-only Werte fallen raus (Key weg → Resolver nimmt Code-Default).
// getrimmt gespeichert.
export function cleanPromptOverrides(
  raw: Partial<Record<string, unknown>>,
): Partial<Record<EditablePromptId, string>> {
  const out: Partial<Record<EditablePromptId, string>> = {};
  for (const id of EDITABLE_PROMPT_IDS) {
    const v = raw[id];
    if (typeof v === "string" && v.trim() !== "") out[id] = v.trim();
  }
  return out;
}

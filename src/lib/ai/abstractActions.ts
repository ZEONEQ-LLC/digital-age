"use server";

import { callLLM } from "@/lib/ai/client";
import {
  buildAbstractPrompt,
  buildAbstractSystem,
  cleanAbstractText,
} from "@/lib/ai/abstractPrompts";
import type { AiResult } from "@/lib/ai/types";

// Prompt-Bau-Logik (System-Prompt, User-Prompt, Output-Cleanup) lebt seit
// dem Excerpt-Backfill in @/lib/ai/abstractPrompts (nebenwirkungsfrei,
// keine "use server"-Markierung), damit das einmalige Backfill-Skript
// dieselbe Quelle nutzen kann. Diese Action ist nur noch der duenne
// Editor-Pfad: Sprach-/Keyword-Resolution → callLLM (Auth + Rate-Limit +
// Usage-Log) → Cleanup.

export async function generateAbstract(args: {
  title: string;
  bodyText: string;
  locale: "de-CH" | "en";
  focusKeyword?: string | null;
}): Promise<AiResult> {
  const trimmedKeyword = args.focusKeyword?.trim() || null;
  const result = await callLLM({
    system: buildAbstractSystem(args.locale, trimmedKeyword),
    prompt: buildAbstractPrompt(args),
    maxTokens: 300,
    task: "abstract_generate",
  });
  if (result.ok) {
    return { ...result, text: cleanAbstractText(result.text) };
  }
  return result;
}

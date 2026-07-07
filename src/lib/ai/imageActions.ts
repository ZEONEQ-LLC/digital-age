"use server";

import { callLLM } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import {
  buildImageAltSystem,
  buildImageAltPrompt,
  parseImageAlt,
} from "@/lib/ai/imageAltPrompts";
import type { AiErrorKind } from "@/lib/ai/types";

export type ImageAltResult =
  | { ok: true; alt: string }
  | { ok: false; error: AiErrorKind };

// Liest den editierbaren Strategie-Override fuer image_alt aus
// ai_config.task_prompt_overrides. Klein dupliziert (analog highlightActions),
// um kein "use server"-Modul quer zu importieren. Fehler → undefined.
async function getImageAltStrategyOverride(): Promise<string | undefined> {
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
    const v = (raw as Record<string, unknown>)["image_alt"];
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  } catch {
    return undefined;
  }
}

// Generiert einen ALT-Text fuer ein Bild (Vision). imageUrl muss oeffentlich
// ladbar sein (Supabase-Storage-Public-URL) — Anthropic laedt das Bild per
// URL-Source. Reine Generierung; das Setzen des ALT macht der Aufrufer
// (Co-Pilot) und ueberschreibt bestehende ALT-Texte NIE.
export async function generateImageAlt(args: {
  imageUrl: string;
  articleTitle: string;
  locale: "de-CH" | "en";
  articleId: string;
}): Promise<ImageAltResult> {
  const override = await getImageAltStrategyOverride();
  const result = await callLLM({
    system: buildImageAltSystem(args.locale, override),
    prompt: buildImageAltPrompt({ articleTitle: args.articleTitle }),
    images: [{ source: { kind: "url", url: args.imageUrl } }],
    maxTokens: 200,
    task: "image_alt",
  });

  if (!result.ok) {
    return { ok: false, error: result.kind };
  }

  const parsed = parseImageAlt(result.text);
  if (!parsed) {
    console.error(`[image-alt] JSON-Parse failed for article ${args.articleId}`);
    return { ok: false, error: "invalid_json" };
  }
  return { ok: true, alt: parsed.alt };
}

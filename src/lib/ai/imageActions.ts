"use server";

import { callLLM } from "@/lib/ai/client";
import {
  buildImageAltSystem,
  buildImageAltPrompt,
  parseImageAlt,
} from "@/lib/ai/imageAltPrompts";
import type { AiErrorKind } from "@/lib/ai/types";
import { getPromptOverride } from "@/lib/ai/promptOverrides";

export type ImageAltResult =
  | { ok: true; alt: string }
  | { ok: false; error: AiErrorKind };

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
  const override = await getPromptOverride("image_alt");
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

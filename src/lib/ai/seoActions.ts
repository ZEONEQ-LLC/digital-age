"use server";

import { callLLM } from "@/lib/ai/client";
import type { AiResult } from "@/lib/ai/types";

// Task-spezifischer System-Prompt für den SEO-Titel-Vorschlag.
// Der globale Systemprompt aus ai_config wird durch den Config-Resolver
// in callLLM vorangestellt (Concat); hier nur die Task-Instruktion.
const SEO_TITLE_SYSTEM =
  "Generiere einen suchmaschinen-optimierten SEO-Titel für einen Artikel. " +
  "50–60 Zeichen, prägnant, kein Clickbait. " +
  "Schweizer Rechtschreibung (ss statt Eszett). " +
  "Antworte nur mit dem Titel-Text, ohne Anführungszeichen, ohne Erklärung.";

// Body-Kontext wird hart gekappt, damit der Prompt klein bleibt — ein
// kurzer Abschnitt aus dem Artikel reicht für einen SEO-Titel-Vorschlag.
const MAX_BODY_CHARS = 4000;

function buildPrompt(args: { title: string; bodyText: string }): string {
  const title = args.title.trim();
  const body = args.bodyText.trim().slice(0, MAX_BODY_CHARS);
  const parts: string[] = [];
  if (title) {
    parts.push(`Aktueller Arbeitstitel: ${title}`);
  }
  if (body) {
    parts.push(`Artikel-Inhalt (Auszug):\n${body}`);
  }
  if (parts.length === 0) {
    parts.push(
      "Es liegt noch kein Inhalt vor. Schlage einen platzhalterhaften SEO-Titel basierend auf einem generischen Tech-/KI-Thema vor.",
    );
  }
  return parts.join("\n\n");
}

export async function suggestSeoTitle(args: {
  title: string;
  bodyText: string;
}): Promise<AiResult> {
  return callLLM({
    system: SEO_TITLE_SYSTEM,
    prompt: buildPrompt(args),
    maxTokens: 120,
    task: "seo_title",
  });
}

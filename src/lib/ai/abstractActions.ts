"use server";

import { callLLM } from "@/lib/ai/client";
import type { AiResult } from "@/lib/ai/types";

// Locale-Branch im System-Prompt analog buildSeoPipelineSystem. Sprache
// ist harte Vorgabe — die AI soll NICHT raten oder umschalten, das
// `locale`-State im EditorClient ist die Quelle der Wahrheit.
function buildAbstractSystem(locale: "de-CH" | "en"): string {
  return [
    "Du schreibst einen Abstract (Lead-Paragraph) für einen Magazin-Artikel.",
    "",
    `SPRACHE: ${locale}.`,
    locale === "de-CH"
      ? "  - Bei locale = 'de-CH': Schreibe auf Deutsch mit Schweizer Rechtschreibung — IMMER 'ss' statt Eszett (Beispiele: 'massgeblich', 'Strasse', 'gross'). NIEMALS Eszett verwenden."
      : "  - Bei locale = 'en': Schreibe auf Englisch.",
    "",
    "STIL:",
    "  - 2–4 Sätze, präzise zusammenfassend.",
    "  - Magazin-Tonalität: aktiv, konkret, ohne Floskeln.",
    "  - Kein Cliffhanger, kein Clickbait. Keine Fragen an die Leserin.",
    "  - Kein Markdown, keine Anführungszeichen drumherum, keine Aufzählungen.",
    "",
    "OUTPUT: NUR der Abstract-Text, keine Vor- oder Nachrede, kein Markdown-Codeblock.",
  ].join("\n");
}

const MAX_BODY_CHARS = 4000;

function buildAbstractPrompt(args: { title: string; bodyText: string }): string {
  const title = args.title.trim();
  const body = args.bodyText.trim().slice(0, MAX_BODY_CHARS);
  const parts: string[] = [];
  if (title) parts.push(`Artikel-Titel: ${title}`);
  if (body) parts.push(`Artikel-Inhalt:\n${body}`);
  return parts.join("\n\n");
}

// Strippt optionalen Markdown-Codefence falls die AI doch wrappt — analog
// SEO-Pipeline. Plus Anführungszeichen-Wrap, der bei Single-String-Outputs
// häufiger vorkommt.
function cleanAbstractText(raw: string): string {
  let out = raw.trim();
  if (out.startsWith("```")) {
    out = out.replace(/^```(?:[a-z]+)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  if (
    (out.startsWith('"') && out.endsWith('"')) ||
    (out.startsWith("„") && out.endsWith("“")) ||
    (out.startsWith("«") && out.endsWith("»"))
  ) {
    out = out.slice(1, -1).trim();
  }
  return out;
}

export async function generateAbstract(args: {
  title: string;
  bodyText: string;
  locale: "de-CH" | "en";
}): Promise<AiResult> {
  const result = await callLLM({
    system: buildAbstractSystem(args.locale),
    prompt: buildAbstractPrompt(args),
    maxTokens: 300,
    task: "abstract_generate",
  });
  if (result.ok) {
    return { ...result, text: cleanAbstractText(result.text) };
  }
  return result;
}

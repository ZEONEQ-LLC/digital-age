"use server";

import { callLLM } from "@/lib/ai/client";
import type { AiResult } from "@/lib/ai/types";

// ─────────────────────────────────────────────────────────────────────────
// PILOT — wird durch generateSeoFields ersetzt.
// ─────────────────────────────────────────────────────────────────────────
// Bleibt im Code für 1–2 Wochen Produktivbetrieb, damit ein Rollback
// schnell verdrahtbar wäre. Im UI ist die Funktion nicht mehr aufgerufen.
// Eigener Cleanup-PR nach der Bewährungsfrist entfernt sie.
const SEO_TITLE_SYSTEM =
  "Generiere einen suchmaschinen-optimierten SEO-Titel für einen Artikel. " +
  "50–60 Zeichen, prägnant, kein Clickbait. " +
  "Schweizer Rechtschreibung (ss statt Eszett). " +
  "Antworte nur mit dem Titel-Text, ohne Anführungszeichen, ohne Erklärung.";

const MAX_BODY_CHARS = 4000;

function buildTitlePrompt(args: { title: string; bodyText: string }): string {
  const title = args.title.trim();
  const body = args.bodyText.trim().slice(0, MAX_BODY_CHARS);
  const parts: string[] = [];
  if (title) parts.push(`Aktueller Arbeitstitel: ${title}`);
  if (body) parts.push(`Artikel-Inhalt (Auszug):\n${body}`);
  if (parts.length === 0) {
    parts.push(
      "Es liegt noch kein Inhalt vor. Schlage einen platzhalterhaften SEO-Titel basierend auf einem generischen Tech-/KI-Thema vor.",
    );
  }
  return parts.join("\n\n");
}

/**
 * @deprecated — ersetzt durch generateSeoFields (siehe unten). Kann nach
 * 1–2 Wochen Produktivbetrieb entfernt werden. UI-Verdrahtung ist bereits
 * weg, der Export bleibt nur für einen schnellen Rollback verfügbar.
 */
export async function suggestSeoTitle(args: {
  title: string;
  bodyText: string;
}): Promise<AiResult> {
  return callLLM({
    system: SEO_TITLE_SYSTEM,
    prompt: buildTitlePrompt(args),
    maxTokens: 120,
    task: "seo_title",
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Master-Pipeline — ein LLM-Call liefert 5 Felder als JSON.
// ─────────────────────────────────────────────────────────────────────────

export type SeoFields = {
  themenprofil: string;
  focusKeyword: string;
  titleCandidates: [string, string, string];
  metaDescription: string;
  slugSuggestion: string;
};

export type SeoPipelineErrorKind =
  | "config"
  | "auth"
  | "rate_limit"
  | "timeout"
  | "invalid_json"
  | "unknown";

export type SeoPipelineResult =
  | { ok: true; fields: SeoFields }
  | { ok: false; error: SeoPipelineErrorKind };

// Locale-Branch im System-Prompt. Caller-System-Prompt wird vom Config-
// Resolver in callLLM mit dem globalen ai_config.system_prompt prefix-
// concatenated (etabliertes Pattern aus resolveLLMConfig).
function buildSeoPipelineSystem(locale: "de-CH" | "en"): string {
  return [
    "Du bist ein SEO-Experte für Magazin-Artikel. Generiere SEO-Felder für den folgenden Artikel.",
    "",
    `SPRACHE: ${locale}.`,
    locale === "de-CH"
      ? "  - Bei locale = 'de-CH': Generiere alle Texte auf Deutsch mit Schweizer Rechtschreibung — IMMER 'ss' statt Eszett (Beispiele: 'massgeblich', 'Strasse', 'gross'). NIEMALS Eszett verwenden."
      : "  - Bei locale = 'en': Generiere alle Texte auf Englisch.",
    "",
    "OUTPUT: NUR ein JSON-Objekt, keine Vor- oder Nachrede, kein Markdown-Codeblock. Schema:",
    "{",
    '  "themenprofil": string,         // 2-3 Sätze interne Notiz zum Artikel-Fokus',
    '  "focusKeyword": string,         // 2-4 Wörter, Hauptkeyword',
    '  "titleCandidates": [string, string, string],  // 3 Title-Tag-Vorschläge, je 50-60 Zeichen, mit focusKeyword vorn',
    '  "metaDescription": string,      // 140-160 Zeichen, mit focusKeyword, Call-to-Action am Ende',
    '  "slugSuggestion": string        // kebab-case, max 60 Zeichen, mit focusKeyword',
    "}",
  ].join("\n");
}

function buildSeoPipelinePrompt(args: {
  title: string;
  bodyText: string;
}): string {
  const title = args.title.trim();
  const body = args.bodyText.trim().slice(0, MAX_BODY_CHARS);
  const parts: string[] = [];
  if (title) parts.push(`Artikel-Titel: ${title}`);
  if (body) parts.push(`Artikel-Inhalt (Auszug):\n${body}`);
  if (parts.length === 0) {
    parts.push(
      "Es liegt noch kein Inhalt vor. Generiere SEO-Felder für einen generischen Artikel zu KI/Tech.",
    );
  }
  return parts.join("\n\n");
}

// Strippt einen optionalen Markdown-Codefence (```json ... ```) falls das
// Modell ihn entgegen der Anweisung doch produziert. Spart einen Retry
// bei klar erkennbarer Drift, kostet aber nichts wenn der Output sauber ist.
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function parseSeoFields(raw: string): SeoFields | null {
  const text = stripCodeFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;

  const themenprofil = typeof p.themenprofil === "string" ? p.themenprofil : null;
  const focusKeyword = typeof p.focusKeyword === "string" ? p.focusKeyword : null;
  const metaDescription =
    typeof p.metaDescription === "string" ? p.metaDescription : null;
  const slugSuggestion =
    typeof p.slugSuggestion === "string" ? p.slugSuggestion : null;
  const titles = Array.isArray(p.titleCandidates) ? p.titleCandidates : null;

  if (
    themenprofil === null ||
    focusKeyword === null ||
    metaDescription === null ||
    slugSuggestion === null ||
    titles === null ||
    titles.length !== 3 ||
    !titles.every((t): t is string => typeof t === "string")
  ) {
    return null;
  }

  return {
    themenprofil,
    focusKeyword,
    titleCandidates: [titles[0], titles[1], titles[2]],
    metaDescription,
    slugSuggestion,
  };
}

export async function generateSeoFields(args: {
  title: string;
  bodyText: string;
  locale: "de-CH" | "en";
  articleId: string;
}): Promise<SeoPipelineResult> {
  const result = await callLLM({
    system: buildSeoPipelineSystem(args.locale),
    prompt: buildSeoPipelinePrompt({
      title: args.title,
      bodyText: args.bodyText,
    }),
    maxTokens: 600,
    task: "seo_pipeline",
  });

  if (!result.ok) {
    return { ok: false, error: result.kind };
  }

  const fields = parseSeoFields(result.text);
  if (!fields) {
    console.error(
      `[seo-pipeline] JSON-Parse failed for article ${args.articleId}`,
    );
    return { ok: false, error: "invalid_json" };
  }
  return { ok: true, fields };
}

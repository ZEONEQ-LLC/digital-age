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

// Truncation für Raw-Response-Logging. 2000 Zeichen reichen, um typische
// Drift zu sehen (Codeblock-Wrapper, Vorrede, Modell-Markdown), ohne die
// Vercel-Logs zu fluten.
const RAW_LOG_MAX = 2000;
function truncateForLog(s: string): string {
  return s.length > RAW_LOG_MAX ? `${s.slice(0, RAW_LOG_MAX)}…[truncated]` : s;
}

function parseSeoFields(raw: string): SeoFields | null {
  const text = stripCodeFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    console.error(
      "[seo-pipeline] JSON.parse failed:",
      err instanceof Error ? err.message : String(err),
      "| raw:",
      truncateForLog(raw),
    );
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    console.error(
      "[seo-pipeline] Schema validation failed (missing or wrong type): top-level not an object | raw:",
      truncateForLog(raw),
    );
    return null;
  }
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
    console.error(
      "[seo-pipeline] Schema validation failed (missing or wrong type):",
      JSON.stringify({
        themenprofil: typeof p.themenprofil,
        focusKeyword: typeof p.focusKeyword,
        metaDescription: typeof p.metaDescription,
        slugSuggestion: typeof p.slugSuggestion,
        titleCandidatesIsArray: Array.isArray(p.titleCandidates),
        titleCandidatesLength: Array.isArray(p.titleCandidates)
          ? p.titleCandidates.length
          : null,
      }),
      "| raw:",
      truncateForLog(raw),
    );
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

// ─────────────────────────────────────────────────────────────────────────
// Read-only-Analyse — H1 + erster Absatz + Focus-Keyword -> 3–6 Empfehlungen.
// ─────────────────────────────────────────────────────────────────────────

export type SeoReviewSeverity = "critical" | "important" | "nice_to_have";
export type SeoReviewCategory =
  | "keyword"
  | "length"
  | "numbers"
  | "powerwords"
  | "hook"
  | "readability";

export type SeoReviewSuggestion = {
  severity: SeoReviewSeverity;
  category: SeoReviewCategory;
  finding: string;
  recommendation: string;
};

export type SeoReview = {
  overallAssessment: string;
  suggestions: SeoReviewSuggestion[];
};

export type SeoReviewResult =
  | { ok: true; review: SeoReview }
  | { ok: false; error: SeoPipelineErrorKind };

const REVIEW_SEVERITIES: ReadonlySet<SeoReviewSeverity> = new Set([
  "critical",
  "important",
  "nice_to_have",
]);
const REVIEW_CATEGORIES: ReadonlySet<SeoReviewCategory> = new Set([
  "keyword",
  "length",
  "numbers",
  "powerwords",
  "hook",
  "readability",
]);

function buildSeoReviewSystem(locale: "de-CH" | "en"): string {
  return [
    "Du analysierst H1 und ersten Absatz eines Magazin-Artikels nach SEO-Kriterien und gibst konkrete Verbesserungsvorschläge. Du änderst NICHTS, du empfiehlst.",
    "",
    `SPRACHE: ${locale}.`,
    locale === "de-CH"
      ? "  - de-CH: Empfehlungen auf Deutsch mit Schweizer Rechtschreibung — IMMER 'ss' statt Eszett. NIEMALS Eszett."
      : "  - en: Empfehlungen auf Englisch.",
    "",
    "ANALYSE-KRITERIEN (in dieser Reihenfolge prüfen):",
    "  1. Keyword-Platzierung: Steht das Focus-Keyword in H1 und in den ersten 60 Wörtern des Lead?",
    "  2. H1-Länge: 40-70 Zeichen ideal. Zu kurz = unspezifisch, zu lang = wird abgeschnitten.",
    "  3. Zahlen/Statistiken: Enthält H1 oder Lead konkrete Zahlen (Jahr, Prozent, Liste-Anzahl)?",
    "  4. Powerwords: Wörter mit emotionalem Lift wie 'massgeblich', 'entscheidend', 'wichtig', 'neu', 'überraschend', 'erstaunlich' (de) oder 'crucial', 'essential', 'proven', 'breakthrough' (en).",
    "  5. Lead-Hook: Erster Satz greift den Leser? Spannung, Frage, oder konkretes Versprechen?",
    "  6. Lesbarkeit: Sätze unter 25 Wörtern? Aktiv statt passiv?",
    "",
    "OUTPUT: NUR ein JSON-Objekt, kein Markdown-Codeblock, keine Vor- oder Nachrede.",
    "Schema:",
    "{",
    '  "overallAssessment": string,  // 1 Satz Gesamtbewertung (z.B. "Solide Basis, Lead-Hook fehlt")',
    '  "suggestions": [               // 3-6 Einträge, kein Padding',
    "    {",
    '      "severity": "critical" | "important" | "nice_to_have",',
    '      "category": "keyword" | "length" | "numbers" | "powerwords" | "hook" | "readability",',
    '      "finding": string,        // 1 Satz: was beobachtet wurde (z.B. "Focus-Keyword fehlt im ersten Absatz")',
    '      "recommendation": string  // 1-2 Sätze: konkret was zu tun ist',
    "    }",
    "  ]",
    "}",
    "",
    "WORTLIMITS — STRIKT EINHALTEN, KEINE AUSNAHMEN:",
    "  - overallAssessment: maximal 15 Wörter, ein Satz.",
    "  - finding: maximal 20 Wörter pro Item, ein Satz.",
    "  - recommendation: maximal 25 Wörter pro Item, ein bis zwei Sätze.",
    "Überschreite NIEMALS diese Limits. Wenn du nicht alles unterbringst: kürze, statt zu rambeln.",
    "",
    "Keine generischen Tipps. Jede Empfehlung muss sich auf den konkreten Text beziehen, den du gerade siehst.",
    "",
    "BEISPIEL für gewünschte Kürze (en):",
    "{",
    '  "overallAssessment": "Strong opening but weak keyword placement.",',
    '  "suggestions": [',
    "    {",
    '      "severity": "critical",',
    '      "category": "keyword",',
    '      "finding": "Focus-Keyword fehlt im ersten Absatz komplett.",',
    '      "recommendation": "Keyword innerhalb der ersten 30 Wörter natürlich einbauen, idealerweise im ersten Satz."',
    "    }",
    "  ]",
    "}",
  ].join("\n");
}

function buildSeoReviewPrompt(args: {
  title: string;
  firstParagraph: string;
  focusKeyword: string | null;
}): string {
  return [
    `H1: ${args.title.trim()}`,
    "",
    `Erster Absatz: ${args.firstParagraph.trim()}`,
    "",
    `Focus-Keyword: ${args.focusKeyword?.trim() || "nicht gesetzt"}`,
  ].join("\n");
}

function parseSeoReview(raw: string): SeoReview | null {
  const text = stripCodeFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    console.error(
      "[seo-review] JSON.parse failed:",
      err instanceof Error ? err.message : String(err),
      "| raw:",
      truncateForLog(raw),
    );
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    console.error(
      "[seo-review] Schema validation failed (missing or wrong type): top-level not an object | raw:",
      truncateForLog(raw),
    );
    return null;
  }
  const p = parsed as Record<string, unknown>;

  const overall = typeof p.overallAssessment === "string" ? p.overallAssessment : null;
  const sugs = Array.isArray(p.suggestions) ? p.suggestions : null;
  if (overall === null || sugs === null || sugs.length === 0) {
    console.error(
      "[seo-review] Schema validation failed (missing or wrong type):",
      JSON.stringify({
        overallAssessment: typeof p.overallAssessment,
        suggestionsIsArray: Array.isArray(p.suggestions),
        suggestionsLength: Array.isArray(p.suggestions)
          ? p.suggestions.length
          : null,
      }),
      "| raw:",
      truncateForLog(raw),
    );
    return null;
  }

  const validated: SeoReviewSuggestion[] = [];
  for (let i = 0; i < sugs.length; i++) {
    const item = sugs[i];
    if (!item || typeof item !== "object") {
      console.error(
        `[seo-review] Schema validation failed (missing or wrong type): suggestions[${i}] not an object | raw:`,
        truncateForLog(raw),
      );
      return null;
    }
    const s = item as Record<string, unknown>;
    if (
      typeof s.severity !== "string" ||
      typeof s.category !== "string" ||
      typeof s.finding !== "string" ||
      typeof s.recommendation !== "string"
    ) {
      console.error(
        `[seo-review] Schema validation failed (missing or wrong type): suggestions[${i}]`,
        JSON.stringify({
          severity: typeof s.severity,
          category: typeof s.category,
          finding: typeof s.finding,
          recommendation: typeof s.recommendation,
        }),
        "| raw:",
        truncateForLog(raw),
      );
      return null;
    }
    if (
      !REVIEW_SEVERITIES.has(s.severity as SeoReviewSeverity) ||
      !REVIEW_CATEGORIES.has(s.category as SeoReviewCategory)
    ) {
      console.error(
        `[seo-review] Enum check failed: suggestions[${i}]`,
        JSON.stringify({ severity: s.severity, category: s.category }),
        "| raw:",
        truncateForLog(raw),
      );
      return null;
    }
    validated.push({
      severity: s.severity as SeoReviewSeverity,
      category: s.category as SeoReviewCategory,
      finding: s.finding,
      recommendation: s.recommendation,
    });
  }

  return { overallAssessment: overall, suggestions: validated };
}

export async function analyzeSeoEntry(args: {
  title: string;
  firstParagraph: string;
  focusKeyword: string | null;
  locale: "de-CH" | "en";
  articleId: string;
}): Promise<SeoReviewResult> {
  const result = await callLLM({
    system: buildSeoReviewSystem(args.locale),
    prompt: buildSeoReviewPrompt({
      title: args.title,
      firstParagraph: args.firstParagraph,
      focusKeyword: args.focusKeyword,
    }),
    maxTokens: 1200,
    task: "seo_review",
  });

  if (!result.ok) {
    return { ok: false, error: result.kind };
  }

  const review = parseSeoReview(result.text);
  if (!review) {
    console.error(
      `[seo-review] JSON-Parse failed for article ${args.articleId}`,
    );
    return { ok: false, error: "invalid_json" };
  }
  return { ok: true, review };
}

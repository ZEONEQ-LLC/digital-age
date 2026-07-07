"use server";

import { callLLM } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import {
  buildSeoKeywordCandidatesSystem,
  buildSeoKeywordCandidatesPrompt,
  buildSeoDeriveSystem,
  buildSeoDerivePrompt,
  buildSeoReviewSystem,
  buildSeoReviewPrompt,
} from "@/lib/ai/seoPrompts";

// Liest die editierbaren Strategie-Overrides aus ai_config.task_prompt_overrides
// (Muster wie news_ticker generation_prompt: DB-Wert + Code-Fallback). Nur
// nicht-leere String-Werte werden zurueckgegeben; alles andere → Key fehlt,
// der Builder faellt auf den Code-Default. Bei jedem Fehler (Tabelle/Spalte
// fehlt, RLS, 0 Rows) → {} (graceful, Code-Default greift). Kein Cache —
// frisch pro Call, konsistent mit resolveLLMConfig.
async function getTaskPromptOverrides(): Promise<Record<string, string>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_config")
      .select("task_prompt_overrides")
      .eq("id", "global")
      .single();
    if (error || !data) return {};
    const raw = (data as { task_prompt_overrides?: unknown })
      .task_prompt_overrides;
    if (!raw || typeof raw !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim() !== "") out[k] = v;
    }
    return out;
  } catch (err) {
    console.warn(
      "[seo] task_prompt_overrides read failed, using code defaults:",
      err instanceof Error ? err.message : String(err),
    );
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Zweistufige SEO-Pipeline.
//   Stufe 1: generateSeoKeywordCandidates -> 3-5 Focus-Keyword-Kandidaten.
//   Stufe 2: generateSeoFromKeyword       -> restliche Felder aus dem
//            gewaehlten Keyword abgeleitet.
// Beide Stufen laufen unter demselben Task `seo_pipeline` — EIN Modell-
// Override im Admin-UI steuert die ganze Pipeline (kein neuer Task noetig).
//
// generateSeoFields (Kompat) komponiert beide Stufen zu einem SeoFields und
// bedient die 4 Einzel-Regenerate-Buttons in EditorSeoPanel, die
// unveraendert bleiben (Kosten: 2 Calls statt 1 pro Einzel-Regenerate —
// die technisch zwingende Folge der Entkopplung, siehe PR-Text).
// ─────────────────────────────────────────────────────────────────────────

export type SeoFields = {
  themenprofil: string;
  focusKeyword: string;
  titleCandidates: [string, string, string];
  metaDescription: string;
  slugSuggestion: string;
  semanticTerms: string[];
};

// Wie SeoFields, aber ohne focusKeyword — das ist in Stufe 2 die Vorgabe,
// nicht das Ergebnis.
export type SeoDerivedFields = Omit<SeoFields, "focusKeyword">;

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

export type SeoKeywordCandidatesResult =
  | { ok: true; candidates: string[] }
  | { ok: false; error: SeoPipelineErrorKind };

export type SeoDeriveResult =
  | { ok: true; fields: SeoDerivedFields }
  | { ok: false; error: SeoPipelineErrorKind };

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

function parseKeywordCandidates(raw: string): string[] | null {
  const text = stripCodeFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    console.error(
      "[seo-keywords] JSON.parse failed:",
      err instanceof Error ? err.message : String(err),
      "| raw:",
      truncateForLog(raw),
    );
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    console.error(
      "[seo-keywords] Schema validation failed: top-level not an object | raw:",
      truncateForLog(raw),
    );
    return null;
  }
  const p = parsed as Record<string, unknown>;
  if (!Array.isArray(p.candidates)) {
    console.error(
      "[seo-keywords] Schema validation failed: candidates not an array | raw:",
      truncateForLog(raw),
    );
    return null;
  }
  // Nicht-Strings, leere Strings, Duplikate (case-insensitive) filtern.
  // Auf max 5 begrenzen (Prompt-Kontrakt 3-5).
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of p.candidates) {
    if (typeof c !== "string") continue;
    const trimmed = c.trim();
    if (trimmed === "") continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= 5) break;
  }
  if (out.length === 0) {
    console.error(
      "[seo-keywords] Schema validation failed: no usable candidate strings | raw:",
      truncateForLog(raw),
    );
    return null;
  }
  return out;
}

// Wie das frühere parseSeoFields, aber OHNE focusKeyword — das ist in
// Stufe 2 die Vorgabe, nicht das Ergebnis.
function parseSeoDerived(raw: string): SeoDerivedFields | null {
  const text = stripCodeFence(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    console.error(
      "[seo-derive] JSON.parse failed:",
      err instanceof Error ? err.message : String(err),
      "| raw:",
      truncateForLog(raw),
    );
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    console.error(
      "[seo-derive] Schema validation failed (missing or wrong type): top-level not an object | raw:",
      truncateForLog(raw),
    );
    return null;
  }
  const p = parsed as Record<string, unknown>;

  const themenprofil = typeof p.themenprofil === "string" ? p.themenprofil : null;
  const metaDescription =
    typeof p.metaDescription === "string" ? p.metaDescription : null;
  const slugSuggestion =
    typeof p.slugSuggestion === "string" ? p.slugSuggestion : null;
  const titles = Array.isArray(p.titleCandidates) ? p.titleCandidates : null;

  if (
    themenprofil === null ||
    metaDescription === null ||
    slugSuggestion === null ||
    titles === null ||
    titles.length !== 3 ||
    !titles.every((t): t is string => typeof t === "string")
  ) {
    console.error(
      "[seo-derive] Schema validation failed (missing or wrong type):",
      JSON.stringify({
        themenprofil: typeof p.themenprofil,
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

  // semanticTerms: defensiv (Verhalten wie zuvor). Fehlt es oder kein Array,
  // wird ein leeres Array zurückgegeben — kein Schema-Fehler. Filter raus:
  // Nicht-Strings, leere Strings, Duplikate (case-insensitive).
  const semanticTerms: string[] = [];
  if (Array.isArray(p.semanticTerms)) {
    const seen = new Set<string>();
    for (const t of p.semanticTerms) {
      if (typeof t !== "string") continue;
      const trimmed = t.trim();
      if (trimmed === "") continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      semanticTerms.push(trimmed);
    }
  }

  return {
    themenprofil,
    titleCandidates: [titles[0], titles[1], titles[2]],
    metaDescription,
    slugSuggestion,
    semanticTerms,
  };
}

// Stufe 1: 3-5 Focus-Keyword-Kandidaten. `rejectedKeywords` sind bereits
// verworfene Vorschläge (kumuliert im Panel), die als Negativ-Liste in den
// Prompt gehen, damit der nächste Lauf andere Blickwinkel wählt.
export async function generateSeoKeywordCandidates(args: {
  title: string;
  bodyText: string;
  locale: "de-CH" | "en";
  articleId: string;
  rejectedKeywords: string[];
}): Promise<SeoKeywordCandidatesResult> {
  const overrides = await getTaskPromptOverrides();
  const result = await callLLM({
    system: buildSeoKeywordCandidatesSystem(
      args.locale,
      overrides["seo_keyword_candidates"],
    ),
    prompt: buildSeoKeywordCandidatesPrompt({
      title: args.title,
      bodyText: args.bodyText,
      rejectedKeywords: args.rejectedKeywords,
    }),
    // Output-Budget: 3-5 kurze Strings + JSON-Hülle. 300 gibt Puffer.
    maxTokens: 300,
    task: "seo_pipeline",
  });

  if (!result.ok) {
    return { ok: false, error: result.kind };
  }

  const candidates = parseKeywordCandidates(result.text);
  if (!candidates) {
    console.error(
      `[seo-keywords] JSON-Parse failed for article ${args.articleId}`,
    );
    return { ok: false, error: "invalid_json" };
  }
  return { ok: true, candidates };
}

// Stufe 2: leitet die restlichen Felder aus dem GEWÄHLTEN Keyword ab.
export async function generateSeoFromKeyword(args: {
  title: string;
  bodyText: string;
  chosenKeyword: string;
  locale: "de-CH" | "en";
  articleId: string;
}): Promise<SeoDeriveResult> {
  const overrides = await getTaskPromptOverrides();
  const result = await callLLM({
    system: buildSeoDeriveSystem(args.locale, overrides["seo_derive"]),
    prompt: buildSeoDerivePrompt({
      title: args.title,
      bodyText: args.bodyText,
      chosenKeyword: args.chosenKeyword,
    }),
    // Output-Budget wie zuvor für die abgeleiteten Felder (~800).
    maxTokens: 800,
    task: "seo_pipeline",
  });

  if (!result.ok) {
    return { ok: false, error: result.kind };
  }

  const fields = parseSeoDerived(result.text);
  if (!fields) {
    console.error(
      `[seo-derive] JSON-Parse failed for article ${args.articleId}`,
    );
    return { ok: false, error: "invalid_json" };
  }
  return { ok: true, fields };
}

// Kompat-Pfad für die 4 Einzel-Regenerate-Buttons in EditorSeoPanel: liefert
// wie früher ein vollständiges SeoFields. Komponiert die zwei Stufen —
// Stufe 1 (erster Kandidat = Keyword) + Stufe 2 (Ableitung). Bewusst KEINE
// Negativ-Liste (Einzel-Regenerate braucht keine). Zwei LLM-Calls statt
// einem; die Buttons selbst bleiben unverändert (siehe PR-Text).
export async function generateSeoFields(args: {
  title: string;
  bodyText: string;
  locale: "de-CH" | "en";
  articleId: string;
}): Promise<SeoPipelineResult> {
  const candidates = await generateSeoKeywordCandidates({
    title: args.title,
    bodyText: args.bodyText,
    locale: args.locale,
    articleId: args.articleId,
    rejectedKeywords: [],
  });
  if (!candidates.ok) {
    return { ok: false, error: candidates.error };
  }
  const focusKeyword = candidates.candidates[0];

  const derived = await generateSeoFromKeyword({
    title: args.title,
    bodyText: args.bodyText,
    chosenKeyword: focusKeyword,
    locale: args.locale,
    articleId: args.articleId,
  });
  if (!derived.ok) {
    return { ok: false, error: derived.error };
  }

  return { ok: true, fields: { focusKeyword, ...derived.fields } };
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
  headingsLevel2: string[];
  focusKeyword: string | null;
  secondaryKeywords: string[];
  locale: "de-CH" | "en";
  articleId: string;
}): Promise<SeoReviewResult> {
  const overrides = await getTaskPromptOverrides();
  const result = await callLLM({
    system: buildSeoReviewSystem(args.locale, overrides["seo_review"]),
    prompt: buildSeoReviewPrompt({
      title: args.title,
      firstParagraph: args.firstParagraph,
      headingsLevel2: args.headingsLevel2,
      focusKeyword: args.focusKeyword,
      secondaryKeywords: args.secondaryKeywords,
    }),
    // Output-Budget: 3-6 suggestions × (finding 20 + recommendation 45)
    // Wörter + overallAssessment = ca. 400 Wörter Maximum. Bei DE-Output
    // sind das ~900 Tokens; 1500 gibt Puffer für ausformulierte
    // Beispiel-Sätze in den recommendations (Fix 3, PR #119).
    maxTokens: 1500,
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

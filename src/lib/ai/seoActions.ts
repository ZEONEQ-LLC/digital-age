"use server";

import { callLLM } from "@/lib/ai/client";

// Body-Cap für den Pipeline-Input. 12000 Zeichen ≈ 1800 dt. Wörter und
// decken die längsten DB-Artikel weitgehend ab (vorheriger 4000-Cap zeigte
// dem Modell bei langen Artikeln nur ~25 % des Texts — Keyword-Wahl lief
// dann auf der Intro statt dem Artikel-Kern, was die strategische
// Keyword-Auswahl unzuverlässig machte). Token-Aufschlag pro Call gegenüber
// 4000 ist vernachlässigbar (~0.2 ¢ Haiku-Input).
const MAX_BODY_CHARS = 12000;

// ─────────────────────────────────────────────────────────────────────────
// Master-Pipeline — ein LLM-Call liefert 5 Felder als JSON.
// ─────────────────────────────────────────────────────────────────────────

export type SeoFields = {
  themenprofil: string;
  focusKeyword: string;
  titleCandidates: [string, string, string];
  metaDescription: string;
  slugSuggestion: string;
  semanticTerms: string[];
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
// Task-Prompt für die SEO-Pipeline. Brand, Rolle ("SEO-Experte"),
// Schweizer Rechtschreibung und Output-Disziplin sind bereits im
// globalen Systemprompt (ai_config.system_prompt) abgedeckt — dieser
// Task-Prompt setzt direkt auf der SEO-Strategie auf und dupliziert das
// nicht. Locale steuert nur noch die Output-Sprache.
function buildSeoPipelineSystem(locale: "de-CH" | "en"): string {
  return [
    "Aufgabe: Generiere SEO-Felder für einen Magazin-Artikel.",
    "",
    `SPRACHE des Outputs: ${
      locale === "en" ? "Englisch" : "Deutsch (Schweizer Rechtschreibung)"
    }.`,
    "",
    "STRATEGIE — in dieser Reihenfolge anwenden:",
    "",
    "1. Themenprofil zuerst.",
    "   Bestimme zuerst das Kern-Thema des Artikels (2–3 Sätze, interne Notiz).",
    "   Alle folgenden Felder müssen konsistent zu diesem Themenprofil sein.",
    "",
    "2. Focus-Keyword wählen.",
    "   Wähle das Keyword, das die Suchintention der Zielleser am genauesten",
    "   trifft — NICHT das häufigste Wort im Text. Bevorzuge spezifische",
    "   Mid-Tail-Phrasen (2–4 Wörter) gegenüber generischen Head-Terms.",
    "   Das Keyword muss eine realistische Such-Anfrage sein, für die diese",
    "   Seite ranken kann.",
    "",
    "3. Title-Kandidaten.",
    "   3 Vorschläge, je 50–60 Zeichen. focusKeyword in den ersten 30 Zeichen",
    "   jedes Kandidaten. Aktive Sprache; optional eine Zahl oder ein",
    "   konkretes Versprechen, kein Clickbait.",
    "",
    "4. Meta-Description.",
    "   150–160 Zeichen. focusKeyword in den ersten 60 Zeichen. Konkretes",
    "   Versprechen statt Werbe-Adjektive. CTA am Ende.",
    "",
    "5. Slug.",
    "   3–5 Wörter ideal, max 60 Zeichen, kebab-case, Stopwörter weglassen,",
    "   focusKeyword drin.",
    "",
    "6. Semantische Begriffe.",
    "   Generiere zusätzlich 8–12 semantische Begriffe — eng verwandt zum",
    "   focusKeyword PLUS thematische Variationen, die im Body-Text natürlich",
    "   vorkommen sollten. KEINE blossen Synonyme des focusKeywords, sondern",
    "   Begriffe, die Sub-Themen, verwandte Konzepte und relevante",
    "   Suchanfragen-Variationen abdecken. Jeder Begriff 1–4 Wörter, kein",
    "   Stuffing. Beispiel-Stil für focusKeyword 'KI im Banking': 'Compliance-",
    "   Automation', 'Regulatorische Anforderungen', 'KI-gestützte",
    "   Risikoanalyse', 'Banking-Use-Cases' — nicht 'Künstliche Intelligenz",
    "   im Bankwesen' (reines Synonym).",
    "",
    "OUTPUT: NUR ein JSON-Objekt, Schema:",
    "{",
    '  "themenprofil": string,         // 2-3 Sätze interne Notiz zum Artikel-Fokus',
    '  "focusKeyword": string,         // 2-4 Wörter, Hauptkeyword',
    '  "titleCandidates": [string, string, string],  // 3 Title-Tag-Vorschläge, je 50-60 Zeichen, focusKeyword in den ersten 30 Zeichen',
    '  "metaDescription": string,      // 150-160 Zeichen, focusKeyword in den ersten 60 Zeichen, CTA am Ende',
    '  "slugSuggestion": string,       // kebab-case, 3-5 Wörter, max 60 Zeichen, mit focusKeyword',
    '  "semanticTerms": string[]       // 8-12 semantische Begriffe (1-4 Wörter), keine Synonyme des focusKeywords',
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

  // semanticTerms: defensiv. Fehlt es im Output oder ist es kein Array,
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
    focusKeyword,
    titleCandidates: [titles[0], titles[1], titles[2]],
    metaDescription,
    slugSuggestion,
    semanticTerms,
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
    // Output-Budget: ursprünglich 600 für 5 Felder; semanticTerms (8-12
    // Strings à 1-4 Wörter) addiert ~80-150 Tokens. 800 gibt Puffer.
    maxTokens: 800,
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

// Task-Prompt für die Read-only-SEO-Analyse. Brand, Schweizer
// Rechtschreibung, Output-Disziplin sind im globalen Systemprompt
// abgedeckt — hier nur SEO-Strategie + Schema.
function buildSeoReviewSystem(locale: "de-CH" | "en"): string {
  return [
    "Aufgabe: Analysiere H1, ersten Absatz und H2-Überschriften eines Magazin-",
    "Artikels nach SEO-Kriterien und gib konkrete Verbesserungsvorschläge.",
    "Du empfiehlst nur — du änderst NICHTS am Body und schlägst NIEMALS vor,",
    "den Text automatisch umzuschreiben. Empfehlungen formulieren, was der",
    "Redakteur manuell anpassen kann.",
    "",
    `SPRACHE der Empfehlungen: ${
      locale === "en" ? "Englisch" : "Deutsch (Schweizer Rechtschreibung)"
    }.`,
    "",
    "ANALYSE-KRITERIEN (in dieser Reihenfolge prüfen):",
    "  1. Keyword-Platzierung im Lead: Steht das Focus-Keyword in H1 und in",
    "     den ersten 100 Wörtern des Lead-Absatzes? Ideal im ersten Satz,",
    "     aber NATÜRLICH integriert — KEINE Empfehlung, dass der Absatz mit",
    "     dem Keyword beginnen MUSS (führt zu unnatürlichen Anfängen).",
    "  2. Keyword in H2: Kommt das Focus-Keyword in mindestens EINER H2-",
    "     Überschrift vor? Anti-Pattern: das Keyword in JEDER H2 (heading",
    "     stuffing) — wenn das im Text zu sehen ist, das als Risiko",
    "     anmerken. Ideal: 1–2 H2-Mentions.",
    "  3. Sekundär-Keywords im Body: Sind die gesetzten Sekundär-Keywords",
    "     im sichtbaren Text (Lead, H2s) erkennbar? Ideal: mindestens 2-3",
    "     der gesetzten Sekundär-Keywords kommen erkennbar vor (auch in",
    "     Variationen — keine exakte Übereinstimmung verlangen). Wenn keine",
    "     Sekundär-Keywords gesetzt sind, diesen Punkt überspringen.",
    "     Anti-Pattern: alle Sekundär-Keywords in den Lead stopfen.",
    "  4. H1-Länge: 40-70 Zeichen ideal. Zu kurz = unspezifisch, zu lang =",
    "     wird in SERP abgeschnitten.",
    "  5. Zahlen/Statistiken: Enthält H1 oder Lead konkrete Zahlen (Jahr,",
    "     Prozent, Liste-Anzahl)?",
    "  6. Powerwords: Wörter mit emotionalem Lift wie 'massgeblich',",
    "     'entscheidend', 'wichtig', 'neu', 'überraschend', 'erstaunlich'",
    "     (de) oder 'crucial', 'essential', 'proven', 'breakthrough' (en).",
    "  7. Lead-Hook: Erster Satz greift den Leser? Spannung, Frage, oder",
    "     konkretes Versprechen?",
    "  8. Lesbarkeit: Sätze unter 25 Wörtern? Aktiv statt passiv?",
    "",
    "OUTPUT: NUR ein JSON-Objekt. Schema:",
    "{",
    '  "overallAssessment": string,  // 1 Satz Gesamtbewertung (z.B. "Solide Basis, Lead-Hook fehlt")',
    '  "suggestions": [               // 3-6 Einträge, kein Padding',
    "    {",
    '      "severity": "critical" | "important" | "nice_to_have",',
    '      "category": "keyword" | "length" | "numbers" | "powerwords" | "hook" | "readability",',
    '      "finding": string,        // 1 Satz: was beobachtet wurde (z.B. "Focus-Keyword fehlt im ersten Absatz")',
    '      "recommendation": string  // Konkreter Vorschlag — siehe Regel unten',
    "    }",
    "  ]",
    "}",
    "",
    "REGEL für jede recommendation — STRIKT EINHALTEN:",
    "Jede recommendation MUSS einen KONKRETEN, sofort umsetzbaren Vorschlag",
    "enthalten, der auf den TATSÄCHLICHEN Inhalt dieses Artikels zugeschnitten",
    "ist. Was 'konkret' heisst, je nach Kategorie:",
    "  - keyword / hook / readability:",
    "      Liefere einen VOLLSTÄNDIG AUSFORMULIERTEN alternativen Satz oder",
    "      H1/H2-Vorschlag — keinen Platzhalter wie 'baue das Keyword ein'.",
    "      Beispiel akzeptabel: \"Reformuliere den ersten Satz zu: 'KI im",
    "      Banking verkürzt Compliance-Reviews von Stunden auf Minuten.'\"",
    "      Beispiel NICHT akzeptabel: 'Baue das Keyword im ersten Absatz ein.'",
    "  - length:",
    "      Nenne die Ziel-Länge UND liefere einen konkret gekürzten/",
    "      erweiterten Alternativ-Text. Beispiel: \"Kürze auf 60 Zeichen,",
    "      z.B. 'How AI Cuts Banking Compliance Reviews from Hours to Minutes'.\"",
    "  - numbers:",
    "      Wenn der Artikel-Text eine konkrete Zahl/Statistik enthält",
    "      (Prozent, Jahr, Anzahl), nenne diese SPEZIFISCHE Zahl im Vorschlag,",
    "      keine generische 'z.B. 5 Ways'. Wenn keine Zahl im sichtbaren Text",
    "      vorhanden ist: schreibe das explizit ('Lead enthält keine konkrete",
    "      Zahl — bei Recherche eine ergänzen, sonst diesen Punkt überspringen').",
    "  - powerwords:",
    "      Nenne 1-2 konkrete Powerwords, die in DIESEN Text passen würden,",
    "      und zeige den Einbau-Ort.",
    "",
    "ANTI-PATTERNS — NIEMALS produzieren:",
    "  - 'z.B.' ohne konkretes Beispiel danach",
    "  - Generische Tipps ohne Bezug auf den Artikel-Text",
    "  - Platzhalter wie 'einen Powerword einbauen' ohne den Powerword zu nennen",
    "",
    "WORTLIMITS:",
    "  - overallAssessment: maximal 15 Wörter, ein Satz.",
    "  - finding: maximal 20 Wörter pro Item, ein Satz.",
    "  - recommendation: 15-45 Wörter pro Item, 1-3 Sätze. Genug Raum für den",
    "    konkreten Vorschlag inklusive Beispiel-Text, aber kein Rambling.",
    "",
    "BEISPIEL für den gewünschten Stil (en):",
    "{",
    '  "overallAssessment": "Strong opening but weak keyword placement.",',
    '  "suggestions": [',
    "    {",
    '      "severity": "critical",',
    '      "category": "keyword",',
    '      "finding": "Focus-Keyword fehlt im ersten Absatz komplett.",',
    '      "recommendation": "Reformuliere den ersten Satz zu: \'AI Co-Pilots in Banking verkürzen Compliance-Reviews von Stunden auf Minuten — und entlasten Berater von Routine-Recherche.\'"',
    "    },",
    "    {",
    '      "severity": "important",',
    '      "category": "length",',
    '      "finding": "H1 ist mit 82 Zeichen zu lang, wird in SERP abgeschnitten.",',
    '      "recommendation": "Kürze auf 58 Zeichen, z.B. \'AI Co-Pilots in Banking: Less Routine, More Insight\'."',
    "    }",
    "  ]",
    "}",
  ].join("\n");
}

function buildSeoReviewPrompt(args: {
  title: string;
  firstParagraph: string;
  headingsLevel2: string[];
  focusKeyword: string | null;
  secondaryKeywords: string[];
}): string {
  const h2List =
    args.headingsLevel2.length === 0
      ? "(keine H2-Überschriften im Artikel)"
      : args.headingsLevel2.map((h, i) => `  ${i + 1}. ${h}`).join("\n");
  const secList =
    args.secondaryKeywords.length === 0
      ? "(keine Sekundär-Keywords gesetzt)"
      : args.secondaryKeywords.map((k, i) => `  ${i + 1}. ${k}`).join("\n");
  return [
    `H1: ${args.title.trim()}`,
    "",
    `Erster Absatz: ${args.firstParagraph.trim()}`,
    "",
    "H2-Überschriften:",
    h2List,
    "",
    `Focus-Keyword: ${args.focusKeyword?.trim() || "nicht gesetzt"}`,
    "",
    "Sekundär-Keywords:",
    secList,
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
  headingsLevel2: string[];
  focusKeyword: string | null;
  secondaryKeywords: string[];
  locale: "de-CH" | "en";
  articleId: string;
}): Promise<SeoReviewResult> {
  const result = await callLLM({
    system: buildSeoReviewSystem(args.locale),
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

// Pure Prompt-Bau-Helper fuer die SEO-Prompts. Bewusst KEIN "use server" —
// nebenwirkungsfrei, damit Server Actions (seoActions.ts / configActions.ts),
// die Server-Page (ai-config/page.tsx) UND der manuelle Test importieren
// koennen. Gleiches Muster wie abstractPrompts.ts: eine Source-of-Truth.
//
// DREI-TEILER pro System-Prompt (PR 2 — Prompt-Verwaltung):
//   (1) localeLine(locale)  — Sprach-Zeile, bleibt IM CODE (dynamisch)
//   (2) Strategie-Body      — fachliche SEO-Anweisung, SPRACHNEUTRAL,
//                             im Admin-UI editierbar (DB-Override) mit
//                             Code-Default als Fallback
//   (3) *_SCHEMA            — JSON-Schema/Output-Format, bleibt IM CODE
// build*System(locale, override?) konkateniert (1) + (2) + (3):
//   override?.trim() || CODE_STRATEGY   (Muster wie news_ticker generation_prompt).
// Das Schema bleibt die technische Vertragsgrundlage fuers JSON-Parsing und
// steht bewusst am ENDE (Last-Word-Position gegen Format-Drift).

// Body-Cap fuer den Pipeline-Input. 12000 Zeichen ≈ 1800 dt. Woerter und
// decken die laengsten DB-Artikel weitgehend ab (frueherer 4000-Cap zeigte
// dem Modell bei langen Artikeln nur ~25 % des Texts). Token-Aufschlag pro
// Call gegenueber 4000 ist vernachlaessigbar (~0.2 ¢ Haiku-Input).
export const MAX_BODY_CHARS = 12000;

type Locale = "de-CH" | "en";

// Sprach-Zeile als Code-Baustein (Teil 1 des Drei-Teilers). `subject`
// bewahrt den urspruenglichen Wortlaut je Prompt ("des Outputs" bzw. "der
// Empfehlungen").
function localeLine(locale: Locale, subject: string): string {
  return `SPRACHE ${subject}: ${
    locale === "en" ? "Englisch" : "Deutsch (Schweizer Rechtschreibung)"
  }.`;
}

// Setzt den Drei-Teiler zusammen: localeLine + (Override oder Code-Default)
// + Schema. Leerer/whitespace-only Override faellt auf den Code-Default.
function composeSystem(
  localeText: string,
  defaultStrategy: string,
  schema: string,
  strategyOverride?: string,
): string {
  const strategy = strategyOverride?.trim() || defaultStrategy;
  return [localeText, strategy, schema].join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────
// Stufe 1 — Focus-Keyword-Kandidaten.
// Brand, Rolle ("SEO-Experte"), Schweizer Rechtschreibung und Output-
// Disziplin sind bereits im globalen Systemprompt (ai_config.system_prompt)
// abgedeckt — dieser Task-Prompt setzt direkt auf der SEO-Strategie auf.
// ─────────────────────────────────────────────────────────────────────────

export const SEO_KEYWORD_CANDIDATES_STRATEGY = [
  "Aufgabe: Schlage Focus-Keyword-Kandidaten fuer einen Magazin-Artikel vor.",
  "",
  "STRATEGIE:",
  "1. Bestimme zuerst das Kern-Thema des Artikels (interne Ueberlegung).",
  "2. Leite daraus 3-5 KANDIDATEN fuer das Focus-Keyword ab. Jeder Kandidat:",
  "   - trifft die Suchintention der Zielleser am genauesten, NICHT das",
  "     haeufigste Wort im Text;",
  "   - bevorzugt spezifische Mid-Tail-Phrasen (2-4 Woerter) gegenueber",
  "     generischen Head-Terms;",
  "   - ist eine realistische Such-Anfrage, fuer die diese Seite ranken kann.",
  "3. Die Kandidaten sollen sich klar UNTERSCHEIDEN — verschiedene Blickwinkel",
  "   bzw. Suchintentionen, nicht blosse Umformulierungen desselben Begriffs.",
].join("\n");

export const SEO_KEYWORD_CANDIDATES_SCHEMA = [
  "OUTPUT: NUR ein JSON-Objekt, Schema:",
  "{",
  '  "candidates": string[]   // 3-5 Focus-Keyword-Kandidaten, je 2-4 Woerter',
  "}",
].join("\n");

export function buildSeoKeywordCandidatesSystem(
  locale: Locale,
  strategyOverride?: string,
): string {
  return composeSystem(
    localeLine(locale, "des Outputs"),
    SEO_KEYWORD_CANDIDATES_STRATEGY,
    SEO_KEYWORD_CANDIDATES_SCHEMA,
    strategyOverride,
  );
}

export function buildSeoKeywordCandidatesPrompt(args: {
  title: string;
  bodyText: string;
  rejectedKeywords: string[];
}): string {
  const title = args.title.trim();
  const body = args.bodyText.trim().slice(0, MAX_BODY_CHARS);
  const parts: string[] = [];
  if (title) parts.push(`Artikel-Titel: ${title}`);
  if (body) parts.push(`Artikel-Inhalt (Auszug):\n${body}`);
  if (parts.length === 0) {
    parts.push(
      "Es liegt noch kein Inhalt vor. Schlage Keywords fuer einen generischen Artikel zu KI/Tech vor.",
    );
  }
  // Negativ-Liste: verworfene Kandidaten aus vorherigen Runden. Wird als
  // Ausschluss mitgegeben, damit der naechste Lauf andere Blickwinkel waehlt.
  const rejected = args.rejectedKeywords
    .map((k) => k.trim())
    .filter((k) => k !== "");
  if (rejected.length > 0) {
    parts.push(
      [
        "NICHT erneut vorschlagen (bereits verworfen) — waehle andere Blickwinkel:",
        ...rejected.map((k) => `  - ${k}`),
      ].join("\n"),
    );
  }
  return parts.join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────
// Stufe 2 — Ableitung aus dem GEWAEHLTEN Focus-Keyword. Das Keyword ist
// vorgegeben (aus Stufe 1 gewaehlt) und wird NICHT neu bestimmt.
// ─────────────────────────────────────────────────────────────────────────

export const SEO_DERIVE_STRATEGY = [
  "Aufgabe: Leite SEO-Felder fuer einen Magazin-Artikel aus einem VORGEGEBENEN",
  "Focus-Keyword ab. Das Keyword ist bereits gewaehlt — waehle KEIN neues und",
  "aendere es NICHT.",
  "",
  "STRATEGIE — alle Felder konsistent zum vorgegebenen Focus-Keyword:",
  "",
  "1. Themenprofil (interne Notiz, 2-3 Saetze): Kern-Thema des Artikels im",
  "   Licht des Focus-Keywords.",
  "2. Title-Kandidaten: 3 Vorschlaege, je 50-60 Zeichen, Focus-Keyword in den",
  "   ersten 30 Zeichen jedes Kandidaten. Aktive Sprache; optional eine Zahl",
  "   oder ein konkretes Versprechen, kein Clickbait.",
  "3. Meta-Description: 150-160 Zeichen, Focus-Keyword in den ersten 60",
  "   Zeichen, konkretes Versprechen statt Werbe-Adjektive, CTA am Ende.",
  "4. Slug: 3-5 Woerter ideal, max 60 Zeichen, kebab-case, Stopwoerter",
  "   weglassen, Focus-Keyword drin.",
  "5. Semantische Begriffe: 8-12 Begriffe, eng verwandt zum Focus-Keyword PLUS",
  "   thematische Variationen, die im Body-Text natuerlich vorkommen sollten.",
  "   KEINE blossen Synonyme des Focus-Keywords, sondern Sub-Themen, verwandte",
  "   Konzepte und relevante Suchanfragen-Variationen. Jeder Begriff 1-4",
  "   Woerter, kein Stuffing. Beispiel-Stil fuer 'KI im Banking':",
  "   'Compliance-Automation', 'Regulatorische Anforderungen', 'KI-gestuetzte",
  "   Risikoanalyse', 'Banking-Use-Cases' — nicht 'Kuenstliche Intelligenz im",
  "   Bankwesen' (reines Synonym).",
].join("\n");

export const SEO_DERIVE_SCHEMA = [
  "OUTPUT: NUR ein JSON-Objekt, Schema:",
  "{",
  '  "themenprofil": string,        // 2-3 Saetze interne Notiz zum Artikel-Fokus',
  '  "titleCandidates": [string, string, string],  // 3 Title-Vorschlaege, je 50-60 Zeichen, Keyword in den ersten 30 Zeichen',
  '  "metaDescription": string,     // 150-160 Zeichen, Keyword in den ersten 60 Zeichen, CTA am Ende',
  '  "slugSuggestion": string,      // kebab-case, 3-5 Woerter, max 60 Zeichen, mit Keyword',
  '  "semanticTerms": string[]      // 8-12 semantische Begriffe (1-4 Woerter), keine Synonyme des Keywords',
  "}",
].join("\n");

export function buildSeoDeriveSystem(
  locale: Locale,
  strategyOverride?: string,
): string {
  return composeSystem(
    localeLine(locale, "des Outputs"),
    SEO_DERIVE_STRATEGY,
    SEO_DERIVE_SCHEMA,
    strategyOverride,
  );
}

export function buildSeoDerivePrompt(args: {
  title: string;
  bodyText: string;
  chosenKeyword: string;
}): string {
  const title = args.title.trim();
  const body = args.bodyText.trim().slice(0, MAX_BODY_CHARS);
  // Das gewaehlte Keyword steht ZUERST — es ist die harte Vorgabe fuer alle
  // abgeleiteten Felder.
  const parts: string[] = [
    `Focus-Keyword (vorgegeben, exakt so verwenden): ${args.chosenKeyword.trim()}`,
  ];
  if (title) parts.push(`Artikel-Titel: ${title}`);
  if (body) parts.push(`Artikel-Inhalt (Auszug):\n${body}`);
  return parts.join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────
// Read-only-Analyse (seo_review). Aus seoActions.ts hierher gezogen, damit
// alle SEO-Prompts EINE Source-of-Truth haben (Diagnose-Entscheidung PR 2).
// Struktur-Split ggue. frueher: der OUTPUT-JSON-Block lag im Mittelteil und
// wandert hier ans ENDE (Schema-Teil); der Wortlaut bleibt identisch.
// ─────────────────────────────────────────────────────────────────────────

export const SEO_REVIEW_STRATEGY = [
  "Aufgabe: Analysiere H1, ersten Absatz und H2-Überschriften eines Magazin-",
  "Artikels nach SEO-Kriterien und gib konkrete Verbesserungsvorschläge.",
  "Du empfiehlst nur — du änderst NICHTS am Body und schlägst NIEMALS vor,",
  "den Text automatisch umzuschreiben. Empfehlungen formulieren, was der",
  "Redakteur manuell anpassen kann.",
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
].join("\n");

export const SEO_REVIEW_SCHEMA = [
  "OUTPUT: NUR ein JSON-Objekt. Schema:",
  "{",
  '  "overallAssessment": string,  // 1 Satz Gesamtbewertung (z.B. "Solide Basis, Lead-Hook fehlt")',
  '  "suggestions": [               // 3-6 Einträge, kein Padding',
  "    {",
  '      "severity": "critical" | "important" | "nice_to_have",',
  '      "category": "keyword" | "length" | "numbers" | "powerwords" | "hook" | "readability",',
  '      "finding": string,        // 1 Satz: was beobachtet wurde (z.B. "Focus-Keyword fehlt im ersten Absatz")',
  '      "targetQuote": string,    // EXAKTES wörtliches Zitat der betroffenen Stelle aus H1/Lead/H2 (der Text, der geändert werden soll); "" wenn kein konkreter Textbezug (z.B. "keine H2 vorhanden")',
  '      "recommendation": string  // Konkreter Vorschlag — siehe Regel oben',
  "    }",
  "  ]",
  "}",
  "",
  "REGELN für targetQuote — STRIKT EINHALTEN:",
  "  (a) targetQuote MUSS wörtlich (Zeichen für Zeichen) aus dem gelieferten",
  "      Text (H1, Lead-Absatz oder einer H2) stammen — kein Paraphrasieren,",
  "      keine Auslassungen, keine erfundenen Zitate. Passt kein konkreter",
  "      Textausschnitt (z.B. Finding 'keine H2 vorhanden'), setze",
  '      targetQuote = "".',
  "  (b) Betreffen MEHRERE Findings dieselbe Textstelle (denselben Satz / dieselbe",
  "      Überschrift), fasse sie zu EINER recommendation mit EINEM konsolidierten",
  "      Ersatztext zusammen — niemals mehrere sich widersprechende Vorschläge",
  "      für denselben Satz.",
  "",
  "BEISPIEL für den gewünschten Stil (en):",
  "{",
  '  "overallAssessment": "Strong opening but weak keyword placement.",',
  '  "suggestions": [',
  "    {",
  '      "severity": "critical",',
  '      "category": "keyword",',
  '      "finding": "Focus-Keyword fehlt im ersten Absatz komplett.",',
  '      "targetQuote": "Banks are increasingly turning to automation for compliance.",',
  '      "recommendation": "Reformuliere den ersten Satz zu: \'AI Co-Pilots in Banking verkürzen Compliance-Reviews von Stunden auf Minuten — und entlasten Berater von Routine-Recherche.\'"',
  "    },",
  "    {",
  '      "severity": "important",',
  '      "category": "length",',
  '      "finding": "H1 ist mit 82 Zeichen zu lang, wird in SERP abgeschnitten.",',
  '      "targetQuote": "How AI Co-Pilots Are Transforming Compliance Workflows in Modern Banking",',
  '      "recommendation": "Kürze auf 58 Zeichen, z.B. \'AI Co-Pilots in Banking: Less Routine, More Insight\'."',
  "    }",
  "  ]",
  "}",
].join("\n");

export function buildSeoReviewSystem(
  locale: Locale,
  strategyOverride?: string,
): string {
  return composeSystem(
    localeLine(locale, "der Empfehlungen"),
    SEO_REVIEW_STRATEGY,
    SEO_REVIEW_SCHEMA,
    strategyOverride,
  );
}

export function buildSeoReviewPrompt(args: {
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

// ─────────────────────────────────────────────────────────────────────────
// Prompt-ID-Schluesselraum fuer die editierbaren Strategie-Overrides.
// BEWUSST NICHT die AiTask-Enum: seo_pipeline ist zwei Prompts (Kandidaten +
// Ableitung). Gespeichert in ai_config.task_prompt_overrides { promptId: text }.
// ─────────────────────────────────────────────────────────────────────────

export const SEO_PROMPT_IDS = [
  "seo_keyword_candidates",
  "seo_derive",
  "seo_review",
] as const;

export type SeoPromptId = (typeof SEO_PROMPT_IDS)[number];

// Code-Default-Strategien pro Prompt-ID — von der Admin-UI als Placeholder
// genutzt und der Fallback, wenn kein Override gesetzt ist.
export const SEO_DEFAULT_STRATEGIES: Record<SeoPromptId, string> = {
  seo_keyword_candidates: SEO_KEYWORD_CANDIDATES_STRATEGY,
  seo_derive: SEO_DERIVE_STRATEGY,
  seo_review: SEO_REVIEW_STRATEGY,
};

// Saeuberung analog Modell-Overrides: nur bekannte Prompt-IDs, leere/
// whitespace-only Werte fallen raus (Key weg → Resolver nimmt Code-Default).
// getrimmt gespeichert.
export function cleanPromptOverrides(
  raw: Partial<Record<string, unknown>>,
): Partial<Record<SeoPromptId, string>> {
  const out: Partial<Record<SeoPromptId, string>> = {};
  for (const id of SEO_PROMPT_IDS) {
    const v = raw[id];
    if (typeof v === "string" && v.trim() !== "") out[id] = v.trim();
  }
  return out;
}

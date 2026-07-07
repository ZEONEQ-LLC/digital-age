// Pure Prompt-Bau-Helper fuer die ZWEISTUFIGE SEO-Pipeline. Bewusst KEIN
// "use server" — nebenwirkungsfrei, damit die Server Actions
// (src/lib/ai/seoActions.ts) UND der manuelle Test importieren koennen.
// Gleiches Muster wie abstractPrompts.ts: eine Source-of-Truth fuer die
// Prompt-Logik.
//
// WICHTIG fuer den geplanten PR 2 (Prompt-Verwaltung in DB): Jeder
// System-Prompt ist bewusst in ZWEI Teile getrennt:
//   (a) Strategie-Text  — fachliche SEO-Anweisung (`*Strategy`-Funktion)
//   (b) JSON-Schema/Output-Format (`*_SCHEMA`-Konstante) — bleibt in Code
// Die `build*System`-Funktionen konkatenieren (a) + (b). PR 2 kann so den
// Strategie-Teil editierbar machen (DB), ohne das Schema anzufassen — das
// Schema bleibt die technische Vertragsgrundlage fuers JSON-Parsing.

// Body-Cap fuer den Pipeline-Input. 12000 Zeichen ≈ 1800 dt. Woerter und
// decken die laengsten DB-Artikel weitgehend ab (frueherer 4000-Cap zeigte
// dem Modell bei langen Artikeln nur ~25 % des Texts). Token-Aufschlag pro
// Call gegenueber 4000 ist vernachlaessigbar (~0.2 ¢ Haiku-Input).
export const MAX_BODY_CHARS = 12000;

type Locale = "de-CH" | "en";

function localeLine(locale: Locale): string {
  return `SPRACHE des Outputs: ${
    locale === "en" ? "Englisch" : "Deutsch (Schweizer Rechtschreibung)"
  }.`;
}

// ─────────────────────────────────────────────────────────────────────────
// Stufe 1 — Focus-Keyword-Kandidaten.
// Brand, Rolle ("SEO-Experte"), Schweizer Rechtschreibung und Output-
// Disziplin sind bereits im globalen Systemprompt (ai_config.system_prompt)
// abgedeckt — dieser Task-Prompt setzt direkt auf der SEO-Strategie auf.
// ─────────────────────────────────────────────────────────────────────────

export function seoKeywordCandidatesStrategy(locale: Locale): string {
  return [
    "Aufgabe: Schlage Focus-Keyword-Kandidaten fuer einen Magazin-Artikel vor.",
    "",
    localeLine(locale),
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
}

export const SEO_KEYWORD_CANDIDATES_SCHEMA = [
  "OUTPUT: NUR ein JSON-Objekt, Schema:",
  "{",
  '  "candidates": string[]   // 3-5 Focus-Keyword-Kandidaten, je 2-4 Woerter',
  "}",
].join("\n");

export function buildSeoKeywordCandidatesSystem(locale: Locale): string {
  return `${seoKeywordCandidatesStrategy(locale)}\n\n${SEO_KEYWORD_CANDIDATES_SCHEMA}`;
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

export function seoDeriveStrategy(locale: Locale): string {
  return [
    "Aufgabe: Leite SEO-Felder fuer einen Magazin-Artikel aus einem VORGEGEBENEN",
    "Focus-Keyword ab. Das Keyword ist bereits gewaehlt — waehle KEIN neues und",
    "aendere es NICHT.",
    "",
    localeLine(locale),
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
}

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

export function buildSeoDeriveSystem(locale: Locale): string {
  return `${seoDeriveStrategy(locale)}\n\n${SEO_DERIVE_SCHEMA}`;
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

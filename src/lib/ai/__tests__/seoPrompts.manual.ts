// Manueller Test-Runner fuer src/lib/ai/seoPrompts.ts.
//   npx tsx src/lib/ai/__tests__/seoPrompts.manual.ts
// Exit 0 = alles gruen, 1 = mind. ein Fail.
//
// Deckt die editierbaren SEO-Strategie-Prompts ab (PR 2):
//   - Drei-Teiler-Reihenfolge: localeLine VOR Strategie VOR Schema.
//   - strategyOverride greift (Text landet im System-Prompt, Default weg).
//   - leer/whitespace-only Override -> Code-Default.
//   - seo_review-Split: kein Strategie-Inhalt im Schema-Teil verloren,
//     Schema (OUTPUT + BEISPIEL) sauber getrennt.
//   - cleanPromptOverrides: Saeuberung (leer/whitespace/unbekannt raus, trim).

import {
  MAX_BODY_CHARS,
  buildSeoKeywordCandidatesSystem,
  buildSeoKeywordCandidatesPrompt,
  SEO_KEYWORD_CANDIDATES_STRATEGY,
  SEO_KEYWORD_CANDIDATES_SCHEMA,
  buildSeoDeriveSystem,
  buildSeoDerivePrompt,
  SEO_DERIVE_STRATEGY,
  SEO_DERIVE_SCHEMA,
  buildSeoReviewSystem,
  SEO_REVIEW_STRATEGY,
  SEO_REVIEW_SCHEMA,
  SEO_PROMPT_IDS,
  SEO_DEFAULT_STRATEGIES,
  cleanPromptOverrides,
} from "../seoPrompts";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

// Reihenfolge-Helper: a steht vor b im String (beide vorhanden).
function before(hay: string, a: string, b: string): boolean {
  const ia = hay.indexOf(a);
  const ib = hay.indexOf(b);
  return ia >= 0 && ib >= 0 && ia < ib;
}

section("Stufe 1 — Drei-Teiler: Locale vor Strategie vor Schema");
{
  const sys = buildSeoKeywordCandidatesSystem("de-CH");
  ok("localeLine vor Strategie", before(sys, "SPRACHE des Outputs", "Aufgabe: Schlage Focus-Keyword"));
  ok("Strategie vor Schema", before(sys, "3-5 KANDIDATEN", '"candidates": string[]'));
  ok("enthaelt Code-Default-Strategie", sys.includes(SEO_KEYWORD_CANDIDATES_STRATEGY));
  ok("enthaelt Schema", sys.includes(SEO_KEYWORD_CANDIDATES_SCHEMA));
  ok("de-CH → Schweizer Rechtschreibung", sys.includes("Deutsch (Schweizer Rechtschreibung)"));
  ok("en → Englisch", buildSeoKeywordCandidatesSystem("en").includes("SPRACHE des Outputs: Englisch"));
}

section("Stufe 1 — strategyOverride greift / leer → Default");
{
  const custom = "MEINE EIGENE KEYWORD-STRATEGIE 42";
  const sys = buildSeoKeywordCandidatesSystem("de-CH", custom);
  ok("Override-Text im System-Prompt", sys.includes(custom));
  ok("Code-Default verdraengt", !sys.includes("3-5 KANDIDATEN"), sys);
  ok("Schema trotzdem vorhanden", sys.includes(SEO_KEYWORD_CANDIDATES_SCHEMA));
  ok("localeLine trotzdem vorhanden", sys.includes("SPRACHE des Outputs"));

  ok('leerer Override === Default',
    buildSeoKeywordCandidatesSystem("de-CH", "") === buildSeoKeywordCandidatesSystem("de-CH"));
  ok('whitespace-only Override === Default',
    buildSeoKeywordCandidatesSystem("de-CH", "   \n\t ") === buildSeoKeywordCandidatesSystem("de-CH"));
}

section("Stufe 2 — Drei-Teiler + Override");
{
  const sys = buildSeoDeriveSystem("de-CH");
  ok("localeLine vor Strategie", before(sys, "SPRACHE des Outputs", "VORGEGEBENEN"));
  ok("Strategie vor Schema", before(sys, "VORGEGEBENEN", '"themenprofil": string'));
  ok("enthaelt Code-Default-Strategie", sys.includes(SEO_DERIVE_STRATEGY));
  ok("enthaelt Schema", sys.includes(SEO_DERIVE_SCHEMA));

  const custom = "DERIVE-OVERRIDE-XYZ";
  const withOverride = buildSeoDeriveSystem("de-CH", custom);
  ok("Override greift", withOverride.includes(custom) && !withOverride.includes("VORGEGEBENEN"));
  ok("whitespace → Default", buildSeoDeriveSystem("de-CH", "  ") === buildSeoDeriveSystem("de-CH"));
}

section("seo_review — Split vollstaendig, Schema am Ende");
{
  const sys = buildSeoReviewSystem("de-CH");
  // Reihenfolge: Locale → Strategie(Intro) → Schema(OUTPUT).
  ok("localeLine (der Empfehlungen) zuerst",
    before(sys, "SPRACHE der Empfehlungen", "Aufgabe: Analysiere H1"));
  ok("Strategie vor Schema (OUTPUT ans Ende gewandert)",
    before(sys, "ANALYSE-KRITERIEN", "OUTPUT: NUR ein JSON-Objekt. Schema:"));
  ok("BEISPIEL am Ende (nach WORTLIMITS)",
    before(sys, "WORTLIMITS", "BEISPIEL für den gewünschten Stil"));

  // Strategie-Teil hat alle Nicht-Schema-Sektionen …
  for (const anchor of [
    "Aufgabe: Analysiere H1",
    "ANALYSE-KRITERIEN",
    "REGEL für jede recommendation",
    "ANTI-PATTERNS — NIEMALS produzieren",
    "WORTLIMITS",
  ]) {
    ok(`Strategie enthaelt: ${anchor}`, SEO_REVIEW_STRATEGY.includes(anchor));
  }
  // … und KEINEN Schema-Inhalt.
  ok("Strategie ohne OUTPUT-Schema", !SEO_REVIEW_STRATEGY.includes("OUTPUT: NUR ein JSON-Objekt"));
  ok("Strategie ohne BEISPIEL", !SEO_REVIEW_STRATEGY.includes("BEISPIEL für den gewünschten Stil"));

  // Schema-Teil hat OUTPUT + BEISPIEL.
  ok("Schema enthaelt OUTPUT", SEO_REVIEW_SCHEMA.includes("OUTPUT: NUR ein JSON-Objekt. Schema:"));
  ok("Schema enthaelt overallAssessment-Feld", SEO_REVIEW_SCHEMA.includes('"overallAssessment": string'));
  ok("Schema enthaelt BEISPIEL", SEO_REVIEW_SCHEMA.includes("BEISPIEL für den gewünschten Stil"));

  // Nichts verloren: Strategie + Schema decken zusammen die Kernanker ab.
  ok("Override greift auch bei review",
    buildSeoReviewSystem("de-CH", "REVIEW-OVR").includes("REVIEW-OVR"));
}

section("seo_review — targetQuote + Regeln im Schema (Code, override-fest)");
{
  ok("Schema hat targetQuote-Feld", SEO_REVIEW_SCHEMA.includes('"targetQuote": string'));
  ok("Regel (a) woertlich verankert",
    SEO_REVIEW_SCHEMA.includes("wörtlich") && SEO_REVIEW_SCHEMA.includes("targetQuote MUSS"));
  ok('Regel (a) leeres targetQuote erlaubt', SEO_REVIEW_SCHEMA.includes('targetQuote = ""'));
  ok("Regel (b) Konsolidierung verankert",
    SEO_REVIEW_SCHEMA.includes("EINER recommendation") &&
      SEO_REVIEW_SCHEMA.includes("dieselbe Textstelle"));
  ok("BEISPIEL enthaelt targetQuote", SEO_REVIEW_SCHEMA.includes('"targetQuote": "Banks are increasingly'));
  // Auch bei gesetztem Strategie-Override bleibt das Schema (targetQuote) aktiv.
  ok("targetQuote auch bei Strategie-Override im System-Prompt",
    buildSeoReviewSystem("de-CH", "NUR STRATEGIE").includes('"targetQuote": string'));
}

section("Prompt-IDs + Code-Defaults");
{
  ok("3 Prompt-IDs", SEO_PROMPT_IDS.length === 3);
  ok("IDs korrekt",
    SEO_PROMPT_IDS.join(",") === "seo_keyword_candidates,seo_derive,seo_review");
  for (const id of SEO_PROMPT_IDS) {
    const def = SEO_DEFAULT_STRATEGIES[id];
    ok(`Default fuer ${id} nicht leer`, typeof def === "string" && def.trim().length > 0);
    ok(`Default fuer ${id} sprachneutral (keine SPRACHE-Zeile)`, !def.includes("SPRACHE "));
  }
}

section("cleanPromptOverrides — Saeuberung");
{
  const cleaned = cleanPromptOverrides({
    seo_review: "  hallo welt  ",
    seo_derive: "   ",
    seo_keyword_candidates: "Keyword-Text",
    unknown_prompt: "sollte weg", // unbekannte ID → muss ignoriert werden
  });
  ok("bekannter nicht-leerer Wert bleibt (getrimmt)", cleaned.seo_review === "hallo welt");
  ok("bekannter Wert 2 bleibt", cleaned.seo_keyword_candidates === "Keyword-Text");
  ok("whitespace-only gedroppt", !("seo_derive" in cleaned));
  ok("unbekannte ID ignoriert", !("unknown_prompt" in (cleaned as Record<string, unknown>)));
  ok("leeres Objekt → leeres Objekt", Object.keys(cleanPromptOverrides({})).length === 0);
}

section("Prompt-Builder (Body-Cap unveraendert)");
{
  const longBody = "y".repeat(MAX_BODY_CHARS + 3000);
  const p = buildSeoKeywordCandidatesPrompt({ title: "T", bodyText: longBody, rejectedKeywords: [] });
  ok(`Body auf MAX_BODY_CHARS (${MAX_BODY_CHARS}) gekappt`, (p.match(/y/g) ?? []).length === MAX_BODY_CHARS);
  const d = buildSeoDerivePrompt({ title: "T", bodyText: "B", chosenKeyword: "KI Compliance" });
  ok("Derive-Prompt enthaelt gewaehltes Keyword", d.includes("KI Compliance"));
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);

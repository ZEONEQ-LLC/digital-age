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
  buildSeoReviewPrompt,
  SEO_REVIEW_STRATEGY,
  SEO_REVIEW_SCHEMA,
} from "../seoPrompts";
import { seoHeadingOutline } from "../seoHeadings";
import type { Block } from "@/types/blocks";
import {
  EDITABLE_PROMPT_IDS,
  EDITABLE_DEFAULT_STRATEGIES,
  cleanPromptOverrides,
} from "../promptRegistry";

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

section("seo_review — proposedText + Einfuege-Anker im Schema (Iteration 2)");
{
  ok("Schema hat proposedText-Feld", SEO_REVIEW_SCHEMA.includes('"proposedText": string'));
  ok("Regel (c): proposedText nur Wortlaut",
    SEO_REVIEW_SCHEMA.includes("proposedText enthält AUSSCHLIESSLICH"));
  ok("Regel (d): Einfuege-Anker",
    SEO_REVIEW_SCHEMA.includes("EINFÜGE-Empfehlungen") &&
      SEO_REVIEW_SCHEMA.includes("wörtlicher ANKER"));
  ok("Regel (d): Platzierung explizit nennen",
    SEO_REVIEW_SCHEMA.includes("Platzierung explizit"));
  ok("BEISPIEL enthaelt proposedText", SEO_REVIEW_SCHEMA.includes('"proposedText": "AI Co-Pilots in Banking:'));
  ok("BEISPIEL zeigt eine Einfuegung (numbers-Anker)",
    SEO_REVIEW_SCHEMA.includes('"targetQuote": "The regulatory landscape'));
  // Override-fest: auch bei gesetzter Strategie bleibt proposedText im Schema.
  ok("proposedText auch bei Strategie-Override im System-Prompt",
    buildSeoReviewSystem("de-CH", "NUR STRATEGIE").includes('"proposedText": string'));
}

section("Prompt-IDs + Code-Defaults (Registry, generalisiert)");
{
  ok("11 Prompt-IDs (inkl. abstract_generate, highlight_suggestions, image_alt, hero_proposals, social_posts, newsletter_draft, platform_research, prompt_generation)", EDITABLE_PROMPT_IDS.length === 11);
  ok("IDs korrekt",
    EDITABLE_PROMPT_IDS.join(",") ===
      "seo_keyword_candidates,seo_derive,seo_review,abstract_generate,highlight_suggestions,image_alt,hero_proposals,social_posts,newsletter_draft,platform_research,prompt_generation");
  for (const id of EDITABLE_PROMPT_IDS) {
    const def = EDITABLE_DEFAULT_STRATEGIES[id];
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

section("Review-Prompt: Gliederung mit H2 und H3 (PR 189)");
{
  const blocks = [
    { id: "a", type: "heading", level: 2, content: "Warum Agenten" },
    { id: "b", type: "paragraph", content: "Text" },
    { id: "c", type: "heading", level: 3, content: "KI im Treuhandbüro" },
    { id: "d", type: "heading", level: 4, content: "Detail" },
    { id: "e", type: "heading", level: 2, content: "  " },
  ] as Block[];
  const outline = seoHeadingOutline(blocks);
  ok("Outline: H2 + H3, H4 und leere weg", JSON.stringify(outline) === JSON.stringify([{ level: 2, text: "Warum Agenten" }, { level: 3, text: "KI im Treuhandbüro" }]));
  ok("Outline: null -> leer", seoHeadingOutline(null).length === 0);
  const p = buildSeoReviewPrompt({ title: "T", firstParagraph: "L", headings: outline, focusKeyword: "KI", secondaryKeywords: [] });
  ok("H2-Zeile", p.includes("  H2: Warum Agenten"));
  ok("H3-Zeile eingerueckt", p.includes("    H3: KI im Treuhandbüro"));
  ok("H3-Hinweis bei vorhandenen H3", p.includes("H3 zu H2 anheben"));
  const p2 = buildSeoReviewPrompt({ title: "T", firstParagraph: "L", headings: [{ level: 2, text: "Nur H2" }], focusKeyword: null, secondaryKeywords: [] });
  ok("kein H3-Hinweis ohne H3", !p2.includes("anheben"));
  const p3 = buildSeoReviewPrompt({ title: "T", firstParagraph: "L", headings: [], focusKeyword: null, secondaryKeywords: [] });
  ok("leere Gliederung", p3.includes("(keine Zwischentitel im Artikel)"));
  ok("Schema erlaubt H3-Zitat", SEO_REVIEW_SCHEMA.includes("H1/Lead/H2/H3"));
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);

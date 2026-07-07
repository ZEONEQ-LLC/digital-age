// Manueller Test-Runner fuer src/lib/ai/highlightPrompts.ts.
//   npx tsx src/lib/ai/__tests__/highlightPrompts.manual.ts
// Exit 0 = alles gruen, 1 = mind. ein Fail.
//
// Deckt Schema-Verankerung, Drei-Teiler + Override und den Parser
// (Duplikat-Filter, max 6, leere quotes raus) ab.

import {
  HIGHLIGHT_SUGGESTIONS_STRATEGY,
  HIGHLIGHT_SUGGESTIONS_SCHEMA,
  buildHighlightSuggestionsSystem,
  buildHighlightSuggestionsPrompt,
  parseHighlights,
} from "../highlightPrompts";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }
function before(hay: string, a: string, b: string): boolean {
  const ia = hay.indexOf(a); const ib = hay.indexOf(b);
  return ia >= 0 && ib >= 0 && ia < ib;
}

section("Schema verankert");
{
  ok('Schema hat highlights-Array', HIGHLIGHT_SUGGESTIONS_SCHEMA.includes('"highlights"'));
  ok('Schema hat quote-Feld', HIGHLIGHT_SUGGESTIONS_SCHEMA.includes('"quote": string'));
  ok('Schema hat reason-Feld', HIGHLIGHT_SUGGESTIONS_SCHEMA.includes('"reason": string'));
  ok("Schema nennt 3-6", HIGHLIGHT_SUGGESTIONS_SCHEMA.includes("3-6"));
  ok("Schema fordert woertliches Zitat", HIGHLIGHT_SUGGESTIONS_SCHEMA.includes("EXAKTES woertliches Zitat"));
}

section("Drei-Teiler: Locale vor Strategie vor Schema + Override");
{
  const sys = buildHighlightSuggestionsSystem("de-CH");
  ok("localeLine vor Strategie", before(sys, "SPRACHE des Outputs (reason)", "Aufgabe: Identifiziere"));
  ok("Strategie vor Schema", before(sys, "Aufgabe: Identifiziere", '"highlights"'));
  ok("enthaelt Code-Default-Strategie", sys.includes(HIGHLIGHT_SUGGESTIONS_STRATEGY));
  ok("enthaelt Schema", sys.includes(HIGHLIGHT_SUGGESTIONS_SCHEMA));
  ok("de-CH Sprache", sys.includes("Deutsch (Schweizer Rechtschreibung)"));
  ok("en Sprache", buildHighlightSuggestionsSystem("en").includes("SPRACHE des Outputs (reason): Englisch"));

  const custom = "MEINE HIGHLIGHT-STRATEGIE 99";
  const withOv = buildHighlightSuggestionsSystem("de-CH", custom);
  ok("Override greift", withOv.includes(custom) && !withOv.includes("Aufgabe: Identifiziere"));
  ok("Schema trotz Override da", withOv.includes('"highlights"'));
  ok("leerer Override → Default", buildHighlightSuggestionsSystem("de-CH", "  ") === buildHighlightSuggestionsSystem("de-CH"));
}

section("Prompt-Builder");
{
  ok("leerer Body → Hinweis", buildHighlightSuggestionsPrompt({ bodyText: "  " }).includes("kein Inhalt"));
  ok("Body im Prompt", buildHighlightSuggestionsPrompt({ bodyText: "Hallo Welt." }).includes("Hallo Welt."));
}

section("parseHighlights");
{
  const r = parseHighlights('{"highlights":[{"quote":"Satz A.","reason":"r1"},{"quote":"Satz B.","reason":"r2"}]}');
  ok("valides JSON geparst", r !== null && r.length === 2);
  ok("quote/reason erhalten", r?.[0].quote === "Satz A." && r?.[0].reason === "r1");

  // Duplikat case-insensitive gefiltert.
  const dup = parseHighlights('{"highlights":[{"quote":"Kernaussage."},{"quote":"kernaussage."},{"quote":"Zweite."}]}');
  ok("Duplikat (case-insensitive) gefiltert", dup !== null && dup.length === 2, JSON.stringify(dup));
  ok("fehlende reason → \"\"", dup?.[0].reason === "");

  // Leere quotes raus.
  const withEmpty = parseHighlights('{"highlights":[{"quote":"   "},{"quote":"Gueltig."}]}');
  ok("leere/whitespace quote gefiltert", withEmpty !== null && withEmpty.length === 1 && withEmpty[0].quote === "Gueltig.");

  // Max 6.
  const many = parseHighlights(JSON.stringify({
    highlights: Array.from({ length: 9 }, (_, i) => ({ quote: `Q${i}`, reason: "" })),
  }));
  ok("max 6 Eintraege", many !== null && many.length === 6, `len=${many?.length}`);

  // Code-Fence wird gestrippt.
  ok("Code-Fence toleriert",
    parseHighlights('```json\n{"highlights":[{"quote":"X."}]}\n```')?.[0].quote === "X.");

  // Fehlerfaelle → null.
  ok("kein JSON → null", parseHighlights("kein json") === null);
  ok("kein highlights-Array → null", parseHighlights('{"foo":1}') === null);
  ok("leeres highlights → null", parseHighlights('{"highlights":[]}') === null);
  ok("nur ungueltige Eintraege → null", parseHighlights('{"highlights":[{"reason":"ohne quote"}]}') === null);
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);

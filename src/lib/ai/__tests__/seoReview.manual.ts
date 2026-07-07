// Manueller Test-Runner fuer src/lib/ai/seoReview.ts.
//   npx tsx src/lib/ai/__tests__/seoReview.manual.ts
// Exit 0 = alles gruen, 1 = mind. ein Fail.
//
// Deckt die reinen Review-Helper ab: isReviewStale (Staleness-Vergleich),
// truncateQuote (Anzeige), normalizeStoredReview (tolerant, Alt-Daten ohne
// targetQuote → "").

import {
  isReviewStale,
  truncateQuote,
  normalizeStoredReview,
} from "../seoReview";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

section("isReviewStale");
{
  ok("updated > review → stale",
    isReviewStale("2026-07-07T12:00:05Z", "2026-07-07T12:00:00Z") === true);
  ok("updated < review → nicht stale",
    isReviewStale("2026-07-07T12:00:00Z", "2026-07-07T12:00:05Z") === false);
  ok("gleich → nicht stale (strikt >)",
    isReviewStale("2026-07-07T12:00:00Z", "2026-07-07T12:00:00Z") === false);
  ok("updatedAt null → nicht stale", isReviewStale(null, "2026-07-07T12:00:00Z") === false);
  ok("reviewAt null → nicht stale", isReviewStale("2026-07-07T12:00:00Z", null) === false);
  ok("beide null → nicht stale", isReviewStale(null, null) === false);
  ok("ungueltiges Datum → nicht stale", isReviewStale("keins", "2026-07-07T12:00:00Z") === false);
}

section("truncateQuote");
{
  ok("kurzes Zitat unveraendert", truncateQuote("Kurzer Satz") === "Kurzer Satz");
  ok("Whitespace normalisiert",
    truncateQuote("Zeile\n eins   zwei\tdrei") === "Zeile eins zwei drei");
  const long = "A".repeat(200);
  const t = truncateQuote(long, 120);
  ok("langes Zitat gekappt auf max", t.length === 120, `len=${t.length}`);
  ok("langes Zitat endet mit Ellipsis", t.endsWith("…"));
  ok("eigenes max respektiert", truncateQuote("A".repeat(50), 10).length === 10);
}

// Baustein: eine gueltige Suggestion.
const validSug = {
  severity: "critical",
  category: "keyword",
  finding: "Keyword fehlt im Lead.",
  targetQuote: "Der erste Satz.",
  recommendation: "Keyword einbauen.",
};

section("normalizeStoredReview — valide + Alt-Daten");
{
  const r = normalizeStoredReview({
    overallAssessment: "Solide.",
    suggestions: [validSug],
  });
  ok("valides Review geparst", r !== null && r.suggestions.length === 1);
  ok("targetQuote erhalten", r?.suggestions[0].targetQuote === "Der erste Satz.");
  // validSug hat kein proposedText/done → Defaults.
  ok('fehlendes proposedText → ""', r?.suggestions[0].proposedText === "");
  ok("fehlendes done → false", r?.suggestions[0].done === false);

  // Neue Felder vorhanden → erhalten.
  const withNew = normalizeStoredReview({
    overallAssessment: "Neu.",
    suggestions: [{ ...validSug, proposedText: "Neuer Satz.", done: true }],
  });
  ok("proposedText erhalten", withNew?.suggestions[0].proposedText === "Neuer Satz.");
  ok("done=true erhalten", withNew?.suggestions[0].done === true);
  ok("done nur bei ===true (anderes truthy → false)",
    normalizeStoredReview({
      overallAssessment: "x",
      suggestions: [{ ...validSug, done: "yes" }],
    })?.suggestions[0].done === false);

  // Alt-Daten: Suggestion OHNE targetQuote → "" (kein Hard-Fail).
  const alt = normalizeStoredReview({
    overallAssessment: "Alt.",
    suggestions: [
      { severity: "important", category: "length", finding: "F", recommendation: "R" },
    ],
  });
  ok("Alt-Suggestion akzeptiert", alt !== null && alt.suggestions.length === 1);
  ok("fehlendes targetQuote → \"\"", alt?.suggestions[0].targetQuote === "");
}

section("normalizeStoredReview — Salvage + null-Faelle");
{
  // Ungueltige Suggestion (recommendation fehlt) wird verworfen, valide bleibt.
  const mixed = normalizeStoredReview({
    overallAssessment: "Mix.",
    suggestions: [
      validSug,
      { severity: "critical", category: "keyword", finding: "nur finding" },
    ],
  });
  ok("ungueltige Suggestion verworfen, valide behalten",
    mixed !== null && mixed.suggestions.length === 1);

  // Unbekannte severity/category → verworfen.
  const badEnum = normalizeStoredReview({
    overallAssessment: "X.",
    suggestions: [{ ...validSug, severity: "blocker" }],
  });
  ok("unbekannte severity → Review null (alle verworfen)", badEnum === null);

  ok("kein Objekt → null", normalizeStoredReview("nope") === null);
  ok("null → null", normalizeStoredReview(null) === null);
  ok("suggestions kein Array → null",
    normalizeStoredReview({ overallAssessment: "x", suggestions: "no" }) === null);
  ok("overallAssessment fehlt → null",
    normalizeStoredReview({ suggestions: [validSug] }) === null);
  ok("alle Suggestions invalide → null",
    normalizeStoredReview({ overallAssessment: "x", suggestions: [{ severity: "x" }] }) === null);
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);

// Manueller Test-Runner fuer src/lib/ai/seoPrompts.ts.
//   npx tsx src/lib/ai/__tests__/seoPrompts.manual.ts
// Exit 0 = alles gruen, 1 = mind. ein Fail.
//
// Sichert die zweistufige SEO-Pipeline auf Prompt-Ebene ab:
//   - Strategie/Schema-Trennung ist vorhanden und die build*System-Funktionen
//     konkatenieren genau (a) Strategie + (b) Schema (Vorbereitung PR 2).
//   - Die Negativ-Liste (verworfene Keywords) landet im Stage-1-Prompt.
//   - Stage-2 nutzt das VORGEGEBENE Keyword und leitet KEIN neues ab
//     (kein focusKeyword im Derive-Schema).

import {
  MAX_BODY_CHARS,
  seoKeywordCandidatesStrategy,
  SEO_KEYWORD_CANDIDATES_SCHEMA,
  buildSeoKeywordCandidatesSystem,
  buildSeoKeywordCandidatesPrompt,
  seoDeriveStrategy,
  SEO_DERIVE_SCHEMA,
  buildSeoDeriveSystem,
  buildSeoDerivePrompt,
} from "../seoPrompts";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

section("Stufe 1 — System: Strategie + Schema getrennt und konkateniert");
{
  const sys = buildSeoKeywordCandidatesSystem("de-CH");
  const strat = seoKeywordCandidatesStrategy("de-CH");
  ok(
    "System == Strategie + \\n\\n + Schema (exakte Konkatenation)",
    sys === `${strat}\n\n${SEO_KEYWORD_CANDIDATES_SCHEMA}`,
    sys,
  );
  ok("System enthaelt den Strategie-Teil", sys.includes(strat));
  ok("System enthaelt den Schema-Teil", sys.includes(SEO_KEYWORD_CANDIDATES_SCHEMA));
  ok("Strategie fordert 3-5 Kandidaten", /3-5 KANDIDATEN/.test(strat), strat);
  ok('Schema hat "candidates"-Feld', SEO_KEYWORD_CANDIDATES_SCHEMA.includes('"candidates"'));
  ok(
    "Schema erwaehnt KEIN focusKeyword (Stufe 1 liefert nur Kandidaten)",
    !SEO_KEYWORD_CANDIDATES_SCHEMA.includes("focusKeyword"),
  );
}

section("Stufe 1 — Locale steuert Output-Sprache");
{
  ok("de-CH → Schweizer Rechtschreibung",
    seoKeywordCandidatesStrategy("de-CH").includes("Deutsch (Schweizer Rechtschreibung)"));
  ok("en → Englisch",
    seoKeywordCandidatesStrategy("en").includes("Englisch"));
}

section("Stufe 1 — Negativ-Liste landet im Prompt");
{
  const withRejected = buildSeoKeywordCandidatesPrompt({
    title: "KI im Banking",
    bodyText: "Ein Artikel ueber Compliance.",
    rejectedKeywords: ["KI Banking", "Bank Automation"],
  });
  ok("Ausschluss-Block vorhanden", withRejected.includes("NICHT erneut vorschlagen"), withRejected);
  ok("verworfenes Keyword 1 im Prompt", withRejected.includes("KI Banking"));
  ok("verworfenes Keyword 2 im Prompt", withRejected.includes("Bank Automation"));

  const withoutRejected = buildSeoKeywordCandidatesPrompt({
    title: "KI im Banking",
    bodyText: "Ein Artikel ueber Compliance.",
    rejectedKeywords: [],
  });
  ok("kein Ausschluss-Block ohne verworfene Keywords",
    !withoutRejected.includes("NICHT erneut vorschlagen"), withoutRejected);

  // Leere/Whitespace-Eintraege werden gefiltert → kein Block.
  const blankOnly = buildSeoKeywordCandidatesPrompt({
    title: "T",
    bodyText: "B",
    rejectedKeywords: ["   ", ""],
  });
  ok("nur-Whitespace-Ausschluesse erzeugen keinen Block",
    !blankOnly.includes("NICHT erneut vorschlagen"), blankOnly);
}

section("Stufe 1 — Body-Cap greift");
{
  const longBody = "x".repeat(MAX_BODY_CHARS + 5000);
  const prompt = buildSeoKeywordCandidatesPrompt({ title: "T", bodyText: longBody, rejectedKeywords: [] });
  const bodyChars = (prompt.match(/x/g) ?? []).length;
  ok(`Body auf MAX_BODY_CHARS (${MAX_BODY_CHARS}) gekappt`, bodyChars === MAX_BODY_CHARS, `chars=${bodyChars}`);
}

section("Stufe 2 — System: Strategie + Schema getrennt, Keyword vorgegeben");
{
  const sys = buildSeoDeriveSystem("de-CH");
  const strat = seoDeriveStrategy("de-CH");
  ok(
    "System == Strategie + \\n\\n + Schema (exakte Konkatenation)",
    sys === `${strat}\n\n${SEO_DERIVE_SCHEMA}`,
    sys,
  );
  ok("Strategie sagt: Keyword ist VORGEGEBEN", /VORGEGEBENEN/.test(strat), strat);
  ok("Strategie sagt: kein neues Keyword waehlen", /waehle KEIN neues/.test(strat), strat);
  ok("Schema hat titleCandidates", SEO_DERIVE_SCHEMA.includes('"titleCandidates"'));
  ok("Schema hat semanticTerms", SEO_DERIVE_SCHEMA.includes('"semanticTerms"'));
  ok(
    "Derive-Schema enthaelt KEIN focusKeyword (ist Vorgabe, nicht Ergebnis)",
    !SEO_DERIVE_SCHEMA.includes("focusKeyword"),
  );
}

section("Stufe 2 — Prompt enthaelt das gewaehlte Keyword");
{
  const prompt = buildSeoDerivePrompt({
    title: "KI im Banking",
    bodyText: "Body",
    chosenKeyword: "KI-gestuetzte Compliance",
  });
  ok("gewaehltes Keyword im Prompt", prompt.includes("KI-gestuetzte Compliance"), prompt);
  ok("Keyword-Zeile als Vorgabe markiert", prompt.includes("Focus-Keyword (vorgegeben"), prompt);
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);

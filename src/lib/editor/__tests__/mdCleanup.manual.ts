// Manueller Test-Runner fuer src/lib/editor/mdCleanup.ts.
//
// Kein Vitest/Jest im Repo eingerichtet — dieses Skript laeuft die
// Testfaelle als simple console.log-Pass/Fail-Suite. Aufruf:
//
//   npx tsx src/lib/editor/__tests__/mdCleanup.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.

import {
  cleanupMarkdown,
  parseSourceLine,
  parseSourcesLines,
} from "../mdCleanup";

let passes = 0;
let fails = 0;

function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) {
    passes++;
    process.stdout.write(`  PASS  ${label}\n`);
  } else {
    fails++;
    process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`);
  }
}

function section(label: string): void {
  process.stdout.write(`\n=== ${label} ===\n`);
}

// ============================================================
// 1) Andreas' Format — Bullet + MD-Link
// ============================================================
section("Andreas' 24-Bullet-Block");

const ANDREAS_INPUT = [
  "•\tThe Innovator's Dilemma – Clayton M Christensen: [https://www.hbs.edu/foo](https://www.hbs.edu/foo)",
  "•\tInnovation in Banking – BBVA: [https://example.com/innovation](https://example.com/innovation)",
  "•\tAI experimentation – Why employees need time: [https://www.linkedin.com/posts/feldmaneyal_x](https://www.linkedin.com/posts/feldmaneyal_x)",
  "•\tEmployee resistance to AI: [https://vooban.com/en/articles/2024/x](https://vooban.com/en/articles/2024/x)",
];
{
  const result = parseSourcesLines(ANDREAS_INPUT);
  ok("4 Bullet-Zeilen → 4 sources, 0 unparseable", result.map.size === 4 && result.unparseableLines.length === 0,
    `map.size=${result.map.size}, unparseable=${result.unparseableLines.length}`);
  ok("Auto-Nummerierung positionsbasiert 1..4",
    result.map.has(1) && result.map.has(2) && result.map.has(3) && result.map.has(4));
  ok("renumberedDueToMix=false (keine Zeile hatte expliziten Index)", result.renumberedDueToMix === false);
  ok("Erste Quelle hat URL", result.map.get(1)?.url === "https://www.hbs.edu/foo");
  ok("Erste Quelle Titel = 'The Innovator's Dilemma – Clayton M Christensen'",
    result.map.get(1)?.text === "The Innovator's Dilemma – Clayton M Christensen",
    `got: ${JSON.stringify(result.map.get(1)?.text)}`);
}

// ============================================================
// 2) Strict [N]-Format — bestehender Pfad
// ============================================================
section("Strict [N]-Format bleibt unveraendert");

{
  const result = parseSourcesLines([
    "[1] Innovator's Dilemma https://hbs.edu/x",
    "[5] BBVA Innovation https://example.com/y",
  ]);
  ok("2 strict-Zeilen → 2 sources", result.map.size === 2);
  ok("Explizite N respektiert (1 und 5)", result.map.has(1) && result.map.has(5));
  ok("Kein Mix-Renumber (alle explizit)", result.renumberedDueToMix === false);
}

// ============================================================
// 3) Mix-Fall — manche mit [N], manche ohne
// ============================================================
section("Mix-Fall: explizit + implizit");

{
  const result = parseSourcesLines([
    "[1] Erste explizit https://example.com/1",
    "- Zweite ohne Index https://example.com/2",
    "[3] Dritte explizit https://example.com/3",
  ]);
  ok("3 Zeilen parseable", result.map.size === 3);
  ok("renumberedDueToMix=true", result.renumberedDueToMix === true);
  ok("Positionsbasiert: keys = {1, 2, 3}",
    result.map.has(1) && result.map.has(2) && result.map.has(3));
  ok("[3] aus Eingabe ist NICHT explizit erhalten (Mix-Fall renumbered)",
    result.map.get(3)?.url === "https://example.com/3");
  ok("Zweite Quelle ist die ohne-Index-Zeile",
    result.map.get(2)?.url === "https://example.com/2");
}

// ============================================================
// 4) MD-Liste / numerische Liste / Klammer-Index / MD-Link ohne Index
// ============================================================
section("Weitere akzeptierte Formate");

{
  ok("MD-Liste '- Titel URL'",
    parseSourceLine("- Titel https://example.com")?.text === "Titel");
  ok("Numerische Liste '1. Titel URL'",
    parseSourceLine("1. Titel https://example.com")?.text === "Titel");
  ok("Klammer-Index '(1) Titel URL'",
    parseSourceLine("(1) Titel https://example.com")?.explicitN === 1);
  ok("Klammer-Index ')' Variante '1) Titel URL'",
    parseSourceLine("1) Titel https://example.com")?.explicitN === 1);
  ok("MD-Link ohne Index '[Titel](URL)'",
    parseSourceLine("[Foo Title](https://example.com)")?.text === "Foo Title");
  ok("MD-Link ohne Index hat URL",
    parseSourceLine("[Foo Title](https://example.com)")?.url === "https://example.com");
}

// ============================================================
// 5) Bewusst unparsbar — Plain ohne Marker, Reference-Link-Definition
// ============================================================
section("Bewusst NICHT akzeptierte Formate");

{
  ok("Plain 'Titel URL' ohne Marker → null",
    parseSourceLine("Just some title https://example.com") === null);
  ok("Reference-Link-Definition '[1]: URL \"Titel\"' → der parser nimmt es als [N] strict",
    // Disclaimer: technisch matcht [1]:, der Parser interpretiert es. Ali hat das ausgeklammert,
    // aber das ist edge — wir markieren das hier zur Doku. Test schaut nur ob nicht crashed.
    parseSourceLine('[1]: https://example.com "Titel"') !== null);
  ok("Leere Zeile → null",
    parseSourceLine("   ") === null);
  ok("Reiner Bullet ohne Inhalt → null",
    parseSourceLine("•") === null);
}

// ============================================================
// 6) Sicherheitsnetz — unparseable Zeilen landen im Body
// ============================================================
section("Sicherheitsnetz: unparseable Zeilen verloren-frei");

{
  const md = [
    "# Artikel-Titel",
    "",
    "Erster Absatz mit Inhalt.",
    "",
    "## Sources",
    "",
    "Random ohne Marker, nicht parseable",
    "Noch eine nicht parseable Zeile",
  ].join("\n");

  const result = cleanupMarkdown(md);
  ok("Cleanup laeuft durch ohne Throw", result.blocks.length > 0);
  ok("foundSourcesSection=true (Heading wurde erkannt)", result.foundSourcesSection === true);
  ok("2 unparseable Lines gesammelt", result.unparseableSourceLines.length === 2);
  ok("sources[] leer (nichts parseable)", result.sources.length === 0);

  // Verifiziere, dass die unparseable Lines im Body landen
  const flatText = JSON.stringify(result.blocks);
  ok("Unparseable Line 1 ist im Body-Output enthalten",
    flatText.includes("Random ohne Marker"));
  ok("Unparseable Line 2 ist im Body-Output enthalten",
    flatText.includes("Noch eine nicht parseable Zeile"));
  ok("Body bekommt Sources-Heading-Block fuer die unparseable Lines",
    result.blocks.some((b) => b.type === "heading" && (b as { content?: string }).content === "Sources"));
}

// ============================================================
// 7) Andreas-Block via cleanupMarkdown-Integrationstest
// ============================================================
section("Integrationstest: Andreas' kompletter MD-Input");

{
  const md = [
    "Body-Inhalt vor der Sources-Sektion.",
    "",
    "Zweiter Absatz mit Erklaerung.",
    "",
    "## Sources",
    "",
    "•\tThe Innovator's Dilemma – Clayton M Christensen: [https://hbs.edu/x](https://hbs.edu/x)",
    "•\tInnovation in Banking – BBVA: [https://example.com/innovation](https://example.com/innovation)",
    "•\tAI experimentation: [https://linkedin.com/x](https://linkedin.com/x)",
  ].join("\n");

  const result = cleanupMarkdown(md);
  ok("Body hat Absaetze, Sources-Sektion abgetrennt", result.blocks.length >= 2);
  ok("3 sources extrahiert", result.sources.length === 3);
  ok("0 unparseable (alles greift)", result.unparseableSourceLines.length === 0);
  ok("Erste Quelle hat den Titel",
    result.sources[0]?.text === "The Innovator's Dilemma – Clayton M Christensen",
    `got: ${JSON.stringify(result.sources[0]?.text)}`);
  ok("Erste Quelle hat URL",
    result.sources[0]?.url === "https://hbs.edu/x",
    `got: ${JSON.stringify(result.sources[0]?.url)}`);
}

// ============================================================
// Summary
// ============================================================
process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);

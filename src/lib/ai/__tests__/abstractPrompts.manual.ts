// Manueller Test-Runner fuer src/lib/ai/abstractPrompts.ts.
//   npx tsx src/lib/ai/__tests__/abstractPrompts.manual.ts

import {
  ABSTRACT_STRATEGY,
  buildAbstractSystem,
  buildAbstractPrompt,
  cleanAbstractText,
  MAX_BODY_CHARS,
} from "../abstractPrompts";

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

section("Strategie sprachneutral");
{
  ok("keine SPRACHE-Zeile in der Strategie", !ABSTRACT_STRATEGY.includes("SPRACHE"));
  ok("kein Eszett-Hinweis in der Strategie (gehoert zur Sprache)", !ABSTRACT_STRATEGY.includes("Eszett"));
  ok("Stilregeln drin", ABSTRACT_STRATEGY.includes("2–4 Sätze") && ABSTRACT_STRATEGY.includes("Gedankenstriche"));
}

section("Drei-Teiler: Sprache vor Strategie vor Keyword vor Output");
{
  const de = buildAbstractSystem("de-CH", "KI im Mittelstand");
  ok("de-CH: Eszett-Regel", de.includes("NIEMALS Eszett"));
  ok("Reihenfolge", before(de, "SPRACHE:", "STIL:") && before(de, "STIL:", "FOCUS-KEYWORD") && before(de, "FOCUS-KEYWORD", "OUTPUT:"));
  ok("Keyword exakt", de.includes('"KI im Mittelstand"'));
  const en = buildAbstractSystem("en", null);
  ok("en: Englisch, kein Eszett", en.includes("Englisch") && !en.includes("Eszett"));
  ok("ohne Keyword kein Keyword-Block", !en.includes("FOCUS-KEYWORD"));
  ok("Output immer am Ende", en.trim().endsWith("kein Markdown-Codeblock."));
}

section("Override ersetzt nur die Strategie");
{
  const s = buildAbstractSystem("de-CH", "Agentic AI", "NUR MEINE STRATEGIE");
  ok("Override drin", s.includes("NUR MEINE STRATEGIE"));
  ok("Default-Strategie weg", !s.includes("STILANPASSUNG"));
  ok("Sprache, Keyword und Output bleiben", s.includes("SPRACHE:") && s.includes('"Agentic AI"') && s.includes("OUTPUT:"));
  ok("leerer Override = Default", buildAbstractSystem("en", null, "   ").includes("STILANPASSUNG"));
}

section("User-Prompt und Cleanup unveraendert");
{
  const p = buildAbstractPrompt({ title: " Titel ", bodyText: "x".repeat(MAX_BODY_CHARS + 50) });
  ok("Titel getrimmt", p.startsWith("Artikel-Titel: Titel\n"));
  ok("Body gekappt", p.length < MAX_BODY_CHARS + 60);
  ok("Guillemets weg", cleanAbstractText("«Ein Satz.»") === "Ein Satz.");
  ok("Codefence weg", cleanAbstractText("```\nText\n```") === "Text");
}

process.stdout.write(`\n${passes} passed, ${fails} failed\n`);
if (fails > 0) process.exit(1);

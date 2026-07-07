// Manueller Test-Runner fuer src/lib/ai/imageAltPrompts.ts.
//   npx tsx src/lib/ai/__tests__/imageAltPrompts.manual.ts

import {
  IMAGE_ALT_STRATEGY,
  IMAGE_ALT_SCHEMA,
  buildImageAltSystem,
  buildImageAltPrompt,
  parseImageAlt,
} from "../imageAltPrompts";

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
  ok('Schema hat alt-Feld', IMAGE_ALT_SCHEMA.includes('"alt": string'));
  ok("Schema als JSON-Objekt", IMAGE_ALT_SCHEMA.includes("NUR ein JSON-Objekt"));
}

section("Drei-Teiler: Locale vor Strategie vor Schema + Override");
{
  const sys = buildImageAltSystem("de-CH");
  ok("localeLine vor Strategie", before(sys, "SPRACHE des ALT-Texts", "Beschreibe das gezeigte Bild"));
  ok("Strategie vor Schema", before(sys, "Beschreibe das gezeigte Bild", '"alt"'));
  ok("enthaelt Code-Default-Strategie", sys.includes(IMAGE_ALT_STRATEGY));
  ok("de-CH Sprache", sys.includes("Deutsch (Schweizer Rechtschreibung)"));
  ok("en Sprache", buildImageAltSystem("en").includes("SPRACHE des ALT-Texts: Englisch"));
  ok("Strategie verbietet Einleitungsphrasen", IMAGE_ALT_STRATEGY.includes("Bild von"));

  const custom = "MEINE ALT-STRATEGIE 42";
  const withOv = buildImageAltSystem("de-CH", custom);
  ok("Override greift", withOv.includes(custom) && !withOv.includes("Beschreibe das gezeigte Bild"));
  ok("Schema trotz Override da", withOv.includes('"alt"'));
  ok("leerer Override → Default", buildImageAltSystem("de-CH", "  ") === buildImageAltSystem("de-CH"));
}

section("Prompt-Builder");
{
  ok("Titel im Prompt", buildImageAltPrompt({ articleTitle: "KI in Banken" }).includes("KI in Banken"));
  ok("leerer Titel → ohne Kontext-Zeile", !buildImageAltPrompt({ articleTitle: "  " }).includes("Kontext"));
}

section("parseImageAlt");
{
  ok("valides JSON", parseImageAlt('{"alt":"Roboterhand tippt auf Tastatur"}')?.alt === "Roboterhand tippt auf Tastatur");
  ok("getrimmt", parseImageAlt('{"alt":"  x y  "}')?.alt === "x y");
  ok("Code-Fence toleriert", parseImageAlt('```json\n{"alt":"Ein Diagramm"}\n```')?.alt === "Ein Diagramm");
  ok("kein JSON → null", parseImageAlt("kein json") === null);
  ok("fehlendes alt → null", parseImageAlt('{"foo":1}') === null);
  ok("leeres alt → null", parseImageAlt('{"alt":"   "}') === null);
  ok("alt nicht-string → null", parseImageAlt('{"alt":123}') === null);
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);

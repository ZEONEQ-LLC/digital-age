// Manueller Test-Runner fuer src/lib/ai/models.ts.
//   npx tsx src/lib/ai/__tests__/models.manual.ts
// Exit 0 = alles gruen, 1 = mind. ein Fail.
//
// Sichert die kuratierte Modell-Liste (Reihenfolge + IDs) und das
// isKnownModel-Verhalten ab — insbesondere, dass die entfernten IDs
// (Sonnet 4.6, Opus 4.6, Opus 4.7) nicht mehr als bekannt gelten, damit
// der Config-Resolver-Fallback und die "(unbekannt)"-UI korrekt greifen.

import { KNOWN_MODELS, KNOWN_MODEL_IDS, isKnownModel } from "../models";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

const EXPECTED_IDS = [
  "claude-haiku-4-5",
  "claude-sonnet-5",
  "claude-opus-4-8",
  "claude-fable-5",
];
const REMOVED_IDS = [
  "claude-sonnet-4-6",
  "claude-opus-4-6",
  "claude-opus-4-7",
];

section("KNOWN_MODELS — IDs + Reihenfolge (guenstig -> teuer)");
{
  ok("genau 4 Modelle", KNOWN_MODELS.length === 4, `len=${KNOWN_MODELS.length}`);
  ok("IDs in erwarteter Reihenfolge",
    KNOWN_MODELS.map((m) => m.id).join(",") === EXPECTED_IDS.join(","),
    KNOWN_MODELS.map((m) => m.id).join(","));
  ok("jedes Modell hat ein nicht-leeres Label",
    KNOWN_MODELS.every((m) => typeof m.label === "string" && m.label.trim() !== ""));
  ok("keine doppelten IDs", new Set(KNOWN_MODELS.map((m) => m.id)).size === KNOWN_MODELS.length);
}

section("KNOWN_MODEL_IDS — Set spiegelt die Liste");
{
  ok("Set-Groesse == Listen-Laenge", KNOWN_MODEL_IDS.size === KNOWN_MODELS.length);
  ok("Set enthaelt alle erwarteten IDs", EXPECTED_IDS.every((id) => KNOWN_MODEL_IDS.has(id)));
}

section("isKnownModel — bekannte IDs true");
for (const id of EXPECTED_IDS) {
  ok(`isKnownModel(${id}) === true`, isKnownModel(id) === true);
}

section("isKnownModel — entfernte/unbekannte IDs false");
for (const id of REMOVED_IDS) {
  ok(`isKnownModel(${id}) === false (entfernt)`, isKnownModel(id) === false);
}
{
  ok("isKnownModel('') === false", isKnownModel("") === false);
  ok("isKnownModel(Tippfehler) === false", isKnownModel("claude-opus-5-9") === false);
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);

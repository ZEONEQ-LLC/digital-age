// Manueller Test-Runner fuer die Einordnung der News (PR 199):
// src/lib/newsTicker/assessment.ts.
//
//   npx tsx src/lib/newsTicker/__tests__/assessment.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import {
  ASSESSMENT_FIELD_INSTRUCTION,
  ASSESSMENT_RUBRIC,
  MAX_WARUM,
  assessmentHighlights,
  buildAssessmentPrompt,
  parseAssessment,
  parseAssessmentReply,
  readAssessment,
  readImportance,
} from "../assessment";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}

const full = {
  wirtschaft: 3, gesellschaft: 2, umwelt: 0, dringlichkeit: 1, wichtigkeit: 3,
  warum: "Schweizer Banken müssen ihre Schnittstellen bis 2027 öffnen.",
  kehrseite: "Ob kleine Banken die Kosten tragen können, lässt die Meldung offen.",
};

console.log("=== parseAssessment ===");
{
  const r = parseAssessment(full);
  ok("gueltig", !!r && r.assessment.wirtschaft === 3 && r.importance === 3 && r.assessment.by === "ai" && r.assessment.v === 1);
  ok("Redaktion", parseAssessment(full, "editor")?.assessment.by === "editor");
  ok("Kehrseite gelesen", r?.assessment.kehrseite?.startsWith("Ob kleine Banken") === true);
  ok("KI ohne Kehrseite → null", parseAssessment({ ...full, kehrseite: undefined }) === null);
  ok("KI mit zu kurzer Kehrseite → null", parseAssessment({ ...full, kehrseite: "Aber." }) === null);
  ok("Redaktion ohne Kehrseite erlaubt", parseAssessment({ ...full, kehrseite: "" }, "editor")?.assessment.kehrseite === undefined);
  ok("Werte als Text-Ziffern", parseAssessment({ ...full, wirtschaft: "2" })?.assessment.wirtschaft === 2);
  ok("ueber 3 wird 3", parseAssessment({ ...full, gesellschaft: 7 })?.assessment.gesellschaft === 3);
  ok("unter 0 wird 0", parseAssessment({ ...full, umwelt: -2 })?.assessment.umwelt === 0);
  ok("Wichtigkeit 0 wird 1", parseAssessment({ ...full, wichtigkeit: 0 })?.importance === 1);
  ok("fehlendes Feld → null", parseAssessment({ ...full, umwelt: undefined }) === null);
  ok("Wort statt Zahl → null", parseAssessment({ ...full, dringlichkeit: "hoch" }) === null);
  ok("Kommazahl → null", parseAssessment({ ...full, wirtschaft: 2.5 }) === null);
  ok("Warum zu kurz → null", parseAssessment({ ...full, warum: "Weil." }) === null);
  ok("Array → null", parseAssessment([1, 2]) === null);
  const long = parseAssessment({ ...full, warum: "Wort ".repeat(100) });
  ok(`Warum auf ${MAX_WARUM} Zeichen`, !!long && long.assessment.warum.length <= MAX_WARUM && long.assessment.warum.endsWith("…"));
  ok("Eszett wird ss", parseAssessment({ ...full, warum: "Grosse Folgen für die Strasse, ß und mehr." })?.assessment.warum.includes("ß") === false);
}

console.log("=== parseAssessmentReply ===");
ok("JSON direkt", parseAssessmentReply(JSON.stringify(full))?.importance === 3);
ok("Code-Block", parseAssessmentReply("```json\n" + JSON.stringify(full) + "\n```")?.assessment.gesellschaft === 2);
ok("Text davor", parseAssessmentReply("Hier die Einordnung: " + JSON.stringify(full))?.assessment.wirtschaft === 3);
ok("kein JSON → null", parseAssessmentReply("Keine Angabe möglich.") === null);

console.log("=== readAssessment / readImportance ===");
{
  const stored = parseAssessment(full)!.assessment;
  ok("gespeicherte Einordnung lesbar", readAssessment(stored)?.dringlichkeit === 1);
  ok("Redaktion bleibt Redaktion", readAssessment({ ...stored, by: "editor" })?.by === "editor");
  ok("Muell → null", readAssessment({ foo: 1 }) === null && readAssessment(null) === null);
  const old = { v: 1, wirtschaft: 2, gesellschaft: 1, umwelt: 0, dringlichkeit: 1, warum: "Eine ältere Einordnung ohne Kehrseite.", by: "ai" };
  ok("alte Einordnung ohne Kehrseite lesbar", readAssessment(old)?.kehrseite === undefined && readAssessment(old)?.wirtschaft === 2);
  ok("Wichtigkeit 1-3", readImportance(2) === 2 && readImportance(4) === null && readImportance(null) === null);
}

console.log("=== Anzeige und Prompt ===");
{
  const a = parseAssessment(full)!.assessment;
  const h = assessmentHighlights(a);
  ok("nur ab mittel, hoechste zuerst", JSON.stringify(h.map((x) => x.label)) === '["Wirtschaft","Gesellschaft"]', JSON.stringify(h));
  ok("nichts ab mittel → leer", assessmentHighlights({ ...a, wirtschaft: 1, gesellschaft: 1 }).length === 0);
  const p = buildAssessmentPrompt({ title: "T", teaser: "Te", summary: "S", sourceName: "Heise" });
  ok("Nachtrag-Prompt mit Rubrik und Quelle", p.system.includes(ASSESSMENT_RUBRIC.split("\n")[0]) && p.prompt.includes("Quelle: Heise"));
  ok("Feld-Anweisung nennt einordnung", ASSESSMENT_FIELD_INSTRUCTION.includes('"einordnung"'));
}

console.log(fails === 0 ? "\nAlles gruen." : `\n${fails} Fehler.`);
process.exit(fails === 0 ? 0 : 1);

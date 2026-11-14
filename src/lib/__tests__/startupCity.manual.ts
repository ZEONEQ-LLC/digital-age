// npx tsx src/lib/__tests__/startupCity.manual.ts
import { normalizeCity } from "../startupCity";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}

ok("Zurich → Zürich", normalizeCity("Zurich") === "Zürich");
ok("ZURICH, Leerzeichen", normalizeCity("  ZURICH ") === "Zürich");
ok("Zürich bleibt", normalizeCity("Zürich") === "Zürich");
ok("Geneva/Genève → Genf", normalizeCity("Geneva") === "Genf" && normalizeCity("Genève") === "Genf");
ok("Lucerne → Luzern", normalizeCity("lucerne") === "Luzern");
ok("St Gallen", normalizeCity("st gallen") === "St. Gallen");
ok("Unbekannt: nur erster Buchstabe gross", normalizeCity("cham") === "Cham" && normalizeCity("Rapperswil-Jona") === "Rapperswil-Jona");
ok("leer bleibt leer", normalizeCity("   ") === "");

console.log(fails === 0 ? "\nAlles gruen." : `\n${fails} Fehler.`);
process.exit(fails === 0 ? 0 : 1);

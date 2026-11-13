// Manueller Test-Runner fuer die Listen-Helfer (PR 198):
// src/lib/subcategory.ts und src/lib/excerpt.ts.
//
//   npx tsx src/lib/__tests__/listHelpers.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import { canonicalSubcategories } from "../subcategory";
import { plainExcerpt } from "../excerpt";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}

console.log("=== canonicalSubcategories ===");
{
  const rows = [
    { id: 1, subcategory: "AI in Banking" }, { id: 2, subcategory: "AI in Banking" },
    { id: 3, subcategory: "AI in banking" }, { id: 4, subcategory: " AI  in Banking " },
    { id: 5, subcategory: null }, { id: 6, subcategory: "" }, { id: 7, subcategory: "KMU & KI" },
  ];
  const out = canonicalSubcategories(rows);
  ok("haeufigste Schreibweise gewinnt", out.slice(0, 4).every((r) => r.subcategory === "AI in Banking"), JSON.stringify(out.slice(0, 4)));
  ok("null bleibt null", out[4].subcategory === null);
  ok("leer bleibt leer", out[5].subcategory === "");
  ok("andere bleiben", out[6].subcategory === "KMU & KI");
  ok("Eingabe unveraendert", rows[2].subcategory === "AI in banking");
  ok("weitere Felder bleiben", out[0].id === 1 && out[6].id === 7);
}

console.log("=== plainExcerpt ===");
ok("Marker und Fett weg", plainExcerpt("{{g}}**Portable Trust**{{/g}} loest") === "Portable Trust loest");
ok("Quellen weg", plainExcerpt("Satz.[^1][^2] Weiter") === "Satz. Weiter");
ok("Links als Text", plainExcerpt("Siehe [Bericht](https://x.ch) und [[slug]](Titel)") === "Siehe Bericht und Titel");
ok("null → leer", plainExcerpt(null) === "");
ok("Leerraum zusammengefasst", plainExcerpt("a\n\n  b") === "a b");

console.log(fails === 0 ? "\nAlles gruen." : `\n${fails} Fehler.`);
process.exit(fails === 0 ? 0 : 1);

// Manueller Test-Runner fuer die Sprungmarken auf /news (PR 200):
// src/lib/newsAnchor.ts.
//
//   npx tsx src/lib/__tests__/newsAnchor.manual.ts
import { newsAnchor, newsAnchors } from "../newsAnchor";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}

const id = "8bdad75b-9aa4-4004-9064-f45dd238f064";
const a = newsAnchor({ id, title: "SpaceX und Tesla verhandeln angeblich über Fusion, Abschluss noch 2026?" });
ok("lesbar, Umlaut als ue", a.startsWith("spacex-und-tesla-verhandeln-angeblich-ueber-fusion"), a);
ok("hoechstens 60 Zeichen, an Wortgrenze", a.length <= 60 && !a.endsWith("-"), a);
ok("nur a-z, 0-9 und -", /^[a-z0-9-]+$/.test(a), a);
ok("leerer Titel → n-<id>", newsAnchor({ id, title: "???" }) === `n-${id}`);
const m = newsAnchors([
  { id: "aaaaaa11", title: "Gleicher Titel" },
  { id: "bbbbbb22", title: "Gleicher Titel" },
  { id: "cccccc33", title: "Anderer Titel" },
]);
ok("erster behaelt die Marke", m.get("aaaaaa11") === "gleicher-titel");
ok("Dublette bekommt ID-Anfang", m.get("bbbbbb22") === "gleicher-titel-bbbbbb", m.get("bbbbbb22"));
ok("andere unveraendert", m.get("cccccc33") === "anderer-titel");

console.log(fails === 0 ? "\nAlles gruen." : `\n${fails} Fehler.`);
process.exit(fails === 0 ? 0 : 1);

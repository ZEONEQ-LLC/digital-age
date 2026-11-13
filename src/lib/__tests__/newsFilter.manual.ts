// Manueller Test-Runner fuer die Filter auf /news (PR 202):
// src/lib/newsFilter.ts und plausiblePublishedAt (src/lib/newsFormat.ts).
//
//   npx tsx src/lib/__tests__/newsFilter.manual.ts
import type { NewsItem } from "../newsFormat";
import { plausiblePublishedAt } from "../newsFormat";
import { NO_FILTERS, countWith, filtersToSearch, isFiltered, matchesFilters, parseFilters } from "../newsFilter";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}

const now = new Date("2026-11-13T15:00:00Z"); // 16:00 in Zuerich
const a = (w: 0 | 1 | 2 | 3, g: 0 | 1 | 2 | 3, u: 0 | 1 | 2 | 3, d: 0 | 1 | 2 | 3) => ({ v: 1 as const, wirtschaft: w, gesellschaft: g, umwelt: u, dringlichkeit: d, warum: "Weil es wichtig ist.", by: "ai" as const });
const it = (id: string, publishedAt: string, o: Partial<NewsItem> = {}): NewsItem => ({
  id, title: id, teaser: "", summary: "", category: "ki-business", sourceName: "Heise", sourceUrl: "https://x.ch", publishedAt,
  assessment: a(1, 1, 0, 1), importance: 1, ...o,
});
const items = [
  it("heute-wirtschaft", "2026-11-13T08:00:00Z", { assessment: a(3, 1, 0, 2), importance: 3 }),
  it("heute-gesellschaft", "2026-11-13T06:00:00Z", { assessment: a(1, 2, 0, 1), importance: 2, category: "future-tech" }),
  it("gestern-umwelt", "2026-11-12T10:00:00Z", { assessment: a(0, 0, 2, 0), importance: 2 }),
  it("vor-5-tagen", "2026-11-08T10:00:00Z"),
  it("vor-20-tagen", "2026-10-24T10:00:00Z"),
  it("ohne-einordnung", "2026-11-13T07:00:00Z", { assessment: null, importance: null }),
];
const ids = (f: typeof NO_FILTERS) => items.filter((x) => matchesFilters(x, f, now)).map((x) => x.id).join(",");

console.log("=== matchesFilters ===");
ok("ohne Filter alles", ids(NO_FILTERS).split(",").length === items.length);
ok("heute", ids({ ...NO_FILTERS, zeit: "heute" }) === "heute-wirtschaft,heute-gesellschaft,ohne-einordnung");
ok("gestern", ids({ ...NO_FILTERS, zeit: "gestern" }) === "gestern-umwelt");
ok("letzte 7 Tage ohne 20 Tage alte", !ids({ ...NO_FILTERS, zeit: "7" }).includes("vor-20-tagen") && ids({ ...NO_FILTERS, zeit: "7" }).includes("vor-5-tagen"));
ok("Bereich Wirtschaft ab mittel", ids({ ...NO_FILTERS, bereiche: ["wirtschaft"] }) === "heute-wirtschaft");
ok("Bereiche oder-verknuepft", ids({ ...NO_FILTERS, bereiche: ["wirtschaft", "umwelt"] }) === "heute-wirtschaft,gestern-umwelt");
ok("Bereich ohne Einordnung → raus", !ids({ ...NO_FILTERS, bereiche: ["gesellschaft"] }).includes("ohne-einordnung"));
ok("nur wichtige", ids({ ...NO_FILTERS, relevanz: "wichtig" }) === "heute-wirtschaft");
ok("relevant und wichtig", ids({ ...NO_FILTERS, relevanz: "relevant" }) === "heute-wirtschaft,heute-gesellschaft,gestern-umwelt");
ok("Rubrik", ids({ ...NO_FILTERS, rubrik: "future-tech" }) === "heute-gesellschaft");
ok("kombiniert", ids({ zeit: "heute", bereiche: ["gesellschaft"], relevanz: "relevant", rubrik: null }) === "heute-gesellschaft");
ok("Zahl am Chip", countWith(items, { ...NO_FILTERS, zeit: "heute" }, now, { bereiche: ["wirtschaft"] }) === 1);

console.log("=== URL ===");
{
  const f = parseFilters("?zeit=7&bereich=wirtschaft,gesellschaft,quatsch,wirtschaft&relevanz=wichtig&rubrik=ki-business");
  ok("parse", f.zeit === "7" && f.bereiche.join() === "wirtschaft,gesellschaft" && f.relevanz === "wichtig" && f.rubrik === "ki-business", JSON.stringify(f));
  ok("Muell → Standard", JSON.stringify(parseFilters("?zeit=gestern2&relevanz=x&rubrik=<script>")) === JSON.stringify(NO_FILTERS));
  ok("zurueck in die URL", filtersToSearch(f) === "?zeit=7&bereich=wirtschaft%2Cgesellschaft&relevanz=wichtig&rubrik=ki-business", filtersToSearch(f));
  ok("ohne Filter leer", filtersToSearch(NO_FILTERS) === "" && !isFiltered(NO_FILTERS) && isFiltered(f));
}

console.log("=== plausiblePublishedAt ===");
ok("Zukunftsdatum → Anlegezeit", plausiblePublishedAt("2026-11-30T06:00:00+00:00", "2026-11-13T16:07:39+00:00") === "2026-11-13T16:07:39+00:00");
ok("normales Datum bleibt", plausiblePublishedAt("2026-11-13T06:00:00+00:00", "2026-11-13T16:07:39+00:00") === "2026-11-13T06:00:00+00:00");
ok("fehlt → Anlegezeit", plausiblePublishedAt(null, "2026-11-13T16:07:39+00:00") === "2026-11-13T16:07:39+00:00");

console.log(fails === 0 ? "\nAlles gruen." : `\n${fails} Fehler.`);
process.exit(fails === 0 ? 0 : 1);

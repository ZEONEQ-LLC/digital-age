// npx tsx src/lib/__tests__/startupTrust.manual.ts
import { directoryCountLabel, formatVerifiedDate, investorInfoStale } from "../startupTrust";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}

const now = new Date("2026-11-14T10:00:00Z");
const s = (o: Partial<{ open_to_investment: boolean; last_round_at: string | null; verified_at: string | null }> = {}) => ({
  open_to_investment: true, last_round_at: "2026-03-01", verified_at: "2026-09-01T00:00:00Z", ...o,
});

ok("nicht offen = kein Hinweis", investorInfoStale(s({ open_to_investment: false, verified_at: null }), now) === null);
ok("frisch bestätigt, Runde aktuell = kein Hinweis", investorInfoStale(s(), now) === null);
ok("nie bestätigt", investorInfoStale(s({ verified_at: null }), now) === "Angaben nie bestätigt");
ok("vor 13 Monaten bestätigt", investorInfoStale(s({ verified_at: "2025-10-01T00:00:00Z" }), now)?.includes("über 12 Monaten") === true);
ok("Runde vor 20 Monaten", investorInfoStale(s({ last_round_at: "2025-03-01" }), now)?.includes("über 18 Monaten") === true);
ok("ohne Runde, bestätigt = kein Hinweis", investorInfoStale(s({ last_round_at: null }), now) === null);
ok("kaputtes Datum = nie bestätigt", investorInfoStale(s({ verified_at: "kaputt" }), now) === "Angaben nie bestätigt");

ok("Datum in Zürich", formatVerifiedDate("2026-11-13T23:30:00Z") === "14. November 2026", String(formatVerifiedDate("2026-11-13T23:30:00Z")));
ok("leer = null", formatVerifiedDate(null) === null && formatVerifiedDate("x") === null);

ok("Zähler mit Spotlight", directoryCountLabel(52, 1) === "52 Unternehmen, davon 1 im Spotlight");
ok("Zähler ohne Spotlight", directoryCountLabel(7, 0) === "7 Unternehmen");

console.log(fails === 0 ? "\nAlles gruen." : `\n${fails} Fehler.`);
process.exit(fails === 0 ? 0 : 1);

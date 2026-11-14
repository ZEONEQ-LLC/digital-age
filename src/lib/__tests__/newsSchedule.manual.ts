// Manueller Test-Runner fuer die Laufzeiten des News-Tickers
// (src/lib/newsTicker/schedule.ts) und die Statistik eines Laufs
// (src/lib/newsTicker/stats.ts).
//
//   npx tsx src/lib/__tests__/newsSchedule.manual.ts
import { DEFAULT_TICKER_HOURS, describeHours, formatHour, hoursOrDefault, isScheduledHour, nextRunHour, normalizeHours, toggleHour } from "../newsTicker/schedule";
import { emptyRefreshStats, parseRefreshStats } from "../newsTicker/stats";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}
const eq = (label: string, got: unknown, want: unknown) =>
  ok(label, JSON.stringify(got) === JSON.stringify(want), `erhalten ${JSON.stringify(got)}, erwartet ${JSON.stringify(want)}`);

// normalizeHours
eq("sortiert und entfernt Doppelte", normalizeHours([18, 7, 12, 7]), [7, 12, 18]);
eq("verwirft Werte ausserhalb 0–23", normalizeHours([-1, 0, 23, 24, 7.5]), [0, 23]);
eq("liest Zahlen als Text (Formular)", normalizeHours(["7", " 12 ", "x", ""]), [7, 12]);
eq("kein Array ergibt leer", normalizeHours("7,12"), []);
eq("null ergibt leer", normalizeHours(null), []);

// hoursOrDefault
eq("leer faellt auf den Standard", hoursOrDefault([]), [...DEFAULT_TICKER_HOURS]);
eq("Standard ist Morgen, Mittag, Abend", [...DEFAULT_TICKER_HOURS], [7, 12, 18]);
eq("gueltige Liste bleibt", hoursOrDefault([6, 20]), [6, 20]);
ok("Standard wird kopiert, nicht geteilt", hoursOrDefault(null) !== DEFAULT_TICKER_HOURS);

// isScheduledHour
ok("12 Uhr ist Laufstunde", isScheduledHour([7, 12, 18], 12));
ok("13 Uhr ist keine Laufstunde", !isScheduledHour([7, 12, 18], 13));
ok("leere Liste laeuft nie", !isScheduledHour([], 7));

// toggleHour
eq("fuegt eine Stunde sortiert ein", toggleHour([7, 18], 12), [7, 12, 18]);
eq("entfernt eine gewaehlte Stunde", toggleHour([7, 12, 18], 12), [7, 18]);
eq("die letzte Stunde laesst sich abwaehlen (Pruefung im Formular)", toggleHour([7], 7), []);

// formatHour und describeHours
eq("formatHour fuellt auf", formatHour(7), "07:00");
eq("eine Stunde", describeHours([7]), "07:00 Uhr");
eq("zwei Stunden", describeHours([18, 7]), "07:00 und 18:00 Uhr");
eq("drei Stunden", describeHours([7, 12, 18]), "07:00, 12:00 und 18:00 Uhr");
eq("keine Stunde", describeHours([]), "");

// nextRunHour
eq("naechster Lauf heute", nextRunHour([7, 12, 18], 9), { hour: 12, tomorrow: false });
eq("in der Laufstunde zaehlt der naechste", nextRunHour([7, 12, 18], 12), { hour: 18, tomorrow: false });
eq("nach dem letzten Lauf: morgen frueh", nextRunHour([7, 12, 18], 20), { hour: 7, tomorrow: true });
eq("ohne Stunden kein Lauf", nextRunHour([], 9), null);

// Statistik: neues Feld items_skipped_known
const empty = emptyRefreshStats();
eq("neue Statistik startet bei 0 bekannten Aussortierten", empty.items_skipped_known, 0);
const parsed = parseRefreshStats({ items_fetched: 20, sources_polled: 4, items_generated: 2, items_skipped_dedup: 12, items_skipped_generation: 1, items_skipped_known: 5, items_failed: 0, errors: [] });
eq("liest items_skipped_known", parsed?.items_skipped_known, 5);
const legacy = parseRefreshStats({ items_fetched: 20, sources_polled: 4, items_generated: 3, items_skipped_dedup: 14, items_skipped_generation: 3, items_failed: 0, errors: [] });
ok("aeltere Laeufe haben das Feld nicht", legacy !== null && legacy.items_skipped_known === undefined);

console.log(fails === 0 ? "\nAlle Tests gruen." : `\n${fails} Test(s) fehlgeschlagen.`);
process.exit(fails === 0 ? 0 : 1);

// Manueller Test-Runner fuer bookingState / isBookingActive (src/lib/ads/types.ts).
//
//   npx tsx src/lib/ads/__tests__/bookingState.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import { bookingState, isBookingActive } from "../types";

let fails = 0;
function eq(label: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`      erwartet: ${String(expected)}\n      erhalten: ${String(actual)}`);
}

const now = Date.parse("2026-11-01T12:00:00Z");
const past = '["2026-09-30 22:00:00+00","2026-10-31 23:00:00+00")';
const current = '["2026-10-31 23:00:00+00","2026-11-30 23:00:00+00")';
const future = '["2026-11-30 23:00:00+00","2026-12-31 23:00:00+00")';
const open = '["2026-10-31 23:00:00+00",)';

eq("abgelaufen", bookingState({ period: past, paused_at: null, archived_at: null }, now), "expired");
eq("live", bookingState({ period: current, paused_at: null, archived_at: null }, now), "live");
eq("geplant", bookingState({ period: future, paused_at: null, archived_at: null }, now), "planned");
eq("unbefristet = live", bookingState({ period: open, paused_at: null, archived_at: null }, now), "live");
eq("pausiert schlaegt Zeitraum", bookingState({ period: current, paused_at: "2026-11-01T00:00:00Z", archived_at: null }, now), "paused");
eq("archiviert schlaegt pausiert", bookingState({ period: current, paused_at: "2026-11-01T00:00:00Z", archived_at: "2026-11-01T01:00:00Z" }, now), "archived");
eq("archiviert + abgelaufen = archiviert", bookingState({ period: past, paused_at: null, archived_at: "2026-11-01T01:00:00Z" }, now), "archived");
eq("Ende exakt jetzt = abgelaufen (exklusiv)", bookingState({ period: '["2026-10-01 00:00:00+00","2026-11-01 12:00:00+00")', paused_at: null, archived_at: null }, now), "expired");

eq("aktiv", isBookingActive({ paused_at: null, archived_at: null }), true);
eq("pausiert nicht aktiv", isBookingActive({ paused_at: "x", archived_at: null }), false);
eq("archiviert nicht aktiv", isBookingActive({ paused_at: null, archived_at: "x" }), false);

console.log(fails === 0 ? "\nalles gruen" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);

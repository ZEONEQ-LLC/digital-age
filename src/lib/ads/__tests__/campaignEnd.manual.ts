// Manueller Test-Runner fuer src/lib/ads/campaignEnd.ts (Abschlussbericht,
// Ablauf des Vorschau-Links 30 Tage nach Kampagnenende).
//
//   npx tsx src/lib/ads/__tests__/campaignEnd.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import { campaignEnd, endReportDue, formatLastDay, previewValidity } from "../campaignEnd";

let fails = 0;
function eq(label: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`      erwartet: ${String(expected)}\n      erhalten: ${String(actual)}`);
}

// Ende 30.11.2026 24:00 Zuerich = 2026-11-30 23:00 UTC.
const END = "2026-11-30 23:00:00+00";
const END_MS = Date.parse("2026-11-30T23:00:00Z");
const nov = `["2026-10-31 23:00:00+00","${END}")`;
const oct = '["2026-09-30 22:00:00+00","2026-10-31 23:00:00+00")';
const open = '["2026-10-31 23:00:00+00",)';
const b = (period: string, extra: Partial<{ archived_at: string | null; end_report_sent_at: string | null }> = {}) => ({
  period, archived_at: null, end_report_sent_at: null, ...extra,
});
const live = (bookings: ReturnType<typeof b>[], extra: Partial<{ isHouse: boolean; status: string }> = {}) => ({
  isHouse: false, status: "live", bookings, ...extra,
});
const H = 3_600_000;
const D = 24 * H;

console.log("=== campaignEnd ===");
eq("spaetestes Ende", campaignEnd([b(oct), b(nov)])?.getTime(), END_MS);
eq("archivierte zaehlen nicht", campaignEnd([b(oct), b(nov, { archived_at: "2026-11-01T00:00:00Z" })])?.getTime(), Date.parse("2026-10-31T23:00:00Z"));
eq("offenes Ende = null", campaignEnd([b(nov), b(open)]), null);
eq("keine Buchung = null", campaignEnd([]), null);
eq("nur archiviert = null", campaignEnd([b(nov, { archived_at: "2026-11-01T00:00:00Z" })]), null);
eq("unlesbar = null", campaignEnd([b("kaputt")]), null);
eq("letzter Tag inklusiv", formatLastDay(new Date(END_MS)), "30.11.2026");

console.log("=== endReportDue ===");
eq("vor dem Ende: nein", endReportDue(live([b(nov)]), END_MS - H), null);
eq("genau am Ende: ja", endReportDue(live([b(nov)]), END_MS)?.getTime(), END_MS);
eq("Cron am Morgen danach (06:00 UTC): ja", endReportDue(live([b(nov)]), END_MS + 6 * H)?.getTime(), END_MS);
eq("2 Tage spaeter (Lauf ausgefallen): ja", endReportDue(live([b(nov)]), END_MS + 2 * D)?.getTime(), END_MS);
eq("3 Tage spaeter: nein (alte Kampagne)", endReportDue(live([b(nov)]), END_MS + 3 * D), null);
eq("schon gesendet: nein", endReportDue(live([b(nov, { end_report_sent_at: "2026-12-01T05:00:00Z" })]), END_MS + 6 * H), null);
eq("eine Buchung neu ohne Bericht: ja", endReportDue(live([b(nov, { end_report_sent_at: "2026-12-01T05:00:00Z" }), b(oct)]), END_MS + 6 * H)?.getTime(), END_MS);
eq("andere Buchung laeuft noch: nein", endReportDue(live([b(oct), b(nov)]), Date.parse("2026-11-01T06:00:00Z")), null);
eq("offene Buchung: nein", endReportDue(live([b(oct), b(open)]), Date.parse("2026-11-01T06:00:00Z")), null);
eq("House: nein", endReportDue(live([b(nov)], { isHouse: true }), END_MS + 6 * H), null);
eq("Status beendet: ja", endReportDue(live([b(nov)], { status: "ended" }), END_MS + 6 * H)?.getTime(), END_MS);
eq("Status pausiert: ja", endReportDue(live([b(nov)], { status: "paused" }), END_MS + 6 * H)?.getTime(), END_MS);
eq("Angebot: nein", endReportDue(live([b(nov)], { status: "offer" }), END_MS + 6 * H), null);
eq("Storniert: nein", endReportDue(live([b(nov)], { status: "cancelled" }), END_MS + 6 * H), null);

console.log("=== previewValidity ===");
const v1 = previewValidity(live([b(nov)]), END_MS - D);
eq("laeuft noch: gueltig, kein Datum", v1.expired === false && v1.expiresAt === null, true);
const v2 = previewValidity(live([b(nov)]), END_MS + D);
eq("nach Ende: gueltig mit Datum", v2.expired === false && v2.expiresAt?.getTime() === END_MS + 30 * D, true);
eq("gueltig bis (Anzeige)", v2.expired === false && v2.expiresAt ? formatLastDay(v2.expiresAt) : "", "30.12.2026");
eq("29 Tage nach Ende: gueltig", previewValidity(live([b(nov)]), END_MS + 29 * D).expired, false);
eq("30 Tage nach Ende: abgelaufen", previewValidity(live([b(nov)]), END_MS + 30 * D).expired, true);
eq("House nie", previewValidity(live([b(nov)], { isHouse: true }), END_MS + 90 * D).expired, false);
eq("Entwurf nie", previewValidity(live([b(nov)], { status: "draft" }), END_MS + 90 * D).expired, false);
eq("offen nie", previewValidity(live([b(open)]), END_MS + 90 * D).expired, false);
const dec5 = Date.parse("2026-12-05T00:00:00Z");
eq("Ende 31.10., am 05.12. abgelaufen", previewValidity(live([b(oct)]), dec5).expired, true);
eq("dieselbe Buchung bis 30.11. verlaengert: wieder gueltig", previewValidity(live([b(nov)]), dec5).expired, false);

console.log(fails === 0 ? "\nAlles gruen." : `\n${fails} Fehler.`);
process.exit(fails === 0 ? 0 : 1);

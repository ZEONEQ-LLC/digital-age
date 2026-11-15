// npx tsx src/lib/stats/__tests__/summary.manual.ts
import assert from "node:assert/strict";

import {
  addDays,
  avgSeconds,
  bucketForSpan,
  bucketLabel,
  bucketStart,
  bucketTick,
  buildArticleLines,
  daysBetween,
  depthFunnel,
  fillSeries,
  formatCount,
  formatDayCH,
  formatDuration,
  formatPercent,
  niceTicks,
  parseRange,
  rangeWindow,
  readRatio,
  resolveWindow,
  sourceBreakdown,
  sumTotals,
  tickIndexes,
  toTotals,
  zeroTotals,
  zurichToday,
  type ArticleStatRow,
  type StatsArticle,
} from "../summary";

const NB = " ";

// --- Summen und Kennzahlen --------------------------------------------------
const a = toTotals({ views: 10, reads: "4", seconds: 1200, d25: 8, d50: 6, d75: 5, d100: 4, src_search: 6, src_direct: 4 });
assert.equal(a.reads, 4);
assert.equal(a.shares, 0);
const b = toTotals({ views: 5, reads: 1, seconds: 300, src_ai: 5, shares: 2 });
const sum = sumTotals([a, b]);
assert.equal(sum.views, 15);
assert.equal(sum.seconds, 1500);
assert.equal(sum.shares, 2);
// Unsinnige Werte werden zu 0.
assert.equal(toTotals({ views: -3, reads: "abc" as unknown as number }).views, 0);

assert.equal(readRatio(a), 0.4);
assert.equal(readRatio(zeroTotals()), null);
// «gelesen» kann am Folgetag eintreffen: nie ueber 100 Prozent.
assert.equal(readRatio({ views: 2, reads: 3 }), 1);
assert.equal(avgSeconds(a), 120);
assert.equal(avgSeconds(zeroTotals()), null);

assert.equal(formatPercent(0.444), `44${NB}%`);
assert.equal(formatPercent(null), "–");
assert.equal(formatDuration(null), "–");
assert.equal(formatDuration(45.4), `45${NB}s`);
assert.equal(formatDuration(200), `3:20${NB}min`);
assert.equal(formatDuration(59.6), `1:00${NB}min`);
assert.equal(formatDuration(3725), `1:02${NB}h`);
assert.match(formatCount(12840), /^12.840$/);
assert.equal(formatCount(7), "7");

// --- Herkunft ---------------------------------------------------------------
const src = sourceBreakdown(sum);
assert.deepEqual(src.map((l) => l.key), ["search", "ai", "direct"]);
assert.equal(src[0].label, "Suchmaschinen");
assert.equal(src[0].share, 6 / 15);
assert.equal(src.reduce((n, l) => n + l.share, 0), 1);
assert.deepEqual(sourceBreakdown(zeroTotals()), []);

// --- Lesetiefe --------------------------------------------------------------
const depth = depthFunnel(a);
assert.deepEqual(depth.map((d) => d.count), [10, 8, 6, 5, 4]);
assert.deepEqual(depth.map((d) => d.share), [1, 0.8, 0.6, 0.5, 0.4]);
assert.equal(depth[4].label, "Bis zum Ende");
// Nie ueber den Aufrufen und nie wieder ansteigend.
const odd = depthFunnel(toTotals({ views: 4, d25: 6, d50: 2, d75: 3, d100: 1 }));
assert.deepEqual(odd.map((d) => d.count), [4, 4, 2, 2, 1]);
assert.deepEqual(depthFunnel(zeroTotals()), []);

// --- Zeitraum ---------------------------------------------------------------
assert.equal(parseRange("7"), "7");
assert.equal(parseRange("alle"), "alle");
assert.equal(parseRange("x"), "30");
assert.equal(parseRange(undefined), "30");
assert.equal(parseRange(["90", "7"]), "90");

// Kurz nach Mitternacht in Zuerich ist es in UTC noch der Vortag.
assert.equal(zurichToday(new Date("2026-11-15T23:30:00Z")), "2026-11-16");
assert.equal(zurichToday(new Date("2026-07-01T21:59:00Z")), "2026-07-01");
assert.equal(zurichToday(new Date("2026-07-01T22:01:00Z")), "2026-07-02");

assert.equal(addDays("2026-11-16", -29), "2026-10-18");
assert.equal(addDays("2026-12-31", 1), "2027-01-01");
assert.equal(addDays("2027-03-28", 1), "2027-03-29"); // Sommerzeit-Umstellung
assert.equal(daysBetween("2026-11-10", "2026-11-16"), 6);

assert.deepEqual(rangeWindow("7", "2026-11-16"), { from: "2026-11-10", to: "2026-11-16" });
assert.deepEqual(rangeWindow("alle", "2026-11-16"), { from: null, to: "2026-11-16" });
assert.equal(bucketForSpan(90), "day");
assert.equal(bucketForSpan(365), "week");
assert.equal(bucketForSpan(1200), "month");
assert.deepEqual(resolveWindow("30", "2026-11-16", null), { from: "2026-10-18", to: "2026-11-16", bucket: "day" });
assert.deepEqual(resolveWindow("365", "2026-11-16", null), { from: "2025-11-17", to: "2026-11-16", bucket: "week" });
assert.deepEqual(resolveWindow("alle", "2026-11-16", "2026-11-14"), { from: "2026-11-14", to: "2026-11-16", bucket: "day" });
assert.deepEqual(resolveWindow("alle", "2027-06-01", "2026-11-14"), { from: "2026-11-14", to: "2027-06-01", bucket: "week" });
assert.deepEqual(resolveWindow("alle", "2026-11-16", null), { from: "2026-10-18", to: "2026-11-16", bucket: "day" });

// 16.11.2026 ist ein Montag.
assert.equal(bucketStart("2026-11-18", "week"), "2026-11-16");
assert.equal(bucketStart("2026-11-16", "week"), "2026-11-16");
assert.equal(bucketStart("2026-11-22", "week"), "2026-11-16");
assert.equal(bucketStart("2026-11-18", "month"), "2026-11-01");
assert.equal(bucketStart("2026-11-18", "day"), "2026-11-18");

const filled = fillSeries([{ bucket: "2026-11-15", views: 3, reads: 1, seconds: 90 }], "2026-11-13", "2026-11-16", "day");
assert.deepEqual(filled.map((p) => p.bucket), ["2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16"]);
assert.deepEqual(filled.map((p) => p.views), [0, 0, 3, 0]);
assert.equal(fillSeries([], "2026-11-10", "2026-11-16", "day").length, 7);
const weeks = fillSeries([{ bucket: "2026-11-09", views: 5, reads: 0, seconds: 0 }], "2026-11-04", "2026-11-18", "week");
assert.deepEqual(weeks.map((p) => p.bucket), ["2026-11-02", "2026-11-09", "2026-11-16"]);
assert.deepEqual(weeks.map((p) => p.views), [0, 5, 0]);
const months = fillSeries([], "2026-11-20", "2027-02-03", "month");
assert.deepEqual(months.map((p) => p.bucket), ["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01"]);
assert.equal(fillSeries([], "2026-11-17", "2025-11-16", "week").length, 0);
assert.equal(fillSeries([], "2025-11-17", "2026-11-16", "week").length, 53);

assert.equal(bucketLabel("2026-11-16", "day"), "Mo, 16.11.2026");
assert.equal(bucketLabel("2026-11-16", "week"), "Woche vom 16.11.2026");
assert.equal(bucketLabel("2026-11-01", "month"), "November 2026");
assert.equal(bucketTick("2026-11-16", "day"), "16.11.");
assert.equal(bucketTick("2026-11-01", "month"), "Nov. 26");
assert.equal(formatDayCH("2026-11-03T09:00:00+00:00"), "03.11.2026");
assert.equal(formatDayCH(null), "");

assert.deepEqual(tickIndexes(0), []);
assert.deepEqual(tickIndexes(4), [0, 1, 2, 3]);
assert.deepEqual(tickIndexes(30, 6), [0, 6, 12, 17, 23, 29]);
assert.deepEqual(tickIndexes(7, 7), [0, 1, 2, 3, 4, 5, 6]);

assert.deepEqual(niceTicks(0), [0, 1]);
assert.deepEqual(niceTicks(3), [0, 1, 2, 3]);
assert.deepEqual(niceTicks(12), [0, 5, 10, 15]);
assert.deepEqual(niceTicks(47), [0, 20, 40, 60]);
assert.deepEqual(niceTicks(600), [0, 200, 400, 600]);
assert.deepEqual(niceTicks(1), [0, 1]);
for (const m of [1, 2, 7, 9, 13, 99, 101, 2500]) {
  const t = niceTicks(m);
  assert.ok(t[t.length - 1] >= m, `ticks decken ${m}`);
  assert.ok(t.every((v) => Number.isInteger(v)), `ganze Zahlen bei ${m}`);
  assert.ok(t.length <= 6, `wenige Ticks bei ${m}`);
}

// --- Beitraege --------------------------------------------------------------
const art = (id: string, title: string, status: string, published_at: string | null): StatsArticle => ({
  id, title, slug: id, status, published_at, author_id: "x", author_name: "Autorin", content_type: "editorial",
});
const row = (article_id: string, views: number, reads: number): ArticleStatRow => ({
  ...zeroTotals(), article_id, views, reads, seconds: views * 60, first_day: "2026-11-15", last_day: "2026-11-16",
});
const lines = buildArticleLines(
  [
    art("a", "Alt ohne Zahlen", "published", "2026-01-01T08:00:00Z"),
    art("b", "Meistgelesen", "published", "2026-10-01T08:00:00Z"),
    art("c", "Entwurf", "draft", null),
    art("d", "Archiviert mit Zahlen", "archived", "2026-05-01T08:00:00Z"),
    art("e", "Neu ohne Zahlen", "published", "2026-11-10T08:00:00Z"),
    art("f", "Archiviert ohne Zahlen", "archived", "2026-02-01T08:00:00Z"),
  ],
  [row("b", 40, 10), row("d", 3, 3), row("zz", 99, 1)],
);
assert.deepEqual(lines.map((l) => l.id), ["b", "d", "e", "a"]);
assert.equal(lines[0].ratio, 0.25);
assert.equal(lines[0].avg, 60);
assert.equal(lines[2].ratio, null);

console.log("summary: alle Tests gruen");

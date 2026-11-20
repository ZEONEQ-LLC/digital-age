// npx tsx src/lib/showcase/__tests__/kit.manual.ts
import assert from "node:assert/strict";

import {
  badgeSnippet,
  companyHost,
  formatDuration,
  isCompanyLink,
  isKitToken,
  kitShareUrl,
  reportDue,
  reportUntil,
  sumFigures,
  type KitStatsRow,
} from "../kit";
import { classifySource, parseReadEvent } from "../../stats/reading";

// Token
assert.equal(isKitToken("a".repeat(36)), true);
assert.equal(isKitToken("a".repeat(35)), false);
assert.equal(isKitToken("A".repeat(36)), false);
assert.equal(isKitToken(null), false);

// Host und Links
assert.equal(companyHost("https://www.Beispiel.ch/de"), "beispiel.ch");
assert.equal(companyHost("http://beispiel.ch"), "beispiel.ch");
assert.equal(companyHost("beispiel.ch"), null);
assert.equal(companyHost("mailto:x@beispiel.ch"), null);
assert.equal(companyHost(null), null);
const h = "beispiel.ch";
assert.equal(isCompanyLink("https://beispiel.ch/produkt", h), true);
assert.equal(isCompanyLink("https://www.beispiel.ch", h), true);
assert.equal(isCompanyLink("https://shop.beispiel.ch/x", h), true);
assert.equal(isCompanyLink("https://notbeispiel.ch", h), false);
assert.equal(isCompanyLink("https://beispiel.ch.evil.com", h), false);
assert.equal(isCompanyLink("/showcase/x", h), false);
assert.equal(isCompanyLink("javascript:alert(1)", h), false);
assert.equal(isCompanyLink("https://beispiel.ch", null), false);

// Links pro Kanal und Herkunft in der Lesestatistik
const li = kitShareUrl("https://digital-age.ch", "mein-beitrag", "linkedin");
assert.equal(li, "https://digital-age.ch/showcase/mein-beitrag?utm_source=linkedin&utm_medium=social&utm_campaign=showcase-mein-beitrag");
assert.equal(classifySource({ landing: true, pageUrl: li, referrer: "" }), "social");
const mail = kitShareUrl("https://digital-age.ch", "mein-beitrag", "email");
assert.equal(classifySource({ landing: true, pageUrl: mail, referrer: "" }), "mail");
const web = kitShareUrl("https://digital-age.ch", "mein-beitrag", "website");
assert.equal(classifySource({ landing: true, pageUrl: web, referrer: "https://beispiel.ch/presse" }), "other");

// Badge: Attribute maskiert, kein Skript
const snip = badgeSnippet("https://digital-age.ch", "b", 'A "B" <AG>');
assert.ok(snip.includes("&quot;B&quot; &lt;AG&gt;"));
assert.ok(!snip.includes("<script"));
assert.ok(snip.includes("utm_source=company-website"));

// Zaehler-Aktion «website»
assert.deepEqual(parseReadEvent({ a: "11111111-1111-4111-8111-111111111111", x: "website" }), { a: "11111111-1111-4111-8111-111111111111", x: "website" });
assert.equal(parseReadEvent({ a: "11111111-1111-4111-8111-111111111111", x: "klick" }), null);

// Summen
const row = (day: string, views: number, extra: Partial<KitStatsRow> = {}): KitStatsRow => ({
  day, views, reads: 0, seconds: 0, website_clicks: 0,
  src_search: 0, src_social: views, src_mail: 0, src_ai: 0, src_internal: 0, src_direct: 0, src_other: 0, ...extra,
});
const rows = [row("2026-12-01", 10, { reads: 4, seconds: 600, website_clicks: 2 }), row("2026-12-30", 5, { seconds: 100 }), row("2026-12-31", 7)];
const all = sumFigures(rows);
assert.equal(all.views, 22);
assert.equal(all.websiteClicks, 2);
const first30 = sumFigures(rows, "2026-12-30");
assert.equal(first30.views, 15);
assert.equal(first30.avgSeconds, 47);
assert.deepEqual(first30.sources.map((s) => s.key), ["social"]);
assert.equal(sumFigures([]).avgSeconds, null);
assert.equal(formatDuration(47), "47 s");
assert.equal(formatDuration(120), "2 min");
assert.equal(formatDuration(135), "2 min 15 s");

// Zeitraum: erschienen am 01.12. (Zuerich) -> 30 Tage bis 30.12.
assert.equal(reportUntil("2026-12-01T08:00:00Z"), "2026-12-30");
// 23:30 UTC am 30.11. ist in Zuerich schon der 01.12.
assert.equal(reportUntil("2026-11-30T23:30:00Z"), "2026-12-30");
assert.equal(reportDue("2026-12-01T08:00:00Z", new Date("2026-12-30T20:00:00Z")), false);
assert.equal(reportDue("2026-12-01T08:00:00Z", new Date("2026-12-31T05:00:00Z")), true);
assert.equal(reportDue("2026-12-01T08:00:00Z", new Date("2027-01-13T05:00:00Z")), true);
assert.equal(reportDue("2026-12-01T08:00:00Z", new Date("2027-01-14T05:00:00Z")), false);
assert.equal(reportDue(null, new Date()), false);

console.log("kit: ok");

// Manueller Test-Runner fuer Newsletter-Ausgaben (PR 195):
// src/lib/newsletter/issue.ts und src/lib/ai/newsletterPrompts.ts.
//
//   npx tsx src/lib/newsletter/__tests__/issue.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import {
  MAX_ITEMS,
  UNSUBSCRIBE_PLACEHOLDER,
  issueCampaign,
  nextPeriod,
  personalize,
  sanitizeItems,
  trackedArticleUrl,
  validateForSend,
} from "../issue";
import { buildNewsletterDraftPrompt, parseNewsletterDraft, NEWSLETTER_DRAFT_STRATEGY } from "../../ai/newsletterPrompts";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}

const item = (n: number, extra: Record<string, unknown> = {}) => ({
  articleId: `id-${n}`, slug: `artikel-${n}`, title: `Titel ${n}`, teaser: `Kurztext ${n}`, category: "KI im Business",
  coverUrl: "https://example.com/c.png", ...extra,
});

console.log("=== sanitizeItems ===");
ok("kein Array = leer", sanitizeItems(null).length === 0 && sanitizeItems({}).length === 0);
ok("gueltige bleiben", sanitizeItems([item(1), item(2)]).length === 2);
ok("ohne Titel/Slug/ID faellt weg", sanitizeItems([item(1, { title: "" }), item(2, { slug: 3 }), item(3, { articleId: null })]).length === 0);
ok("Dubletten fallen weg", sanitizeItems([item(1), item(1, { title: "anders" })]).length === 1);
ok(`hoechstens ${MAX_ITEMS}`, sanitizeItems(Array.from({ length: 12 }, (_, i) => item(i))).length === MAX_ITEMS);
ok("Leerraum normalisiert, Teaser gekuerzt", (() => {
  const [r] = sanitizeItems([item(1, { teaser: `  a\n\n b  ${"x".repeat(600)}` })]);
  return r.teaser.startsWith("a b ") && r.teaser.length === 400;
})());
ok("nur https-Bilder", sanitizeItems([item(1, { coverUrl: "http://x/y.png" }), item(2, { coverUrl: "javascript:alert(1)" })]).every((r) => r.coverUrl === null));
ok("fremde Felder fallen weg", !("evil" in sanitizeItems([item(1, { evil: "<script>" })])[0]));

console.log("=== validateForSend ===");
ok("ok", validateForSend({ subject: "Betreff", items: sanitizeItems([item(1)]) }).ok);
ok("Betreff fehlt", !validateForSend({ subject: "  ", items: sanitizeItems([item(1)]) }).ok);
ok("keine Artikel", !validateForSend({ subject: "B", items: [] }).ok);
const v = validateForSend({ subject: "B", items: sanitizeItems([item(1, { teaser: "" })]) });
ok("leerer Kurztext nennt den Titel", !v.ok && v.error.includes("Titel 1"));

console.log("=== nextPeriod ===");
const now = new Date("2026-11-16T05:30:00Z");
ok("ohne Ausgabe: 7 Tage", nextPeriod(null, now).from.toISOString() === "2026-11-09T05:30:00.000Z");
ok("ab letzter Ausgabe", nextPeriod("2026-11-12T08:00:00Z", now).from.toISOString() === "2026-11-12T08:00:00.000Z");
ok("Zukunft/kaputt: Fallback", nextPeriod("2027-01-01T00:00:00Z", now).from.toISOString() === "2026-11-09T05:30:00.000Z" && nextPeriod("kaputt", now).from.toISOString() === "2026-11-09T05:30:00.000Z");
ok("bis jetzt", nextPeriod(null, now).to.getTime() === now.getTime());

console.log("=== Links und Personalisierung ===");
ok("Kampagne nach Zuercher Datum", issueCampaign(new Date("2026-11-15T23:30:00Z")) === "newsletter-2026-11-16");
ok("UTM-Link", trackedArticleUrl("https://digital-age.ch", "ki-in-banken", "newsletter-2026-11-16")
  === "https://digital-age.ch/artikel/ki-in-banken?utm_source=newsletter&utm_medium=email&utm_campaign=newsletter-2026-11-16");
const html = `<a href="https://x/abmelden/${UNSUBSCRIBE_PLACEHOLDER}">Abmelden</a> ${UNSUBSCRIBE_PLACEHOLDER}`;
const tok = "0f8fad5b-d9cb-469f-a165-70867728950e";
ok("Platzhalter ueberall ersetzt", personalize(html, tok) === `<a href="https://x/abmelden/${tok}">Abmelden</a> ${tok}`);
ok("Token wird kodiert", personalize(UNSUBSCRIBE_PLACEHOLDER, 'a"b') === "a%22b");

console.log("=== Prompt und Parser ===");
const arts = [
  { id: "a1", title: "KI in Banken", category: "KI im Business", abstract: "Abstract eins", bodyStart: "x".repeat(2000) },
  { id: "a2", title: "Quantencomputer", category: "Future Tech", abstract: "", bodyStart: "Text" },
];
const pr = buildNewsletterDraftPrompt(arts);
ok("System: Sprache, Strategie, Format", pr.system.includes("de-CH") && pr.system.includes("BETREFF:") && pr.system.includes('"items"'));
ok("Prompt nennt IDs und kuerzt Text", pr.prompt.includes("ID: a1") && pr.prompt.includes("ID: a2") && !pr.prompt.includes("x".repeat(1000)));
ok("Override ersetzt nur Strategie", (() => {
  const o = buildNewsletterDraftPrompt(arts, "NUR STRATEGIE");
  return o.system.includes("NUR STRATEGIE") && !o.system.includes("BETREFF:") && o.system.includes("de-CH") && o.system.includes('"items"');
})());
ok("Strategie sprachneutral (keine SPRACHE-Zeile)", !NEWSLETTER_DRAFT_STRATEGY.includes("SPRACHE"));

const good = JSON.stringify({ subject: "Banken und Quanten", intro: "Diese Woche: grosse Themen.", items: [{ id: "a1", teaser: "Was Banken lernen." }, { id: "a2", teaser: "Wie weit Quanten sind." }] });
const parsed = parseNewsletterDraft(good, ["a1", "a2"]);
ok("gueltige Antwort", !!parsed && parsed.subject === "Banken und Quanten" && parsed.teasers.a2 === "Wie weit Quanten sind.");
ok("Code-Block wird toleriert", !!parseNewsletterDraft("```json\n" + good + "\n```", ["a1", "a2"]));
ok("kein JSON = null", parseNewsletterDraft("Hier ist der Newsletter", ["a1"]) === null);
ok("ohne Betreff = null", parseNewsletterDraft(JSON.stringify({ subject: "", intro: "x", items: [] }), ["a1"]) === null);
ok("unbekannte ID ignoriert", (() => {
  const p = parseNewsletterDraft(JSON.stringify({ subject: "S", intro: "I", items: [{ id: "zz", teaser: "t" }, { id: "a1", teaser: "ok" }] }), ["a1"]);
  return !!p && !("zz" in p.teasers) && p.teasers.a1 === "ok";
})());
ok("Eszett wird ss", parseNewsletterDraft(JSON.stringify({ subject: "Grosse Schritte, ß", intro: "Massgeblich ß", items: [] }), [])?.subject === "Grosse Schritte, ss");

console.log(fails === 0 ? "\nAlles gruen." : `\n${fails} Fehler.`);
process.exit(fails === 0 ? 0 : 1);

// Manueller Test-Runner fuer Newsletter-Ausgaben (PR 195, Rubriken PR 203):
// src/lib/newsletter/issue.ts, sections.ts und src/lib/ai/newsletterPrompts.ts.
//
//   npx tsx src/lib/newsletter/__tests__/issue.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import {
  MAX_ITEMS,
  MAX_NEWS,
  UNSUBSCRIBE_PLACEHOLDER,
  hasSections,
  issueCampaign,
  nextPeriod,
  personalize,
  sanitizeItems,
  sanitizeSections,
  trackedArticleUrl,
  trackedNewsUrl,
  validateForSend,
} from "../issue";
import { defaultPrompt, einordnungLine, newsToSection, podcastToPick, promptToPick, rankNews, type NewsRow, type PromptRow } from "../sections";
import { buildNewsletterDraftPrompt, formalAddressFields, parseNewsletterDraft, usesFormalAddress, NEWSLETTER_DRAFT_STRATEGY } from "../../ai/newsletterPrompts";

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

console.log("=== sanitizeSections ===");
const news = (n: number, extra: Record<string, unknown> = {}) => ({
  newsId: `n-${n}`, title: `Meldung ${n}`, why: `Darum ${n}`, source: "Heise", anchor: `meldung-${n}`, einordnung: "Wirtschaft hoch", ...extra,
});
const pick = (extra: Record<string, unknown> = {}) => ({ id: "p1", slug: "offerten-pruefen", title: "Offerten pruefen", teaser: "Kurz", label: "Business", coverUrl: null, ...extra });
ok("alte Ausgabe ('{}') = leer", (() => { const e = sanitizeSections({}); return e.news.length === 0 && !e.hype && !e.prompt && !e.podcast && !hasSections(e); })());
ok("null/Array = leer", sanitizeSections(null).news.length === 0 && sanitizeSections([news(1)]).news.length === 0);
ok(`News hoechstens ${MAX_NEWS}, ohne Dubletten`, sanitizeSections({ news: [news(1), news(1), ...Array.from({ length: 8 }, (_, i) => news(i + 2))] }).news.length === MAX_NEWS
  && new Set(sanitizeSections({ news: [news(1), news(1)] }).news.map((n) => n.newsId)).size === 1);
ok("News ohne Titel faellt weg", sanitizeSections({ news: [news(1, { title: "" })] }).news.length === 0);
ok("Sprungmarke nur Slug-Zeichen", sanitizeSections({ news: [news(1, { anchor: "x\" onmouseover=\"a" }), news(2, { anchor: "Gut-Und-Gross" })] }).news.map((n) => n.anchor).join("|") === "|gut-und-gross");
ok("Hype braucht ID und Titel", sanitizeSections({ hype: { newsId: "n1", title: "" } }).hype === null
  && sanitizeSections({ hype: { newsId: "n1", title: "T", text: "  viel   Laerm " } }).hype?.text === "viel Laerm");
ok("Pick braucht Slug", sanitizeSections({ prompt: pick({ slug: "" }) }).prompt === null && sanitizeSections({ prompt: pick() }).prompt?.slug === "offerten-pruefen");
ok("Podcast-Bild nur https", sanitizeSections({ podcast: pick({ coverUrl: "http://x/y.jpg" }) }).podcast?.coverUrl === null);

console.log("=== validateForSend mit Rubriken ===");
const sec = (o: Record<string, unknown>) => sanitizeSections(o);
ok("nur News reicht", validateForSend({ subject: "B", items: [], sections: sec({ news: [news(1)] }) }).ok);
ok("nur Prompt reicht nicht", !validateForSend({ subject: "B", items: [], sections: sec({ prompt: pick() }) }).ok);
ok("News ohne «Warum» blockiert", (() => { const r = validateForSend({ subject: "B", items: [], sections: sec({ news: [news(1, { why: " " })] }) }); return !r.ok && r.error.includes("Meldung 1"); })());
ok("Hype ohne Text blockiert", !validateForSend({ subject: "B", items: sanitizeItems([item(1)]), sections: sec({ hype: { newsId: "n9", title: "T", text: "" } }) }).ok);
ok("Prompt ohne Kurztext blockiert", !validateForSend({ subject: "B", items: sanitizeItems([item(1)]), sections: sec({ prompt: pick({ teaser: "" }) }) }).ok);
ok("Podcast ohne Kurztext blockiert", !validateForSend({ subject: "B", items: sanitizeItems([item(1)]), sections: sec({ podcast: pick({ teaser: "" }) }) }).ok);

console.log("=== Quellen der Rubriken ===");
const row = (id: string, importance: number | null, levels: [number, number, number, number], gen = "2026-11-12T10:00:00Z", extra: Partial<NewsRow> = {}): NewsRow => ({
  id, title: `Meldung ${id}`, teaser: "Kurz", source_name: "Heise", generated_at: gen, importance,
  assessment: { v: 1, wirtschaft: levels[0], gesellschaft: levels[1], umwelt: levels[2], dringlichkeit: levels[3], warum: `Warum wichtig ${id}`, by: "ai" },
  ...extra,
});
const ranked = rankNews([
  row("a", 2, [1, 1, 0, 0]),
  row("b", 3, [1, 0, 0, 0]),
  row("c", 2, [3, 2, 0, 1]),
  row("d", 2, [1, 1, 0, 0], "2026-11-13T10:00:00Z"),
  row("e", null, [0, 0, 0, 0], "2026-11-13T12:00:00Z", { assessment: null }),
]).map((r) => r.id).join("");
ok("Rang: Wichtigkeit, Stufen, neuer, ohne Einordnung zuletzt", ranked === "bcdae", ranked);
const ns = newsToSection(row("x", 3, [3, 0, 0, 2], undefined, { title: "Jensen Huang tritt zurück" }));
ok("News: Warum, Quelle, Marke, Einordnung", ns.why === "Warum wichtig x" && ns.source === "Heise" && ns.anchor === "jensen-huang-tritt-zurueck" && ns.einordnung === "Wirtschaft hoch · Dringlichkeit mittel", JSON.stringify(ns));
ok("Einordnung leer ohne Werte ab mittel", einordnungLine({ v: 1, wirtschaft: 1, gesellschaft: 1, umwelt: 0, dringlichkeit: 0, warum: "weil es zaehlt", by: "ai" }) === "");
const prow = (id: string, status: string): PromptRow => ({ id, slug: `s-${id}`, title: `P ${id}`, category: "business", difficulty: "expert", context: "Für KMU, die ".repeat(40), status, published_at: "2026-11-12T10:00:00Z" });
ok("Prompt: Label und gekuerzter Kontext", (() => { const p = promptToPick(prow("1", "published")); return p.label === "Business · Expert" && p.teaser.length <= 202 && p.teaser.endsWith("…"); })(), promptToPick(prow("1", "published")).label);
ok("Prompt: KI-Kurztext gewinnt", promptToPick(prow("1", "published"), "Eigener Text").teaser === "Eigener Text");
ok("Prompt ohne KI: featured zuerst", defaultPrompt([prow("1", "published"), prow("2", "featured")])?.id === "2" && defaultPrompt([prow("1", "published")])?.id === "1" && defaultPrompt([]) === null);
ok("Podcast: Label, relatives Bild absolut", (() => {
  const c = podcastToPick({ id: "c", slug: "folge", title: "Folge", description: "Worum es geht.", podcast_category: "KI", language: "de", cover_image_url: "/images/x.jpg", recommended_at: "2026-11-12T10:00:00Z" }, "https://digital-age.ch");
  return c.label === "KI · Deutsch" && c.coverUrl === "https://digital-age.ch/images/x.jpg" && c.teaser === "Worum es geht.";
})());

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
ok("News-Link auf /news mit Marke", trackedNewsUrl("https://digital-age.ch", "jensen-huang", "newsletter-2026-11-16")
  === "https://digital-age.ch/news?utm_source=newsletter&utm_medium=email&utm_campaign=newsletter-2026-11-16#jensen-huang");
ok("News-Link ohne Marke", trackedNewsUrl("https://digital-age.ch", "", "c").endsWith("utm_campaign=c"));

console.log("=== Prompt und Parser ===");
const arts = [
  { id: "a1", title: "KI in Banken", category: "KI im Business", abstract: "Abstract eins", bodyStart: "x".repeat(2000) },
  { id: "a2", title: "Quantencomputer", category: "Future Tech", abstract: "", bodyStart: "Text" },
];
const input = (o: Record<string, unknown> = {}) => ({ articles: arts, news: [], prompts: [], podcasts: [], ...o });
const pr = buildNewsletterDraftPrompt(input());
ok("System: Sprache, Strategie, Format", pr.system.includes("de-CH") && pr.system.includes("BETREFF:") && pr.system.includes('"items"'));
ok("Prompt nennt IDs und kuerzt Text", pr.prompt.includes("ID: a1") && pr.prompt.includes("ID: a2") && !pr.prompt.includes("x".repeat(1000)));
ok("Override ersetzt nur Strategie", (() => {
  const o = buildNewsletterDraftPrompt(input(), "NUR STRATEGIE");
  return o.system.includes("NUR STRATEGIE") && !o.system.includes("BETREFF:") && o.system.includes("de-CH") && o.system.includes('"items"');
})());
ok("Strategie sprachneutral (keine SPRACHE-Zeile)", !NEWSLETTER_DRAFT_STRATEGY.includes("SPRACHE"));
ok("Strategie kennt die Rubriken", ["DIE WICHTIGSTEN NEWS", "HYPE-CHECK", "PROMPT DER WOCHE", "PODCAST-TIPP"].every((k) => NEWSLETTER_DRAFT_STRATEGY.includes(k)));
ok("Format nennt Rubriken auch bei Override", (() => { const o = buildNewsletterDraftPrompt(input(), "X"); return ['"news"', '"hype"', '"prompt"', '"podcast"'].every((k) => o.system.includes(k)); })());
{
  const full = buildNewsletterDraftPrompt(input({
    articles: [],
    news: [{ id: "n1", title: "Huang tritt zurueck", teaser: "Kurz", source: "Heise", importance: 3, levels: "Wirtschaft 3, Gesellschaft 0, Umwelt 0, Dringlichkeit 2", warum: "Weil", kehrseite: "Aber" }],
    prompts: [{ id: "p1", title: "Offerten", label: "Business · Experte", text: "Für KMU" }],
    podcasts: [],
  }));
  ok("ohne Artikel: Hinweis statt Liste", full.prompt.includes("NEUE ARTIKEL: keine"));
  ok("News-Zeile mit ID, Wichtigkeit, Stufen, Warum, Kehrseite", full.prompt.includes("n1 | Huang tritt zurueck | Quelle: Heise | Wichtigkeit 3 | Wirtschaft 3") && full.prompt.includes("Warum wichtig: Weil") && full.prompt.includes("Kehrseite: Aber"));
  ok("Prompt-Liste und leere Podcast-Liste", full.prompt.includes("p1 | Offerten | Business · Experte") && full.prompt.includes("PODCAST-LISTE (neu empfohlen): leer."));
  const many = buildNewsletterDraftPrompt(input({ news: Array.from({ length: 60 }, (_, i) => ({ id: `n${i + 1}`, title: `T${i}`, teaser: "", source: "", importance: 1, levels: "", warum: "", kehrseite: "" })) }));
  ok("hoechstens 40 News im Prompt", many.prompt.includes("n40 |") && !many.prompt.includes("n41 |"));
}

const good = JSON.stringify({ subject: "Banken und Quanten", intro: "Diese Woche: grosse Themen.", items: [{ id: "a1", teaser: "Was Banken lernen." }, { id: "a2", teaser: "Wie weit Quanten sind." }] });
const ids = (articles: string[] = ["a1", "a2"]) => ({ articles, news: ["n1", "n2", "n3"], prompts: ["p1"], podcasts: ["c1"] });
const parsed = parseNewsletterDraft(good, ids());
ok("gueltige Antwort", !!parsed && parsed.subject === "Banken und Quanten" && parsed.teasers.a2 === "Wie weit Quanten sind.");
ok("ohne Rubriken: leer statt Fehler", !!parsed && parsed.news.length === 0 && parsed.hype === null && parsed.prompt === null && parsed.podcast === null);
ok("Code-Block wird toleriert", !!parseNewsletterDraft("```json\n" + good + "\n```", ids()));
ok("kein JSON = null", parseNewsletterDraft("Hier ist der Newsletter", ids(["a1"])) === null);
ok("ohne Betreff = null", parseNewsletterDraft(JSON.stringify({ subject: "", intro: "x", items: [] }), ids(["a1"])) === null);
{
  const reply = (o: Record<string, unknown>) => parseNewsletterDraft(JSON.stringify({ subject: "S", intro: "I", items: [], ...o }), ids());
  const r = reply({ news: ["n2", "n9", "n2", { id: "n1" }], hype: { id: "n3", text: "Viel Laerm um wenig." }, prompt: { id: "p1", teaser: "Spart Zeit." }, podcast: { id: "c1", teaser: "Hoeren." } });
  ok("News: bekannte IDs, ohne Dubletten, auch als Objekt", r?.news.join(",") === "n2,n1", r?.news.join(","));
  ok("Hype, Prompt, Podcast uebernommen", r?.hype?.id === "n3" && r?.prompt?.teaser === "Spart Zeit." && r?.podcast?.id === "c1");
  ok("Hype nicht unter den News", reply({ news: ["n3"], hype: { id: "n3", text: "x" } })?.hype === null);
  ok("Hype ohne Text = null", reply({ hype: { id: "n1", text: "" } })?.hype === null);
  ok("unbekannte Prompt-ID = null", reply({ prompt: { id: "p7", teaser: "x" } })?.prompt === null);
  ok("null-Felder ok", (() => { const x = reply({ news: [], hype: null, prompt: null, podcast: null }); return !!x && x.hype === null && x.prompt === null; })());
  ok(`hoechstens 5 News`, reply({ news: ["n1", "n2", "n3"] })?.news.length === 3);
}
ok("unbekannte ID ignoriert", (() => {
  const p = parseNewsletterDraft(JSON.stringify({ subject: "S", intro: "I", items: [{ id: "zz", teaser: "t" }, { id: "a1", teaser: "ok" }] }), ids(["a1"]));
  return !!p && !("zz" in p.teasers) && p.teasers.a1 === "ok";
})());
ok("Eszett wird ss", parseNewsletterDraft(JSON.stringify({ subject: "Grosse Schritte, ß", intro: "Massgeblich ß", items: [] }), ids([]))?.subject === "Grosse Schritte, ss");

console.log("=== Anrede ===");
{
  const intro = "Diese Woche dreht sich vieles um Kontrolle: wer die Software betreibt, auf die Ihr Unternehmen angewiesen ist. Dazu kommen Updates, die Sie zeitnah einplanen sollten.";
  ok("Sie-Form im echten Entwurf erkannt", usesFormalAddress(intro));
  ok("«Ihnen» mitten im Satz", usesFormalAddress("Wir zeigen Ihnen, wie es geht."));
  ok("Du-Form ok", !usesFormalAddress("Diese Woche lohnt sich ein Blick auf deine Updates. Plane sie zeitnah ein."));
  ok("«Sie» am Satzanfang (Mehrzahl) ok", !usesFormalAddress("Die Banken reagieren. Sie setzen auf Agenten."));
  ok("«sie»/«ihr» klein ok", !usesFormalAddress("Die Firma sagt, sie wolle ihr Angebot ausbauen."));
  ok("Felder benannt", formalAddressFields({ Betreff: "Neu für dich", Einleitung: intro, "Hype-Check": null }).join() === "Einleitung");
  ok("Anrede im System auch bei Override", buildNewsletterDraftPrompt(input(), "X").system.includes("ANREDE: Duze"));
}

console.log(fails === 0 ? "\nAlles gruen." : `\n${fails} Fehler.`);
process.exit(fails === 0 ? 0 : 1);

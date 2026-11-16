// Manueller Test-Runner fuer Anzeigen im Newsletter (PR 214):
// src/lib/newsletter/ads.ts, adTokenCore.ts, die Mail-Vorlage und
// buildNewsletterAdUrl (ads/utm.ts).
//
//   npx tsx src/lib/newsletter/__tests__/ads.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import { render } from "@react-email/render";
import NewsletterIssue from "../../../emails/NewsletterIssue";
import { buildNewsletterAdUrl } from "../../ads/utm";
import {
  MAX_ADS,
  adCampaignIds,
  adLabel,
  adSlots,
  describeCreative,
  isRunningNow,
  newsletterAdHref,
  newsletterCreativeGap,
  orderAdProposals,
  pickNewsletterCreative,
  runningUntil,
  sanitizeAds,
  sumNewsletterAdStats,
  type AdCreativeRow,
  type IssueAd,
} from "../ads";
import { signAdClickWith, verifyAdClickWith } from "../adTokenCore";
import { EMPTY_SECTIONS, hasSections, sanitizeSections, validateForSend } from "../issue";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}
function eq(label: string, actual: unknown, expected: unknown): void {
  ok(label, JSON.stringify(actual) === JSON.stringify(expected), `erwartet ${JSON.stringify(expected)}, erhalten ${JSON.stringify(actual)}`);
}

const C1 = "11111111-1111-4111-8111-111111111111";
const C2 = "22222222-2222-4222-8222-222222222222";
const C3 = "33333333-3333-4333-8333-333333333333";
const R1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ISSUE = "99999999-9999-4999-8999-999999999999";

const imageAd = (campaignId = C1, extra: Record<string, unknown> = {}): IssueAd => ({
  campaignId, creativeId: R1, name: "Herbstkampagne", advertiser: "Beispiel AG", isHouse: false,
  kind: "image", imageUrl: "https://cdn.example.ch/modules/a.png", alt: "Abo vergleichen", headline: "", body: "", cta: "",
  href: "https://example.ch/?utm_source=digital-age", ...extra,
} as IssueAd);
const textAd = (campaignId = C2, extra: Record<string, unknown> = {}): IssueAd => ({
  campaignId, creativeId: R1, name: "Textkampagne", advertiser: "Muster GmbH", isHouse: false,
  kind: "text", imageUrl: null, alt: "", headline: "Zahlst du zu viel?", body: "In 60 Sekunden verglichen.", cta: "Jetzt vergleichen",
  href: "https://muster.ch/angebot", ...extra,
} as IssueAd);

console.log("=== sanitizeAds ===");
eq("kein Array = leer", sanitizeAds(null), []);
ok("Bild- und Text-Anzeige bleiben", sanitizeAds([imageAd(), textAd()]).length === 2);
ok("Kampagne nur einmal", sanitizeAds([imageAd(C1), textAd(C1)]).length === 1);
ok(`hoechstens ${MAX_ADS}`, sanitizeAds([imageAd(C1), textAd(C2), textAd(C3)]).length === MAX_ADS);
ok("ohne gueltige Kampagnen-ID faellt weg", sanitizeAds([imageAd("keine-uuid")]).length === 0);
ok("ohne Ziel faellt weg", sanitizeAds([imageAd(C1, { href: "" })]).length === 0);
ok("javascript:-Ziel faellt weg", sanitizeAds([textAd(C2, { href: "javascript:alert(1)" })]).length === 0);
ok("Ziel mit Anfuehrungszeichen faellt weg", sanitizeAds([textAd(C2, { href: 'https://x.ch/"onmouseover=' })]).length === 0);
ok("Text-Anzeige ohne Titel faellt weg", sanitizeAds([textAd(C2, { headline: "  " })]).length === 0);
eq("Bild ohne https-Adresse wird zur Text-Anzeige (mit Titel)", sanitizeAds([imageAd(C1, { imageUrl: "http://x.ch/a.png", headline: "Titel" })])[0]?.kind, "text");
ok("Bild ohne Adresse und ohne Titel faellt weg", sanitizeAds([imageAd(C1, { imageUrl: null })]).length === 0);
eq("unbekannte Felder fallen weg", Object.keys(sanitizeAds([{ ...imageAd(), boese: "<script>" }])[0] ?? {}).includes("boese"), false);
eq("Text wird gekuerzt und geglaettet", sanitizeAds([textAd(C2, { headline: "  Ein\n Titel  " })])[0]?.headline, "Ein Titel");

console.log("=== adCampaignIds ===");
eq("Reihenfolge bleibt", adCampaignIds([imageAd(C2), textAd(C1)]), [C2, C1]);
eq("doppelte und kaputte fallen weg", adCampaignIds([{ campaignId: C1 }, { campaignId: C1 }, { campaignId: "x" }, null, 7]), [C1]);
eq("hoechstens zwei", adCampaignIds([{ campaignId: C1 }, { campaignId: C2 }, { campaignId: C3 }]).length, MAX_ADS);
eq("Grossbuchstaben werden klein", adCampaignIds([{ campaignId: C1.toUpperCase() }]), [C1]);

console.log("=== sanitizeSections / Versandpruefung ===");
ok("leere Rubriken haben ads", Array.isArray(EMPTY_SECTIONS.ads) && sanitizeSections({}).ads.length === 0);
ok("ads kommen durch sanitizeSections", sanitizeSections({ ads: [imageAd()] }).ads.length === 1);
ok("Anzeigen allein sind keine Rubrik", !hasSections({ ...EMPTY_SECTIONS, ads: [imageAd()] }));
ok("Ausgabe nur mit Anzeigen ist nicht versandfertig", !validateForSend({ subject: "Betreff", items: [], sections: { ...EMPTY_SECTIONS, ads: [imageAd()] } }).ok);

console.log("=== pickNewsletterCreative ===");
const cr = (extra: Partial<AdCreativeRow>): AdCreativeRow => ({
  id: R1, kind: "image", variant: "desktop", placement_id: "p", headline: null, body: null, cta_label: null,
  target_url: "https://example.ch", is_active: true, image_path: "c/a.png", width: 600, height: 500, alt_text: "Alt", archived_at: null, ...extra,
});
eq("Rectangle 600x500 passt", pickNewsletterCreative([cr({ id: "a" })])?.id, "a");
eq("Rectangle 300x250 passt", pickNewsletterCreative([cr({ id: "a", width: 300, height: 250 })])?.id, "a");
eq("Billboard passt nicht", pickNewsletterCreative([cr({ width: 1940, height: 500 })]), null);
eq("zu kleines Bild passt nicht", pickNewsletterCreative([cr({ width: 150, height: 125 })]), null);
eq("Desktop vor Mobile", pickNewsletterCreative([cr({ id: "m", variant: "mobile" }), cr({ id: "d", variant: "desktop" })])?.id, "d");
eq("groessere Aufloesung zuerst", pickNewsletterCreative([cr({ id: "s", width: 300, height: 250 }), cr({ id: "l", width: 600, height: 500 })])?.id, "l");
const text = cr({ id: "t", kind: "internal", image_path: null, width: null, height: null, headline: "Titel", placement_id: null });
eq("Bild vor Text", pickNewsletterCreative([text, cr({ id: "b" })])?.id, "b");
eq("Text, wenn kein passendes Bild", pickNewsletterCreative([text, cr({ id: "b", width: 1456, height: 180 })])?.id, "t");
eq("inaktiv faellt weg", pickNewsletterCreative([cr({ is_active: false })]), null);
eq("archiviert faellt weg", pickNewsletterCreative([cr({ archived_at: "2026-11-01T00:00:00Z" })]), null);
eq("Text ohne Platzierung vor Text mit Platzierung", pickNewsletterCreative([{ ...text, id: "p", placement_id: "x" }, text])?.id, "t");
ok("Luecke wird benannt", (newsletterCreativeGap([cr({ width: 1940, height: 500 })]) ?? "").includes("300 × 250"));
eq("keine Luecke mit Rectangle", newsletterCreativeGap([cr({})]), null);
eq("Beschreibung Bild", describeCreative(cr({})), "Bild 600 × 500");
eq("Beschreibung Text", describeCreative(text), "Text «Titel»");

console.log("=== newsletterAdHref ===");
const cust = { is_house: false, utm_enabled: true, utm_campaign: "herbst" };
const SITE = "https://digital-age.ch";
eq("Kunde mit Kennung", newsletterAdHref("https://example.ch/x", cust, SITE), "https://example.ch/x?utm_source=digital-age&utm_medium=email&utm_campaign=herbst&utm_content=newsletter");
eq("eigene UTM bleiben", newsletterAdHref("https://example.ch/?utm_source=kunde", cust, SITE), "https://example.ch/?utm_source=kunde");
eq("ohne Tracking unveraendert", newsletterAdHref("https://example.ch/x", { ...cust, utm_enabled: false }, SITE), "https://example.ch/x");
eq("House relativ wird absolut", newsletterAdHref("/mediadaten", { is_house: true, utm_enabled: false, utm_campaign: null }, SITE), "https://digital-age.ch/mediadaten");
eq("mailto gibt kein Ziel", newsletterAdHref("mailto:a@b.ch", cust, SITE), "");
eq("protokoll-relativ gibt kein Ziel", newsletterAdHref("//boese.ch", cust, SITE), "");
eq("buildNewsletterAdUrl mit Fragment", buildNewsletterAdUrl("https://example.ch/p#f", "herbst"), "https://example.ch/p?utm_source=digital-age&utm_medium=email&utm_campaign=herbst&utm_content=newsletter#f");

console.log("=== isRunningNow / runningUntil ===");
const NOW = Date.parse("2026-11-16T08:00:00Z");
const bk = (period: string, extra: Record<string, string | null> = {}) => ({ period, paused_at: null, archived_at: null, ...extra });
ok("laufende Buchung", isRunningNow([bk('["2026-09-22 22:00:00+00","2026-11-30 23:00:00+00")')], NOW));
ok("offene Buchung", isRunningNow([bk('["2026-09-21 18:48:38.118774+00",)')], NOW));
ok("abgelaufen", !isRunningNow([bk('["2026-09-22 22:00:00+00","2026-10-31 23:00:00+00")')], NOW));
ok("noch nicht gestartet", !isRunningNow([bk('["2026-12-01 23:00:00+00","2026-12-31 23:00:00+00")')], NOW));
ok("pausiert zaehlt nicht", !isRunningNow([bk('["2026-09-22 22:00:00+00","2026-11-30 23:00:00+00")', { paused_at: "2026-11-01T00:00:00Z" })], NOW));
ok("archiviert zaehlt nicht", !isRunningNow([bk('["2026-09-22 22:00:00+00","2026-11-30 23:00:00+00")', { archived_at: "2026-11-01T00:00:00Z" })], NOW));
ok("keine Buchung", !isRunningNow([], NOW));
ok("Ende ist exklusiv", !isRunningNow([bk('["2026-09-22 22:00:00+00","2026-11-16 08:00:00+00")')], NOW));
eq("Ende der laufenden Buchung", runningUntil([bk('["2026-09-22 22:00:00+00","2026-11-30 23:00:00+00")')], NOW), "2026-11-30T23:00:00.000Z");
eq("spaetestes Ende", runningUntil([bk('["2026-09-22 22:00:00+00","2026-11-30 23:00:00+00")'), bk('["2026-09-22 22:00:00+00","2026-12-31 23:00:00+00")')], NOW), "2026-12-31T23:00:00.000Z");
eq("offen = kein Ende", runningUntil([bk('["2026-09-22 22:00:00+00","2026-11-30 23:00:00+00")'), bk('["2026-09-21 18:48:38+00",)')], NOW), null);
eq("abgelaufene zaehlt nicht fuer das Ende", runningUntil([bk('["2026-09-22 22:00:00+00","2026-10-31 23:00:00+00")')], NOW), null);

console.log("=== orderAdProposals ===");
const cand = [
  { campaignId: C1, name: "Bravo", weight: 3 },
  { campaignId: C2, name: "Alpha", weight: 3 },
  { campaignId: C3, name: "Charlie", weight: 5 },
];
eq("ohne Verlauf: Gewicht, dann Name", orderAdProposals(cand, []).map((c) => c.campaignId), [C3, C2, C1]);
eq("wer seltener dran war, zuerst", orderAdProposals(cand, [[C3, C2], [C3]]).map((c) => c.campaignId), [C1, C2, C3]);
eq("Eingabe bleibt unveraendert", cand.map((c) => c.campaignId), [C1, C2, C3]);

console.log("=== adSlots ===");
eq("eine Anzeige: nach dem ersten Block", adSlots(4, 1), [0]);
eq("zwei Anzeigen: nach Block 1 und 3", adSlots(5, 2), [0, 2]);
eq("zwei Bloecke: zweite am Ende", adSlots(2, 2), [0, 1]);
eq("ein Block: beide danach", adSlots(1, 2), [0, 0]);
eq("kein Block: nach der Einleitung", adSlots(0, 2), [-1, -1]);
eq("mehr als erlaubt wird begrenzt", adSlots(5, 7).length, MAX_ADS);
eq("keine Anzeigen", adSlots(3, 0), []);

console.log("=== Zahlen und Kennzeichnung ===");
eq("Summen", sumNewsletterAdStats([
  { issueId: "a", sentAt: null, subject: "A", sends: 9, clicks: 2 },
  { issueId: "b", sentAt: null, subject: "B", sends: 11, clicks: 0 },
]).sends, 20);
eq("Kunde = Anzeige", adLabel({ isHouse: false }), "Anzeige");
eq("House = In eigener Sache", adLabel({ isHouse: true }), "In eigener Sache");

console.log("=== Zaehl-Link ===");
const SECRET = "nur-fuer-den-test";
const token = signAdClickWith(SECRET, { i: ISSUE, c: C1 });
ok("Token entsteht", typeof token === "string" && token.includes("."));
eq("gueltiges Token wird gelesen", verifyAdClickWith(SECRET, token), { i: ISSUE, c: C1 });
eq("anderes Geheimnis lehnt ab", verifyAdClickWith("anderes", token), null);
eq("veraenderte Signatur lehnt ab", verifyAdClickWith(SECRET, `${token}x`), null);
const forged = `${Buffer.from(JSON.stringify({ i: ISSUE, c: C2 })).toString("base64url")}.${(token ?? "").split(".")[1]}`;
eq("anderer Inhalt mit alter Signatur lehnt ab", verifyAdClickWith(SECRET, forged), null);
eq("ohne Geheimnis kein Token", signAdClickWith("", { i: ISSUE, c: C1 }), null);
eq("ohne Geheimnis keine Pruefung", verifyAdClickWith("", token), null);
eq("kaputte ID wird nicht signiert", signAdClickWith(SECRET, { i: "x", c: C1 }), null);
eq("leer, null, zu lang", [verifyAdClickWith(SECRET, ""), verifyAdClickWith(SECRET, null), verifyAdClickWith(SECRET, "a".repeat(600))], [null, null, null]);
ok("Token ohne Ziel-URL", !Buffer.from((token ?? "").split(".")[0], "base64url").toString("utf8").includes("http"));

async function mail(): Promise<void> {
  console.log("=== Mail-Vorlage ===");
  const base = {
    subject: "Betreff", intro: "Einleitung der Woche.", dateText: "23.11.2026", campaign: "newsletter-2026-11-23",
    siteUrl: SITE, unsubscribeUrl: `${SITE}/newsletter/abmelden/x`,
    items: [{ articleId: "a1", slug: "artikel-eins", title: "Artikel eins", teaser: "Kurztext.", category: "KI & Business", coverUrl: null }],
  };
  const news = [{ newsId: "n1", title: "News eins", why: "Darum.", source: "Quelle", anchor: "", einordnung: "" }];
  const withAds = await render(NewsletterIssue({ ...base, sections: { ...EMPTY_SECTIONS, news, ads: [imageAd(), textAd()] } }));
  ok("Kennzeichnung steht in der Mail", (withAds.match(/>Anzeige</g) ?? []).length === 2, "erwartet zwei Mal «Anzeige»");
  ok("Bild mit Alt-Text und fester Breite", withAds.includes('alt="Abo vergleichen"') && withAds.includes('width="300"'));
  ok("Text-Anzeige mit Titel, Text und Knopf", withAds.includes("Zahlst du zu viel?") && withAds.includes("In 60 Sekunden verglichen.") && withAds.includes("Jetzt vergleichen"));
  ok("ohne adLinks: direktes Ziel", withAds.includes('href="https://muster.ch/angebot"'));
  const iArticle = withAds.indexOf("Artikel eins");
  const iAd1 = withAds.indexOf("Abo vergleichen");
  const iNews = withAds.indexOf("News eins");
  const iAd2 = withAds.indexOf("Zahlst du zu viel?");
  ok("erste Anzeige zwischen Artikeln und News", iArticle > 0 && iArticle < iAd1 && iAd1 < iNews, `${iArticle}/${iAd1}/${iNews}`);
  ok("zweite Anzeige nach den News", iNews < iAd2);
  ok("redaktionelle Links tragen die Rubrik als utm_content", withAds.includes("utm_content=artikel") && withAds.includes("utm_content=news") && withAds.includes("utm_content=alle-news"));
  ok("die Anzeige traegt keine Newsletter-Kennung der Redaktion", !withAds.includes("muster.ch/angebot?utm_source=newsletter"));
  ok("Fusszeile stimmt fuer Abonnenten und Autoren", withAds.includes("abonniert hast oder für digital age schreibst"));
  ok("Kundenname und Kampagnenname stehen nicht in der Mail", !withAds.includes("Beispiel AG") && !withAds.includes("Herbstkampagne") && !withAds.includes("Muster GmbH"));

  const counted = await render(NewsletterIssue({
    ...base, sections: { ...EMPTY_SECTIONS, ads: [textAd()] }, adLinks: { [C2]: `${SITE}/api/module/weiter?k=abc.def` },
  }));
  ok("mit adLinks: Zaehl-Link statt Ziel", counted.includes(`href="${SITE}/api/module/weiter?k=abc.def"`) && !counted.includes('href="https://muster.ch/angebot"'));

  const house = await render(NewsletterIssue({ ...base, sections: { ...EMPTY_SECTIONS, ads: [textAd(C2, { isHouse: true })] } }));
  ok("House heisst «In eigener Sache»", house.includes(">In eigener Sache<") && !house.includes(">Anzeige<"));

  const none = await render(NewsletterIssue({ ...base, sections: { ...EMPTY_SECTIONS, news } }));
  ok("ohne Anzeigen keine Kennzeichnung", !none.includes(">Anzeige<"));

  const hostile = await render(NewsletterIssue({ ...base, sections: { ...EMPTY_SECTIONS, ads: [textAd(C2, { headline: '<img src=x onerror="1">' })] } }));
  ok("Titel wird als Text ausgegeben", !hostile.includes('<img src=x onerror="1">') && hostile.includes("&lt;img"));
}

mail()
  .catch((e) => {
    fails++;
    console.log("FAIL  Mail-Vorlage laesst sich nicht rendern\n     ", e);
  })
  .finally(() => {
    console.log(fails === 0 ? "\nAlle Tests gruen." : `\n${fails} Test(s) fehlgeschlagen.`);
    process.exit(fails === 0 ? 0 : 1);
  });

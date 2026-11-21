// Manueller Test-Runner fuer «Aus dem Showcase» im Newsletter (Showcase S4b):
// src/lib/newsletter/showcase.ts, die Teile in issue.ts und die Mail-Vorlage.
//
//   npx tsx src/lib/newsletter/__tests__/showcase.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import { render } from "@react-email/render";
import NewsletterIssue from "../../../emails/NewsletterIssue";
import { EMPTY_SECTIONS, hasSections, sanitizeSections, trackedShowcaseUrl, validateForSend } from "../issue";
import {
  MAX_SHOWCASE,
  SHOWCASE_TEASER_MAX,
  isShowcaseReady,
  resolveShowcaseEntries,
  sanitizeShowcase,
  showcaseFromRow,
  showcaseLine,
  type IssueShowcase,
  type ShowcaseArticleRow,
} from "../showcase";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}
function eq(label: string, actual: unknown, expected: unknown): void {
  ok(label, JSON.stringify(actual) === JSON.stringify(expected), `erwartet ${JSON.stringify(expected)}, erhalten ${JSON.stringify(actual)}`);
}

const A1 = "11111111-1111-4111-8111-111111111111";
const A2 = "22222222-2222-4222-8222-222222222222";
const A3 = "33333333-3333-4333-8333-333333333333";

function row(over: Partial<ShowcaseArticleRow> = {}): ShowcaseArticleRow {
  return {
    id: A1,
    slug: "beitrag-eins",
    title: "Wie wir Rechnungen mit KI pruefen",
    excerpt: "Erster Satz des Abstracts. Zweiter Satz mit mehr Inhalt.",
    status: "published",
    content_type: "company",
    is_paid: false,
    published_at: "2026-11-18T08:00:00Z",
    startup: { name: "Beispiel AG" },
    ...over,
  };
}

function entry(over: Partial<IssueShowcase> = {}): IssueShowcase {
  return { articleId: A1, slug: "beitrag-eins", title: "Titel", teaser: "Kurztext.", company: "Beispiel AG", label: "Unternehmensbeitrag", ...over };
}

// --- sanitizeShowcase ---
eq("kein Array -> leer", sanitizeShowcase({}), []);
eq("gueltiger Eintrag bleibt", sanitizeShowcase([entry()]), [entry()]);
eq("ohne Firma faellt weg", sanitizeShowcase([entry({ company: "" })]), []);
eq("unbekannte Kennzeichnung faellt weg", sanitizeShowcase([entry({ label: "Anzeige" })]), []);
eq("Publireportage erlaubt", sanitizeShowcase([entry({ label: "Publireportage" })]).length, 1);
eq("Dubletten fallen weg", sanitizeShowcase([entry(), entry()]).length, 1);
eq(
  "hoechstens MAX_SHOWCASE",
  sanitizeShowcase([entry(), entry({ articleId: A2 }), entry({ articleId: A3 })]).length,
  MAX_SHOWCASE,
);
eq("Kurztext gekuerzt", sanitizeShowcase([entry({ teaser: "x".repeat(500) })])[0].teaser.length, SHOWCASE_TEASER_MAX);

// --- showcaseFromRow / isShowcaseReady ---
ok("publizierter Unternehmensbeitrag bereit", isShowcaseReady(row()));
ok("Entwurf nicht bereit", !isShowcaseReady(row({ status: "draft" })));
ok("redaktionell nicht bereit", !isShowcaseReady(row({ content_type: "editorial" })));
ok("ohne Firma nicht bereit", !isShowcaseReady(row({ startup: null })));
eq("Kennzeichnung unbezahlt", showcaseFromRow(row())?.label, "Unternehmensbeitrag");
eq("Kennzeichnung bezahlt", showcaseFromRow(row({ is_paid: true }))?.label, "Publireportage");
eq("Firma aus dem Verzeichnis", showcaseFromRow(row())?.company, "Beispiel AG");
eq("eigener Kurztext gewinnt", showcaseFromRow(row(), "Mein Text.")?.teaser, "Mein Text.");
ok("Ersatztext aus dem Abstract", (showcaseFromRow(row())?.teaser ?? "").startsWith("Erster Satz"));
eq("Zeile ueber dem Titel", showcaseLine(entry()), "Unternehmensbeitrag von Beispiel AG");

// --- resolveShowcaseEntries: Browser kann Kennzeichnung nicht faelschen ---
{
  const forged = entry({ title: "Gefaelscht", company: "Andere AG", label: "Unternehmensbeitrag", teaser: "Text." });
  const { entries, missing } = resolveShowcaseEntries([forged], [row({ is_paid: true })]);
  eq("Titel aus der DB", entries[0]?.title, "Wie wir Rechnungen mit KI pruefen");
  eq("Firma aus der DB", entries[0]?.company, "Beispiel AG");
  eq("Kennzeichnung aus der DB", entries[0]?.label, "Publireportage");
  eq("Kurztext aus dem Wunsch", entries[0]?.teaser, "Text.");
  eq("nichts fehlt", missing.length, 0);
}
{
  const { entries, missing } = resolveShowcaseEntries([entry(), entry({ articleId: A2 })], [row({ status: "archived" })]);
  eq("nicht mehr publiziert -> missing", missing.map((m) => m.articleId), [A1, A2]);
  eq("keine Eintraege", entries.length, 0);
}

// --- issue.ts ---
{
  const s = sanitizeSections({ showcase: [entry()] });
  eq("sanitizeSections liest showcase", s.showcase.length, 1);
  ok("hasSections mit Showcase", hasSections(s));
  ok("EMPTY_SECTIONS ohne Showcase", EMPTY_SECTIONS.showcase.length === 0 && !hasSections(EMPTY_SECTIONS));
  const item = { articleId: A3, slug: "a", title: "Artikel", teaser: "Text.", category: "", coverUrl: "" };
  const v = validateForSend({ subject: "Betreff", items: [item], sections: { ...s, showcase: [entry({ teaser: "" })] } });
  ok("Versand ohne Kurztext abgelehnt", !v.ok && /Aus dem Showcase/.test(v.error));
  ok("Versand mit Kurztext ok", validateForSend({ subject: "Betreff", items: [item], sections: s }).ok);
  eq(
    "Link auf /showcase mit UTM",
    trackedShowcaseUrl("https://digital-age.ch", "beitrag-eins", "nl-2026-11-23"),
    "https://digital-age.ch/showcase/beitrag-eins?utm_source=newsletter&utm_medium=email&utm_campaign=nl-2026-11-23&utm_content=showcase",
  );
}

// --- Mail ---
async function mail(): Promise<void> {
  const item = { articleId: A3, slug: "artikel", title: "Redaktioneller Artikel", teaser: "Text.", category: "KI", coverUrl: "" };
  const base = {
    subject: "Betreff",
    intro: "Einleitung.",
    items: [item],
    dateText: "23.11.2026",
    campaign: "nl-2026-11-23",
    siteUrl: "https://digital-age.ch",
    unsubscribeUrl: "https://digital-age.ch/newsletter/abmelden",
  };
  const without = await render(NewsletterIssue({ ...base, sections: EMPTY_SECTIONS }));
  ok("ohne Showcase kein Block", !without.includes("Aus dem Showcase"));
  const html = await render(
    NewsletterIssue({ ...base, sections: { ...EMPTY_SECTIONS, showcase: [entry({ title: "Firmenbeitrag" }), entry({ articleId: A2, slug: "zwei", label: "Publireportage", company: "Zweite GmbH" })] } }),
  );
  ok("Block erscheint", html.includes("Aus dem Showcase"));
  ok("Hinweis kein redaktioneller Inhalt", html.includes("Kein redaktioneller Inhalt"));
  ok("Kennzeichnung je Eintrag", html.includes("Unternehmensbeitrag von Beispiel AG") && html.includes("Publireportage von Zweite GmbH"));
  ok("Link mit utm_content=showcase", html.includes("/showcase/beitrag-eins?utm_source=newsletter&amp;utm_medium=email") && html.includes("utm_content=showcase"));
  ok("Block nach den redaktionellen Inhalten", html.indexOf("Redaktioneller Artikel") < html.indexOf("Aus dem Showcase"));
  ok("Firmenbeitrag nicht unter «Neu auf digital age»", html.indexOf("Firmenbeitrag") > html.indexOf("Aus dem Showcase"));
}

mail()
  .catch((e) => {
    fails++;
    console.log(`FAIL  Mail: ${e instanceof Error ? e.message : String(e)}`);
  })
  .finally(() => {
    console.log(fails === 0 ? "\nAlles gruen." : `\n${fails} Fail(s).`);
    process.exit(fails === 0 ? 0 : 1);
  });

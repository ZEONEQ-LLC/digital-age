// Manueller Test-Runner fuer die Einordnung von Artikeln
// (src/lib/contentType.ts) und dafuer, dass alle redaktionellen Listen
// Unternehmensbeitraege ausschliessen (Showcase S2a) und die Showcase-Seiten
// sie getrennt und gekennzeichnet zeigen (S2b).
//
//   npx tsx src/lib/__tests__/contentType.manual.ts
import { readFileSync } from "node:fs";
import {
  SHOWCASE_CATEGORY_SLUG,
  SHOWCASE_PATH,
  SHOWCASE_PUBLISHING_ENABLED,
  articlePath,
  companyPublishBlockers,
  contentTypeDbError,
  contentTypeLabel,
  editorialOnly,
  isCompany,
  isContentType,
  planContentTypeChange,
  type ContentTypeContext,
} from "../contentType";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}
const eq = (label: string, got: unknown, want: unknown) =>
  ok(label, JSON.stringify(got) === JSON.stringify(want), `erhalten ${JSON.stringify(got)}, erwartet ${JSON.stringify(want)}`);

// --- Grundlagen
ok("editorial ist ein Inhaltstyp", isContentType("editorial"));
ok("company ist ein Inhaltstyp", isContentType("company"));
ok("anderes ist keiner", !isContentType("sponsored") && !isContentType(null) && !isContentType(1));
ok("isCompany erkennt company", isCompany({ content_type: "company" }));
ok("isCompany: editorial, null und fehlend sind redaktionell", !isCompany({ content_type: "editorial" }) && !isCompany({ content_type: null }) && !isCompany({}));
eq("Kategorie heisst showcase", SHOWCASE_CATEGORY_SLUG, "showcase");
ok("S2b: Publizieren ist freigegeben", (SHOWCASE_PUBLISHING_ENABLED as boolean) === true);

// --- Oeffentlicher Pfad je Inhaltstyp
eq("redaktionell steht unter /artikel", articlePath({ slug: "ki-im-alltag", content_type: "editorial" }), "/artikel/ki-im-alltag");
eq("Unternehmensbeitrag steht unter /showcase", articlePath({ slug: "ai-act", content_type: "company" }), "/showcase/ai-act");
eq("ohne Typ gilt redaktionell", articlePath({ slug: "x" }), "/artikel/x");
eq("Uebersicht heisst /showcase", SHOWCASE_PATH, "/showcase");

// --- Kennzeichnung
eq("redaktionell traegt keine Kennzeichnung", contentTypeLabel({ content_type: "editorial", is_paid: false }), null);
eq("unbezahlt: Unternehmensbeitrag", contentTypeLabel({ content_type: "company", is_paid: false }), "Unternehmensbeitrag");
eq("bezahlt: Publireportage", contentTypeLabel({ content_type: "company", is_paid: true }), "Publireportage");
eq("bezahlt ohne company bleibt ohne Kennzeichnung", contentTypeLabel({ content_type: "editorial", is_paid: true }), null);

// --- editorialOnly setzt genau einen Filter
{
  const calls: [string, string][] = [];
  const q = { eq(column: string, value: string) { calls.push([column, value]); return q; } };
  const out = editorialOnly(q);
  eq("editorialOnly filtert content_type = editorial", calls, [["content_type", "editorial"]]);
  ok("editorialOnly gibt die Abfrage zurueck", out === q);
}

// --- planContentTypeChange
const ctx: ContentTypeContext = {
  status: "draft",
  category_id: "cat-ki",
  showcaseCategoryId: "cat-show",
  editorialCategoryIds: ["cat-ki", "cat-ft"],
  startupListed: true,
  publishingEnabled: false,
};
{
  const plan = planContentTypeChange({ content_type: "company", startup_id: "s1", is_paid: false, category_id: null }, ctx);
  eq("Entwurf wird Unternehmensbeitrag", plan, {
    ok: true,
    patch: { content_type: "company", startup_id: "s1", is_paid: false, category_id: "cat-show", is_featured: false, is_hero: false },
  });
}
{
  const plan = planContentTypeChange({ content_type: "company", startup_id: "s1", is_paid: true, category_id: "cat-ki" }, ctx);
  ok("bezahlt wird uebernommen, Kategorie ist immer showcase", plan.ok && plan.patch.is_paid === true && plan.patch.category_id === "cat-show");
}
{
  const plan = planContentTypeChange({ content_type: "company", startup_id: null, is_paid: false, category_id: null }, ctx);
  ok("ohne Unternehmen: abgelehnt", !plan.ok && plan.message.includes("Unternehmen"));
}
{
  const plan = planContentTypeChange({ content_type: "company", startup_id: "s1", is_paid: false, category_id: null }, { ...ctx, startupListed: false });
  ok("archiviertes Unternehmen: abgelehnt", !plan.ok && plan.message.includes("nicht im Verzeichnis"));
}
{
  const plan = planContentTypeChange({ content_type: "company", startup_id: "s1", is_paid: false, category_id: null }, { ...ctx, showcaseCategoryId: null });
  ok("ohne Showcase-Kategorie: abgelehnt", !plan.ok && plan.message.includes("Showcase"));
}
{
  const plan = planContentTypeChange({ content_type: "company", startup_id: "s1", is_paid: false, category_id: null }, { ...ctx, status: "published" });
  ok("Schalter aus: publizierter Artikel laesst sich nicht umstellen", !plan.ok && plan.message.includes("gesperrt"));
}
{
  const plan = planContentTypeChange({ content_type: "company", startup_id: "s1", is_paid: false, category_id: null }, { ...ctx, status: "published", publishingEnabled: true });
  ok("Schalter an: publizierter Artikel laesst sich umstellen", plan.ok);
}
{
  const plan = planContentTypeChange({ content_type: "company", startup_id: "s1", is_paid: false, category_id: null }, { ...ctx, status: "in_review" });
  ok("in Review: Umstellung erlaubt", plan.ok);
}
{
  const plan = planContentTypeChange({ content_type: "editorial", startup_id: "s1", is_paid: true, category_id: "cat-ft" }, { ...ctx, category_id: "cat-show" });
  eq("zurueck auf redaktionell: Unternehmen und bezahlt entfallen, gewaehlte Rubrik", plan, {
    ok: true,
    patch: { content_type: "editorial", startup_id: null, is_paid: false, category_id: "cat-ft" },
  });
}
{
  const plan = planContentTypeChange({ content_type: "editorial", startup_id: null, is_paid: false, category_id: null }, { ...ctx, category_id: "cat-show" });
  ok("zurueck auf redaktionell ohne Rubrik: abgelehnt", !plan.ok && plan.message.includes("Rubrik"));
}
{
  const plan = planContentTypeChange({ content_type: "editorial", startup_id: null, is_paid: false, category_id: "cat-show" }, { ...ctx, category_id: "cat-show" });
  ok("showcase ist keine redaktionelle Rubrik", !plan.ok);
}
{
  const plan = planContentTypeChange({ content_type: "editorial", startup_id: null, is_paid: false, category_id: null }, ctx);
  ok("redaktionell bleibt redaktionell, Rubrik bleibt", plan.ok && plan.patch.category_id === "cat-ki");
}
{
  const plan = planContentTypeChange({ content_type: "advert" as "company", startup_id: null, is_paid: false, category_id: null }, ctx);
  ok("unbekannter Typ: abgelehnt", !plan.ok);
}

// --- companyPublishBlockers
eq("redaktionell: nie blockiert", companyPublishBlockers({ content_type: "editorial", startup_id: null, categorySlug: "ki-business", startupListed: false }, false), []);
{
  const b = companyPublishBlockers({ content_type: "company", startup_id: "s1", categorySlug: "showcase", startupListed: true }, false);
  ok("Schalter aus: Unternehmensbeitrag ist nicht publizierbar", b.length === 1 && b[0].includes("gesperrt"));
}
eq("ab S2b: vollstaendiger Beitrag ist publizierbar", companyPublishBlockers({ content_type: "company", startup_id: "s1", categorySlug: "showcase", startupListed: true }, true), []);
ok("ab S2b: ohne Unternehmen blockiert", companyPublishBlockers({ content_type: "company", startup_id: null, categorySlug: "showcase", startupListed: false }, true).some((m) => m.includes("kein Unternehmen")));
ok("ab S2b: archiviertes Unternehmen blockiert", companyPublishBlockers({ content_type: "company", startup_id: "s1", categorySlug: "showcase", startupListed: false }, true).some((m) => m.includes("nicht im Verzeichnis")));
ok("ab S2b: falsche Kategorie blockiert", companyPublishBlockers({ content_type: "company", startup_id: "s1", categorySlug: "ki-business", startupListed: true }, true).some((m) => m.includes("Showcase")));

// --- Meldungen fuer DB-Fehler
ok("Trigger: nur Redaktion", (contentTypeDbError({ message: "content_type_editor_only" }) ?? "").includes("Redaktion"));
ok("Trigger: Showcase vorbehalten", (contentTypeDbError({ message: "showcase_category_reserved" }) ?? "").includes("vorbehalten"));
ok("CHECK: nicht Featured", (contentTypeDbError({ message: 'new row violates check constraint "articles_company_not_featured"' }) ?? "").includes("Featured"));
ok("FK: Unternehmen mit Beitraegen", (contentTypeDbError({ message: 'violates foreign key constraint "articles_startup_id_fkey" on table "articles"' }) ?? "").includes("Beiträge"));
eq("anderer Fehler bleibt unbekannt", contentTypeDbError({ message: "duplicate key" }), null);
eq("kein Objekt bleibt unbekannt", contentTypeDbError("x"), null);

// --- Alle redaktionellen Listen filtern. Wer hier eine Abfrage auf published
// Artikel ergaenzt, traegt sie in diese Liste ein oder begruendet die Ausnahme.
const EDITORIAL_LISTS: [file: string, min: number, what: string][] = [
  ["src/lib/homeApi.ts", 1, "Startseite: Aufmacher und Fokus"],
  ["src/lib/articleApi.ts", 2, "Featured-Liste und Beitragsseite"],
  ["src/lib/tags.ts", 1, "Tag-Seiten"],
  ["src/lib/authorApi.ts", 1, "Autorenprofil und «Mehr von diesem Autor»"],
  ["src/app/artikel/[slug]/page.tsx", 1, "generateStaticParams"],
  ["src/lib/newsletter/draftJob.ts", 2, "Newsletter-Entwurf und Fallback"],
  ["src/app/autor/(suite)/admin/newsletter/ausgaben/page.tsx", 1, "Newsletter-Kandidaten im Admin"],
  ["src/lib/sitemap/entries.ts", 1, "Sitemap: Block der redaktionellen Artikel"],
  ["src/lib/articleSearchActions.ts", 1, "Linkauswahl im Editor"],
  ["src/lib/podcastApi.ts", 1, "Podcast: Karte «zum Beitrag»"],
  ["src/lib/ads/previewApi.ts", 1, "Werbe-Vorschau: neuester Artikel"],
];
for (const [file, min, what] of EDITORIAL_LISTS) {
  const src = readFileSync(file, "utf8");
  const n = (src.match(/editorialOnly\(/g) ?? []).length;
  ok(`${what}: editorialOnly in ${file}`, n >= min, `gefunden ${n}, erwartet mindestens ${min}`);
}

// --- S2b: Wo Unternehmensbeitraege erscheinen, sind sie getrennt und
// gekennzeichnet. Quelltext-Pruefung der Stellen, die das sicherstellen.
function has(file: string, needle: string | RegExp): boolean {
  const src = readFileSync(file, "utf8");
  return typeof needle === "string" ? src.includes(needle) : needle.test(src);
}
function count(file: string, needle: RegExp): number {
  return (readFileSync(file, "utf8").match(needle) ?? []).length;
}
ok("Showcase-Abfragen filtern auf company", count("src/lib/showcaseApi.ts", /\.eq\("content_type", "company"\)/g) >= 4);
ok("Showcase-Abfragen verlangen ein sichtbares Unternehmen", count("src/lib/showcaseApi.ts", /ai_startups!inner/g) >= 3);
ok("Suche kennzeichnet Unternehmensbeitraege", has("src/lib/search/articles.ts", "contentTypeLabel(article)"));
ok("Suche laesst Treffer ohne sichtbares Unternehmen weg", has("src/lib/search/articles.ts", "if (!article.startup) return [];"));
ok("Sitemap fuehrt Unternehmensbeitraege unter /showcase", has("src/lib/sitemap/entries.ts", "/showcase/${a.slug}"));
ok("/artikel/<slug> leitet Unternehmensbeitraege weiter", has("src/app/artikel/[slug]/page.tsx", /=== "company"\) permanentRedirect\(/));
ok("/showcase/<slug> leitet redaktionelle Artikel zurueck", has("src/app/showcase/[slug]/page.tsx", /=== "editorial"\) redirect\(/));
ok("Showcase-Seite: externe Links sponsored", count("src/components/showcase/ShowcaseArticleView.tsx", /linkRel="sponsored"/g) >= 2);
ok("Showcase-Seite: kein Anzeigen-Slot im Text", has("src/components/showcase/ShowcaseArticleView.tsx", "ads={false}"));
ok("Showcase-Seite: feste Zeile mit der Kennzeichnung", has("src/components/showcase/ShowcaseArticleView.tsx", "<ShowcaseBand company={company} label={label} />"));
ok("Keine Rails im Showcase", has("src/components/module/RailModules.tsx", '"/showcase"'));
ok("BlockReader: rel aus linkRel, nicht fest", !has("src/components/BlockReader.tsx", 'rel="noopener noreferrer"') && has("src/components/BlockReader.tsx", '"sponsored noopener noreferrer"'));
ok("Werbung: keine Buchung auf Unternehmensbeitraege", has("src/lib/ads/adActions.ts", "if (isCompany(art))"));
ok("Listenzeile zeigt Kennzeichnung und Absender", has("src/components/ArticleListRow.tsx", "<strong>{article.sender.label}</strong>") && has("src/components/ArticleListRow.tsx", "{article.sender.name}</span>"));

// Rubrik-Abfragen filtern ueber die Kategorie. Der DB-Trigger haelt
// Unternehmensbeitraege in «showcase»; die Rubrikseiten fragen feste Slugs ab.
{
  const sql = readFileSync("supabase/migrations/20261114140000_showcase_datenmodell.sql", "utf8");
  ok("Trigger zwingt Unternehmensbeitraege in showcase", sql.includes("new.category_id := v_showcase;"));
  ok("Trigger sperrt showcase fuer redaktionelle Artikel", sql.includes("raise exception 'showcase_category_reserved'"));
  ok("Trigger: Einordnung nur durch die Redaktion", sql.includes("raise exception 'content_type_editor_only'"));
}

console.log(fails === 0 ? "\nAlle Tests gruen." : `\n${fails} Test(s) fehlgeschlagen.`);
process.exit(fails === 0 ? 0 : 1);

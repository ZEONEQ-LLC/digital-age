// Manueller Test-Runner fuer die geteilten Helfer der Beitragsseiten
// (src/lib/articlePage.ts) und die Interessenbindung (src/lib/disclosure.ts).
//
//   npx tsx src/lib/__tests__/articlePage.manual.ts
import type { ArticleWithFullRelations } from "../articleApi";
import {
  buildArticleJsonLd,
  buildArticleMetadata,
  deriveTocItems,
  resolveOgImage,
  truncateDescription,
} from "../articlePage";
import { DISCLOSURE_MAX, disclosureError, normalizeDisclosure } from "../disclosure";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}
const eq = (label: string, got: unknown, want: unknown) =>
  ok(label, JSON.stringify(got) === JSON.stringify(want), `erhalten ${JSON.stringify(got)}, erwartet ${JSON.stringify(want)}`);

const BASE = "https://digital-age.ch";
const article = {
  slug: "ai-act",
  title: "Was der AI Act bedeutet",
  excerpt: "Kurz erklaert.",
  seo_title: null,
  seo_description: null,
  seo_keyword_primary: "AI Act",
  seo_keywords_secondary: ["KI-Gesetz", "AI Act"],
  tags: ["EU AI Act"],
  cover_image_url: "https://x.supabase.co/storage/v1/object/public/articles/a/cover.webp",
  cover_image_alt: null,
  og_image_url: null,
  published_at: "2025-02-24T08:00:00.000Z",
  updated_at: "2026-07-14T08:00:00.000Z",
  locale: "de-CH",
  category: { name_de: "Showcase", slug: "showcase" },
  author: { display_name: "Matthias Zwingli", handle: "matthias-zwingli", slug: "matthias-zwingli" },
} as unknown as ArticleWithFullRelations;

// --- JSON-LD: redaktionell wie bisher
{
  const ld = JSON.parse(buildArticleJsonLd(article, BASE));
  eq("redaktionell: Typ Article", ld["@type"], "Article");
  eq("redaktionell: Seite unter /artikel", ld.mainEntityOfPage["@id"], `${BASE}/artikel/ai-act`);
  ok("redaktionell: kein Unternehmen, kein Sponsor", ld.sourceOrganization === undefined && ld.sponsor === undefined);
  eq("Autor als Person mit Profil", ld.author, { "@type": "Person", name: "Matthias Zwingli", url: `${BASE}/autor/matthias-zwingli` });
  eq("Keywords dedupliziert", ld.keywords, "AI Act, KI-Gesetz, EU AI Act");
  eq("Herausgeber bleibt digital age", ld.publisher.name, "digital age");
}

// --- JSON-LD: Unternehmensbeitrag
const company = {
  name: "Connect AI Group GmbH",
  profileUrl: `${BASE}/swiss-ai/connect-ai-group-gmbh`,
  website: "https://www.connectai.ch",
  paid: false,
};
{
  const ld = JSON.parse(buildArticleJsonLd(article, BASE, "/showcase/ai-act", company));
  eq("unbezahlt: Typ bleibt Article", ld["@type"], "Article");
  eq("Seite unter /showcase", ld.mainEntityOfPage["@id"], `${BASE}/showcase/ai-act`);
  eq("Unternehmen als sourceOrganization", ld.sourceOrganization, {
    "@type": "Organization",
    name: "Connect AI Group GmbH",
    url: `${BASE}/swiss-ai/connect-ai-group-gmbh`,
    sameAs: ["https://www.connectai.ch"],
  });
  ok("unbezahlt: kein Sponsor", ld.sponsor === undefined);
  eq("Herausgeber bleibt digital age", ld.publisher.name, "digital age");
}
{
  const ld = JSON.parse(buildArticleJsonLd(article, BASE, "/showcase/ai-act", { ...company, paid: true }));
  eq("bezahlt: Typ AdvertiserContentArticle", ld["@type"], "AdvertiserContentArticle");
  eq("bezahlt: Unternehmen ist Sponsor", ld.sponsor?.name, "Connect AI Group GmbH");
}
{
  const ld = JSON.parse(buildArticleJsonLd(article, BASE, "/showcase/ai-act", { ...company, website: "connectai.ch" }));
  ok("Website ohne Protokoll wird nicht als sameAs ausgegeben", ld.sourceOrganization.sameAs === undefined);
}

// --- Metadaten: Canonical folgt dem Pfad
{
  const m = buildArticleMetadata(article, BASE, "/showcase/ai-act");
  eq("Canonical unter /showcase", m.alternates?.canonical, `${BASE}/showcase/ai-act`);
  eq("og:url gleich Canonical", (m.openGraph as { url?: string }).url, `${BASE}/showcase/ai-act`);
  eq("Titel aus dem Artikel", m.title, "Was der AI Act bedeutet");
  const e = buildArticleMetadata(article, BASE, "/artikel/ai-act");
  eq("Canonical unter /artikel", e.alternates?.canonical, `${BASE}/artikel/ai-act`);
}

// --- Kleine Helfer
eq("OG-Bild: Cover, wenn kein Teilen-Bild", resolveOgImage(article, BASE), article.cover_image_url);
eq("OG-Bild: Fallback ohne Cover", resolveOgImage({ cover_image_url: null, og_image_url: null }, BASE), `${BASE}/images/digital-age-og-fallback.jpg`);
eq("Beschreibung wird bei 160 Zeichen gekuerzt", truncateDescription("x".repeat(200))?.length, 158);
eq("leere Beschreibung", truncateDescription("  "), undefined);
eq(
  "Inhaltsverzeichnis: nur H2 und H3",
  deriveTocItems([
    { id: "a", type: "heading", level: 2, content: "Eins" },
    { id: "b", type: "paragraph", content: "Text" },
    { id: "c", type: "heading", level: 4, content: "Vier" },
    { id: "d", type: "heading", level: 3, content: "Drei" },
  ] as never),
  [{ id: "a", label: "Eins", level: 2 }, { id: "d", label: "Drei", level: 3 }],
);

// --- Interessenbindung
eq("leer ist kein Hinweis", normalizeDisclosure("   "), null);
eq("kein Text ist kein Hinweis", normalizeDisclosure(null), null);
eq("Umbrueche und Mehrfach-Leerzeichen werden ein Absatz", normalizeDisclosure("  Ali Soy ist\n\nCGO   der Firma. "), "Ali Soy ist CGO der Firma.");
eq("kurzer Hinweis ist gueltig", disclosureError("Ali Soy ist CGO."), null);
eq("kein Hinweis ist gueltig", disclosureError(null), null);
ok("zu langer Hinweis wird abgelehnt", (disclosureError("x".repeat(DISCLOSURE_MAX + 1)) ?? "").includes(String(DISCLOSURE_MAX)));
eq("genau die Hoechstlaenge ist gueltig", disclosureError("x".repeat(DISCLOSURE_MAX)), null);

console.log(fails === 0 ? "\nAlle Tests gruen." : `\n${fails} Test(s) fehlgeschlagen.`);
process.exit(fails === 0 ? 0 : 1);

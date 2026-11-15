// Reine Helfer der Beitragsseiten (/artikel/<slug> und /showcase/<slug>):
// Datum, Inhaltsverzeichnis, Block-Dokument, Metadaten und JSON-LD. Vorher
// lagen sie in src/app/artikel/[slug]/page.tsx; seit S2b nutzen beide Routen
// dieselben Funktionen. Kein "server-only": der Test importiert sie.
import type { Metadata } from "next";

import type { ArticleWithFullRelations } from "@/lib/articleApi";
import { getCoverUrl } from "@/lib/coverImage";
import { markdownToBlocks } from "@/lib/markdownBlocks";
import type { TocItem } from "@/components/TableOfContents";
import {
  BLOCK_SCHEMA_VERSION,
  type Block,
  type BlockDocument,
} from "@/types/blocks";

export function formatDateDE(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Karten fuer «Mehr von diesem Autor»: die drei neuesten anderen Artikel.
export type RelatedCard = {
  category: string;
  title: string;
  author: string;
  date: string;
  image: string;
  href: string;
  external: boolean;
};

type RelatedRow = {
  id: string;
  slug: string;
  title: string;
  subcategory: string | null;
  published_at: string | null;
  cover_image_url: string | null;
  category: { name_de: string } | null;
};

export function buildRelatedCards(
  rows: RelatedRow[],
  opts: { excludeId: string; authorName: string; external: boolean },
): RelatedCard[] {
  return rows
    .filter((a) => a.id !== opts.excludeId)
    .slice(0, 3)
    .map((a) => ({
      category: a.subcategory ?? a.category?.name_de ?? "",
      title: a.title,
      author: opts.authorName,
      date: formatDateDE(a.published_at),
      image: getCoverUrl(a),
      href: `/artikel/${a.slug}`,
      external: opts.external,
    }));
}

export function deriveTocItems(blocks: Block[]): TocItem[] {
  const items: TocItem[] = [];
  for (const b of blocks) {
    if (b.type === "heading" && (b.level === 2 || b.level === 3)) {
      items.push({ id: b.id, label: b.content, level: b.level });
    }
  }
  return items;
}

export function resolveBlockDocument(article: Pick<ArticleWithFullRelations, "body_blocks" | "body_md">): BlockDocument {
  // body_blocks ist Source-of-Truth seit Phase 8b/c. Legacy-Artikel ohne
  // body_blocks fallen auf den Markdown-Parser zurück.
  if (article.body_blocks) {
    return article.body_blocks as unknown as BlockDocument;
  }
  return {
    version: BLOCK_SCHEMA_VERSION,
    blocks: markdownToBlocks(article.body_md ?? ""),
    sources: [],
  };
}

// OG-Locale-Format unterscheidet sich vom DB-Wert. LinkedIn/Facebook akzep-
// tieren nur eine Whitelist; `de_CH` ist nicht offiziell unterstützt — wir
// mappen daher auf `de_DE` (deckt den deutschsprachigen Raum ab) und
// `en_US` für englischsprachige Artikel.
export function ogLocale(locale: string | null | undefined): "de_DE" | "en_US" {
  return locale === "en" ? "en_US" : "de_DE";
}

// OG-Fallback-Bild (1200×630, JPEG, in `/public/images/`). Greift wenn
// articles.cover_image_url null/leer ist — Default-Cover-Card-Bild
// (`/images/defaults/article-cover-default.png`) hat nicht die OG-
// Standard-Dimensionen, daher eigenes Asset.
export const OG_FALLBACK_PATH = "/images/digital-age-og-fallback.jpg";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

// Liefert die absolute Bild-URL für OG/Twitter. Reihenfolge: og_image_url
// (Teilen-Bild 1200×630 aus dem Hero Studio) → cover_image_url → Fallback.
// Cover ist meistens bereits absolut (Supabase-Storage), kann aber relativ
// sein. Bei null/empty: dediziertes 1200×630-Fallback-Asset. JSON-LD
// `image` und Sitemap bleiben bewusst beim Cover.
export function resolveOgImage(
  article: Pick<ArticleWithFullRelations, "cover_image_url" | "og_image_url">,
  baseUrl: string,
): string {
  const c = article.og_image_url?.trim() || article.cover_image_url?.trim();
  if (!c) return `${baseUrl}${OG_FALLBACK_PATH}`;
  if (/^https?:\/\//i.test(c)) return c;
  return `${baseUrl}${c.startsWith("/") ? "" : "/"}${c}`;
}

// Description-Truncate auf 160 Zeichen für OG/Twitter-Standard.
export function truncateDescription(s: string | null | undefined): string | undefined {
  const t = s?.trim();
  if (!t) return undefined;
  if (t.length <= 160) return t;
  return `${t.slice(0, 157)}…`;
}

// Metadaten einer Beitragsseite. `path` ist der oeffentliche Pfad
// (/artikel/<slug> oder /showcase/<slug>) und wird Canonical und og:url.
export function buildArticleMetadata(
  article: ArticleWithFullRelations,
  baseUrl: string,
  path: string,
): Metadata {
  const title = article.seo_title?.trim() || article.title;
  const description = truncateDescription(
    article.seo_description ?? article.excerpt,
  );
  const canonical = `${baseUrl}${path}`;
  const ogImage = resolveOgImage(article, baseUrl);
  // og:image.alt + twitter:image.alt: bevorzugt cover_image_alt, sonst
  // Fallback auf article.title (Bestand hat leere ALT; ALT ist erst in
  // einem spaeteren PR Pre-Publish-Pflichtfeld).
  const ogImageAlt = article.cover_image_alt?.trim() || article.title;
  const authorHandle = article.author?.handle ?? article.author?.slug;
  const authorName = article.author?.display_name;
  const authorUrl = authorHandle ? `${baseUrl}/autor/${authorHandle}` : undefined;
  const categoryName = article.category?.name_de ?? undefined;
  const tags = Array.isArray(article.tags) && article.tags.length > 0
    ? article.tags
    : undefined;

  // Keywords-Meta-Tag (Standard-Format, niedrige SEO-Relevanz aber harmlos).
  // Primary + Secondary kombiniert, Duplikate raus, kommagetrennt.
  const keywordList = [
    article.seo_keyword_primary?.trim(),
    ...(article.seo_keywords_secondary ?? []).map((k) => k.trim()),
  ]
    .filter((k): k is string => !!k && k.length > 0)
    .filter((k, i, arr) => arr.indexOf(k) === i);
  const keywords = keywordList.length > 0 ? keywordList : undefined;

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      type: "article",
      locale: ogLocale(article.locale),
      siteName: "digital age",
      title,
      description,
      url: canonical,
      images: [
        {
          url: ogImage,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: ogImageAlt,
        },
      ],
      authors: authorUrl ? [authorUrl] : authorName ? [authorName] : undefined,
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at ?? undefined,
      section: categoryName,
      tags,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: ogImage, alt: ogImageAlt }],
    },
  };
}

// Absender eines Unternehmensbeitrags fuers JSON-LD.
export type ArticleJsonLdCompany = {
  name: string;
  // Profil im Verzeichnis (absolute URL) und Website des Unternehmens.
  profileUrl: string;
  website?: string | null;
  // Bezahlter Beitrag (Publireportage).
  paid: boolean;
};

// JSON-LD-Generator (schema.org Article). Wird im Body der Page-Komponente
// als <script type="application/ld+json"> gerendert. Google liest das von
// jeder Stelle im HTML — wir rendern es direkt nach <main> für Lokalität.
//
// Unternehmensbeitrag (company): `sourceOrganization` nennt das Unternehmen,
// in dessen Auftrag der Text entstand. Ist der Beitrag bezahlt, wird der Typ
// `AdvertiserContentArticle` und das Unternehmen steht zusaetzlich als
// `sponsor`. Unbezahlte Beitraege tragen bewusst keinen `sponsor`: Der Begriff
// meint eine finanzielle Leistung.
export function buildArticleJsonLd(
  article: ArticleWithFullRelations,
  baseUrl: string,
  path: string = `/artikel/${article.slug}`,
  company?: ArticleJsonLdCompany,
): string {
  const canonical = `${baseUrl}${path}`;
  const ogImage = resolveOgImage(article, baseUrl);
  const description = truncateDescription(
    article.seo_description ?? article.excerpt,
  );
  const categoryName = article.category?.name_de ?? undefined;
  // keywords: Primary + Secondary + freie Tags; dedupliziert, kommagetrennt
  // als String (schema.org akzeptiert Array oder String; String ist die
  // verbreitete Form für die Google-Rich-Results-Validation).
  const keywordList = [
    article.seo_keyword_primary?.trim(),
    ...(article.seo_keywords_secondary ?? []).map((k) => k.trim()),
    ...(article.tags ?? []).map((k) => k.trim()),
  ]
    .filter((k): k is string => !!k && k.length > 0)
    .filter((k, i, arr) => arr.indexOf(k) === i);
  const keywords = keywordList.length > 0 ? keywordList.join(", ") : undefined;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": company?.paid ? "AdvertiserContentArticle" : "Article",
    headline: article.title,
    description,
    image: ogImage,
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at ?? undefined,
    inLanguage: article.locale,
    articleSection: categoryName,
    keywords,
    publisher: {
      "@type": "Organization",
      name: "digital age",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}${OG_FALLBACK_PATH}`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
  };
  if (article.author?.display_name) {
    const personNode: Record<string, unknown> = {
      "@type": "Person",
      name: article.author.display_name,
    };
    // Person.url nur wenn Handle gesetzt — sonst ist /autor/<X> nicht
    // erreichbar (Authors ohne handle haben keine Public-Profil-URL).
    if (article.author.handle) {
      personNode.url = `${baseUrl}/autor/${article.author.handle}`;
    }
    data.author = personNode;
  }
  if (company) {
    const org: Record<string, unknown> = {
      "@type": "Organization",
      name: company.name,
      url: company.profileUrl,
    };
    if (company.website && /^https?:\/\//i.test(company.website)) org.sameAs = [company.website];
    data.sourceOrganization = org;
    if (company.paid) data.sponsor = org;
  }
  return JSON.stringify(data);
}

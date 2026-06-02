import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "@/components/Footer";
import ListenButton from "@/components/ListenButton";
import ShareButtons from "@/components/ShareButtons";
import AuthorBox from "@/components/AuthorBox";
import ArticleBody from "@/components/ArticleBody";
import ArticleSection from "@/components/ArticleSection";
import BlockReader from "@/components/BlockReader";
import InlineText from "@/components/InlineText";
import NewsletterSignup from "@/components/NewsletterSignup";
import ReadingProgress from "@/components/ReadingProgress";
import TableOfContents, { type TocItem } from "@/components/TableOfContents";
import ExternalBadge from "@/components/ExternalBadge";
import { getArticleBySlug, type ArticleWithFullRelations } from "@/lib/articleApi";
import { getArticlesByAuthor } from "@/lib/authorApi";
import { getCoverUrl } from "@/lib/coverImage";
import { markdownToBlocks } from "@/lib/markdownBlocks";
import { getBaseUrl } from "@/lib/siteUrl";
import { slugifyTag } from "@/lib/tagSlug";
import { buildBreadcrumbJsonLd } from "@/lib/jsonLd";
import {
  BLOCK_SCHEMA_VERSION,
  type Block,
  type BlockDocument,
} from "@/types/blocks";

type PageProps = { params: Promise<{ slug: string }> };

export const revalidate = 600;

function formatDateDE(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function deriveTocItems(blocks: Block[]): TocItem[] {
  const items: TocItem[] = [];
  for (const b of blocks) {
    if (b.type === "heading" && (b.level === 2 || b.level === 3)) {
      items.push({ id: b.id, label: b.content, level: b.level });
    }
  }
  return items;
}

function resolveBlockDocument(article: ArticleWithFullRelations): BlockDocument {
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
function ogLocale(locale: string | null | undefined): "de_DE" | "en_US" {
  return locale === "en" ? "en_US" : "de_DE";
}

// OG-Fallback-Bild (1200×630, JPEG, in `/public/images/`). Greift wenn
// articles.cover_image_url null/leer ist — Default-Cover-Card-Bild
// (`/images/defaults/article-cover-default.png`) hat nicht die OG-
// Standard-Dimensionen, daher eigenes Asset.
const OG_FALLBACK_PATH = "/images/digital-age-og-fallback.jpg";
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

// Liefert die absolute Bild-URL für OG/Twitter. Cover ist meistens
// bereits absolut (Supabase-Storage), kann aber relativ sein. Bei
// null/empty: dediziertes 1200×630-Fallback-Asset.
function resolveOgImage(
  article: Pick<ArticleWithFullRelations, "cover_image_url">,
  baseUrl: string,
): string {
  const c = article.cover_image_url?.trim();
  if (!c) return `${baseUrl}${OG_FALLBACK_PATH}`;
  if (/^https?:\/\//i.test(c)) return c;
  return `${baseUrl}${c.startsWith("/") ? "" : "/"}${c}`;
}

// Description-Truncate auf 160 Zeichen für OG/Twitter-Standard.
function truncateDescription(s: string | null | undefined): string | undefined {
  const t = s?.trim();
  if (!t) return undefined;
  if (t.length <= 160) return t;
  return `${t.slice(0, 157)}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};

  const baseUrl = getBaseUrl();
  const title = article.seo_title?.trim() || article.title;
  const description = truncateDescription(
    article.seo_description ?? article.excerpt,
  );
  const canonical = `${baseUrl}/artikel/${article.slug}`;
  const ogImage = resolveOgImage(article, baseUrl);
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
          alt: article.title,
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
      images: [{ url: ogImage, alt: article.title }],
    },
  };
}

// JSON-LD-Generator (schema.org Article). Wird im Body der Page-Komponente
// als <script type="application/ld+json"> gerendert. Google liest das von
// jeder Stelle im HTML — wir rendern es direkt nach <main> für Lokalität.
function buildArticleJsonLd(
  article: ArticleWithFullRelations,
  baseUrl: string,
): string {
  const canonical = `${baseUrl}/artikel/${article.slug}`;
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
    "@type": "Article",
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
  return JSON.stringify(data);
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article || !article.author) notFound();
  return <ArticleView article={article} />;
}

function ArticleView({ article }: { article: ArticleWithFullRelations }) {
  const author = article.author!;
  const isExternal = author.role === "external";
  const subcategory = article.subcategory ?? article.category?.name_de ?? "";
  const dateLabel = formatDateDE(article.published_at);
  // ShareButtons brauchen die absolute URL — sonst landet beim Copy auf
  // einem Preview-Deploy die Hash-Vercel-URL im Zwischenspeicher. Server-
  // side via getBaseUrl() (NEXT_PUBLIC_SITE_URL → Production-Domain).
  const url = `${getBaseUrl()}/artikel/${article.slug}`;
  const ttsText = `${article.title}. ${article.excerpt ?? ""}`.trim();
  const doc = resolveBlockDocument(article);
  const tocItems = deriveTocItems(doc.blocks);
  const authorHandle = author.handle ?? author.slug;
  const baseUrl = getBaseUrl();
  const jsonLd = buildArticleJsonLd(article, baseUrl);
  // Breadcrumb-Schema folgt der SEO-Hierarchie (Hauptkategorie, nicht die
  // sichtbare Subcategory — letztere hat keine eigene Route und wäre
  // nicht verlinkbar). Letzter Eintrag ohne URL = aktuelle Page.
  // category.slug aus der DB (z.B. "ki-business") matched nicht direkt mit
  // dem Listing-Pfad (/ki-im-business); kleines Lookup deckt die vier
  // bekannten Kategorien ab. Unbekannte Slug → Crumb ohne URL.
  const categoryRouteMap: Record<string, string> = {
    "ki-business": "/ki-im-business",
    "future-tech": "/future-tech",
    "swiss-ai": "/swiss-ai",
  };
  const categoryName = article.category?.name_de;
  const categorySlug = article.category?.slug;
  const categoryRoute = categorySlug
    ? categoryRouteMap[categorySlug]
    : undefined;
  const breadcrumbItems = [
    { name: "Home", url: `${baseUrl}/` },
    ...(categoryName
      ? [
          categoryRoute
            ? { name: categoryName, url: `${baseUrl}${categoryRoute}` }
            : { name: categoryName },
        ]
      : []),
    { name: article.title },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <ReadingProgress />
      

      <header style={{ maxWidth: "860px", margin: "0 auto", padding: "52px var(--sp-8) 28px" }}>
        <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--sp-6)" }}>
          <Link href="/" style={{ color: "var(--da-muted)", fontSize: "var(--fs-body-sm)" }}>Home</Link>
          <span style={{ color: "var(--da-faint)", fontSize: "var(--fs-body-sm)" }}>/</span>
          <span
            style={{
              color: "var(--da-green)",
              fontFamily: "var(--da-font-mono)",
              fontSize: "var(--fs-body-sm)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {subcategory}
          </span>
          {isExternal && (
            <>
              <span style={{ color: "var(--da-faint)", fontSize: "var(--fs-body-sm)" }}>·</span>
              <ExternalBadge size="xs" />
            </>
          )}
        </nav>

        <h1
          style={{
            color: "var(--da-text)",
            fontFamily: "var(--da-font-display)",
            fontSize: "clamp(30px, 4vw, 48px)",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: "var(--sp-6)",
          }}
        >
          {article.title}
        </h1>

        {article.excerpt && (
          <p style={{ color: "#c0c0c0", fontSize: "20px", lineHeight: 1.65, marginBottom: "36px", fontWeight: 300 }}>
            <InlineText content={article.excerpt} sources={doc.sources} />
          </p>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--sp-4)",
            paddingBottom: "28px",
            borderBottom: "1px solid var(--da-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* Avatar-Link geht zum selben Ziel wie der Name-Link.
                aria-hidden + tabIndex=-1, damit Screenreader/Tastatur
                nicht beides als doppelten Link vorlesen — der Name-Link
                bleibt die zugängliche Hauptaktion. */}
            <Link
              href={`/autor/${authorHandle}`}
              aria-hidden="true"
              tabIndex={-1}
              style={{
                position: "relative",
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: "50%",
                overflow: "hidden",
                border: `2px solid ${isExternal ? "var(--da-orange)" : "var(--da-green)"}`,
                display: "block",
              }}
            >
              {author.avatar_url && (
                <Image src={author.avatar_url} alt={author.display_name} fill sizes="44px" style={{ objectFit: "cover" }} unoptimized />
              )}
            </Link>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Link href={`/autor/${authorHandle}`} style={{ color: "var(--da-text)", fontSize: "var(--fs-body)", fontWeight: 600 }}>
                  {author.display_name}
                </Link>
                {isExternal && <ExternalBadge size="xs" />}
              </div>
              <p style={{ color: "var(--da-muted)", fontFamily: "var(--da-font-mono)", fontSize: "var(--fs-body-sm)" }}>
                {dateLabel} · {article.reading_minutes ?? 0} min Lesezeit
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)", flexWrap: "wrap" }}>
            <ListenButton text={ttsText} />
            <ShareButtons title={article.title} url={url} />
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 var(--sp-8) var(--sp-12)" }}>
        <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden" }}>
          <Image
            src={getCoverUrl(article)}
            alt={article.title}
            width={1600}
            height={900}
            sizes="(max-width: 1100px) 100vw, 1100px"
            priority
            unoptimized
            style={{ width: "100%", height: "auto", maxHeight: "520px", objectFit: "cover", display: "block" }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(28,28,30,0.3) 0%, transparent 40%)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      <ArticleBodyGrid hasToc={tocItems.length > 0}>
        <article>
          <ArticleBody>
            <BlockReader doc={doc} />
          </ArticleBody>

          {article.tags && article.tags.length > 0 && (
            <div style={{ marginTop: "var(--sp-10)", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tag/${slugifyTag(tag)}`}
                  style={{
                    background: "var(--da-card)",
                    border: "1px solid var(--da-border)",
                    color: "var(--da-text-strong)",
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontFamily: "var(--da-font-mono)",
                    textDecoration: "none",
                    transition: "border-color var(--t-fast), color var(--t-fast)",
                  }}
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          <div style={{ marginTop: "var(--sp-12)", paddingTop: "var(--sp-8)", borderTop: "1px solid var(--da-card)" }}>
            <ShareButtons title={article.title} url={url} />
          </div>

          <AuthorBox
            name={author.display_name}
            slug={authorHandle}
            avatar={author.avatar_url ?? ""}
            bio={author.bio ?? ""}
            role={author.job_title ?? undefined}
            external={isExternal}
          />
          <NewsletterSignup variant="inline" />
        </article>

        {tocItems.length > 0 && (
          <aside style={{ position: "sticky", top: "calc(var(--nav-h) + 24px)", alignSelf: "start" }}>
            <TableOfContents items={tocItems} />
          </aside>
        )}
      </ArticleBodyGrid>

      <RelatedFromAuthor
        authorId={author.id}
        authorDisplayName={author.display_name}
        authorHandle={authorHandle}
        isExternal={isExternal}
        excludeArticleId={article.id}
      />

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}

async function RelatedFromAuthor({
  authorId,
  authorDisplayName,
  authorHandle,
  isExternal,
  excludeArticleId,
}: {
  authorId: string;
  authorDisplayName: string;
  authorHandle: string;
  isExternal: boolean;
  excludeArticleId: string;
}) {
  const relatedRows = await getArticlesByAuthor(authorId);
  const related = relatedRows
    .filter((a) => a.id !== excludeArticleId)
    .slice(0, 3)
    .map((a) => ({
      category: a.subcategory ?? a.category?.name_de ?? "",
      title: a.title,
      author: authorDisplayName,
      date: formatDateDE(a.published_at),
      image: getCoverUrl(a),
      href: `/artikel/${a.slug}`,
      external: isExternal,
    }));

  if (related.length === 0) return null;

  return (
    <ArticleSection title="Mehr von diesem Autor" href={`/autor/${authorHandle}`} articles={related} />
  );
}

function ArticleBodyGrid({ children, hasToc }: { children: React.ReactNode; hasToc: boolean }) {
  return (
    <>
      <style>{`
        .article-grid {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 var(--sp-8);
          display: grid;
          grid-template-columns: ${hasToc ? "1fr 220px" : "minmax(0, 860px)"};
          ${hasToc ? "gap: var(--sp-16);" : "justify-content: center;"}
          align-items: start;
        }
        @media (max-width: 1024px) {
          .article-grid { grid-template-columns: 1fr; gap: var(--sp-8); }
          .article-grid > aside { display: none; }
        }
      `}</style>
      <div className="article-grid">{children}</div>
    </>
  );
}

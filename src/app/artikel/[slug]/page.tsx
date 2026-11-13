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
import { getSlotReservation, type SlotReservation } from "@/lib/ads/slotReservation";
import HtmlLang from "@/components/HtmlLang";
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
import { createPublicClient } from "@/lib/supabase/public";
import { buildSpeechChunks, resolveSpeechLang } from "@/lib/listen/speechText";
import { getPodcastsByArticleSlug, type PodcastWithRecommender } from "@/lib/podcastApi";
import ArticlePodcastBar from "@/components/ArticlePodcastBar";
import ArticleCoverVideo from "@/components/ArticleCoverVideo";
import ListenLinks, { type ListenLinksMap } from "@/components/ListenLinks";
import {
  ARTICLE_PODCAST_ANCHOR,
  ARTICLE_PODCAST_PLAY_EVENT,
} from "@/lib/podcast/articleAudio";
import {
  BLOCK_SCHEMA_VERSION,
  type Block,
  type BlockDocument,
} from "@/types/blocks";

type PageProps = { params: Promise<{ slug: string }> };

export const revalidate = 600;

// SSG: alle published Article-Slugs vorab generieren. Damit greift
// revalidate als ISR auf Vercel-Edge (siehe Vorbild in /tag/[slug] +
// Erkenntnis aus PR #114-Live-Test). Anon-Client → kein cookies(), das
// ist der entscheidende Punkt für Static-Rendering.
// Fallback bei fehlenden Build-Env-Vars: leeres Array, Next.js rendert
// jeden Slug on-demand und ISR-cached danach.
export async function generateStaticParams() {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("articles")
      .select("slug")
      .eq("status", "published");
    return (data ?? []).map((a) => ({ slug: a.slug }));
  } catch {
    return [];
  }
}

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

// Liefert die absolute Bild-URL für OG/Twitter. Reihenfolge: og_image_url
// (Teilen-Bild 1200×630 aus dem Hero Studio) → cover_image_url → Fallback.
// Cover ist meistens bereits absolut (Supabase-Storage), kann aber relativ
// sein. Bei null/empty: dediziertes 1200×630-Fallback-Asset. JSON-LD
// `image` und Sitemap bleiben bewusst beim Cover.
function resolveOgImage(
  article: Pick<ArticleWithFullRelations, "cover_image_url" | "og_image_url">,
  baseUrl: string,
): string {
  const c = article.og_image_url?.trim() || article.cover_image_url?.trim();
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
  const moduleReserve = await getSlotReservation("article_inline");
  return <ArticleView article={article} moduleReserve={moduleReserve} />;
}

async function ArticleView({ article, moduleReserve }: { article: ArticleWithFullRelations; moduleReserve: SlotReservation }) {
  const author = article.author!;
  const isExternal = author.role === "external";
  const subcategory = article.subcategory ?? article.category?.name_de ?? "";
  const dateLabel = formatDateDE(article.published_at);
  // ShareButtons brauchen die absolute URL — sonst landet beim Copy auf
  // einem Preview-Deploy die Hash-Vercel-URL im Zwischenspeicher. Server-
  // side via getBaseUrl() (NEXT_PUBLIC_SITE_URL → Production-Domain).
  const url = `${getBaseUrl()}/artikel/${article.slug}`;
  const doc = resolveBlockDocument(article);
  // "Anhoeren" liest den ganzen Artikel: Titel -> Abstract -> Body-Bloecke.
  // Chunks server-seitig bauen (eine utterance pro Chunk im Client).
  const speechChunks = buildSpeechChunks({
    title: article.title,
    excerpt: article.excerpt,
    doc,
  });
  const speechLang = resolveSpeechLang(article.locale);
  // SEO N2: <html lang> ist im Root-Layout "de". Englische Artikel markieren
  // ihren Inhalt am <article> und setzen das Dokument-lang im Client nach.
  const htmlLang = article.locale === "en" ? "en" : "de";
  const authorHandle = author.handle ?? author.slug;

  // Verknuepfte Podcasts (fuers "Podcast zum Beitrag" direkt unter dem Header).
  // Existiert ein self-hosted Podcast, spielt der ANHOEREN-Button diesen ab
  // (statt TTS) und die TOC bekommt einen "Play Podcast"-Eintrag.
  const linkedPodcasts = await getPodcastsByArticleSlug(article.slug);
  const hasPlayablePodcast = linkedPodcasts.some(
    (p) => p.source_type === "self_hosted" && !!p.audio_url,
  );
  const baseToc = deriveTocItems(doc.blocks);
  const tocItems = hasPlayablePodcast
    ? [{ id: ARTICLE_PODCAST_ANCHOR, label: "Play Podcast" }, ...baseToc]
    : baseToc;
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
         
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <ReadingProgress />
      

      <ArticleHeadStyles />
      <header className="ah">
        <nav aria-label="Breadcrumb" className="ah-kicker">
          {categoryName && categoryRoute ? (
            <Link href={categoryRoute} className="ah-kicker__rubric">{categoryName}</Link>
          ) : categoryName ? (
            <span className="ah-kicker__rubric">{categoryName}</span>
          ) : null}
          {subcategory && subcategory !== categoryName && (
            <>
              <span className="ah-kicker__sep" aria-hidden>/</span>
              <span className="ah-kicker__sub">{subcategory}</span>
            </>
          )}
          {isExternal && <ExternalBadge size="xs" />}
        </nav>

        <h1 className="ah-title">{article.title}</h1>

        <div className="ah-body">
          <div className="ah-side">
            {article.excerpt && (
              <p className="ah-dek">
                <InlineText content={article.excerpt} sources={doc.sources} />
              </p>
            )}
            <div className="ah-byline">
              <div className="ah-author">
                {/* Avatar-Link geht zum selben Ziel wie der Name-Link.
                    aria-hidden + tabIndex=-1, damit Screenreader/Tastatur
                    nicht beides als doppelten Link vorlesen. */}
                <Link
                  href={`/autor/${authorHandle}`}
                  aria-hidden="true"
                  tabIndex={-1}
                  className="ah-avatar"
                  style={{ borderColor: isExternal ? "var(--da-orange)" : "var(--da-green)" }}
                >
                  {author.avatar_url && (
                    <Image src={author.avatar_url} alt={author.display_name} fill sizes="40px" style={{ objectFit: "cover" }} unoptimized />
                  )}
                </Link>
                <div>
                  <Link href={`/autor/${authorHandle}`} className="ah-author__name">{author.display_name}</Link>
                  <p className="ah-author__meta">{dateLabel} · {article.reading_minutes ?? 0} min Lesezeit</p>
                </div>
              </div>
              <div className="ah-actions">
                <ListenButton
                  chunks={speechChunks}
                  lang={speechLang}
                  podcastTargetId={hasPlayablePodcast ? ARTICLE_PODCAST_ANCHOR : undefined}
                  podcastPlayEvent={hasPlayablePodcast ? ARTICLE_PODCAST_PLAY_EVENT : undefined}
                />
                <ShareButtons title={article.title} url={url} />
              </div>
            </div>
          </div>

          <figure className="ah-figure">
            <div className="ah-figure__frame">
              <Image
                src={getCoverUrl(article)}
                alt={article.cover_image_alt?.trim() || article.title}
                width={1600}
                height={900}
                sizes="(max-width: 1024px) 100vw, 1136px"
                priority
                unoptimized
                className="ah-figure__img"
              />
              {/* Hero-Animation (Hero Studio): dekorative Ebene ueber dem Bild,
                  das Bild bleibt LCP, Poster und Fallback. */}
              {article.cover_video_url?.trim() && (
                <ArticleCoverVideo src={article.cover_video_url.trim()} poster={getCoverUrl(article)} />
              )}
            </div>
            {(article.cover_image_caption?.trim() || article.cover_image_source?.trim()) && (
              <figcaption className="ah-figure__cap">
                {article.cover_image_caption?.trim() && <span>{article.cover_image_caption.trim()}</span>}
                {article.cover_image_source?.trim() && <small>{article.cover_image_source.trim()}</small>}
              </figcaption>
            )}
          </figure>
        </div>
      </header>

      <LinkedPodcastsSection podcasts={linkedPodcasts} />
      {htmlLang !== "de" && <HtmlLang lang={htmlLang} />}

      <ArticleBodyGrid hasToc={tocItems.length > 0}>
        <article lang={htmlLang}>
          <ArticleBody>
            <BlockReader doc={doc} articleSlug={article.slug} ressortSlug={categorySlug} moduleReserve={moduleReserve} locale={article.locale} />
          </ArticleBody>

          <div className="art-endbar">
            {article.tags && article.tags.length > 0 && (
              <div className="art-tags">
                {article.tags.map((tag) => (
                  <Link key={tag} href={`/tag/${slugifyTag(tag)}`} className="art-tag">
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
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

// Schlanke Podcast-Leiste(n) fuer Podcasts, die auf diesen Beitrag verweisen
// (related_article_slug). Sitzt direkt UNTER dem Hero-Bild, damit der visuelle
// Einstieg (Lead -> Bild) intakt bleibt. Self-hosted -> einzeilige Play-Leiste
// (ArticlePodcastBar), extern -> Titel + Plattform-Links. Der Anchor
// (ARTICLE_PODCAST_ANCHOR) ist Ziel des ANHOEREN-Buttons + TOC-Eintrags; der
// erste self-hosted Player bekommt das Play-Event.
function LinkedPodcastsSection({ podcasts }: { podcasts: PodcastWithRecommender[] }) {
  if (podcasts.length === 0) return null;
  const firstPlayableIdx = podcasts.findIndex(
    (p) => p.source_type === "self_hosted" && !!p.audio_url,
  );

  return (
    <section id={ARTICLE_PODCAST_ANCHOR} style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 var(--gutter) var(--sp-8)", scrollMarginTop: "var(--nav-h)" }}>
      <p style={{ color: "var(--da-faint)", fontFamily: "var(--da-font-mono)", fontSize: "var(--fs-caption)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "var(--sp-3)" }}>
        Podcast zum Beitrag
      </p>
      {/* Breite = Textspalte (680), linksbuendig wie Kopf, Bild und Text. */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", maxWidth: "680px" }}>
        {podcasts.map((p, idx) => {
          const isSelfHosted = p.source_type === "self_hosted" && !!p.audio_url;
          if (isSelfHosted && p.audio_url) {
            return (
              <ArticlePodcastBar
                key={p.id}
                src={p.audio_url}
                title={p.title}
                slug={p.slug}
                durationSeconds={p.duration_seconds}
                aiGenerated={p.ai_generated}
                playEventName={idx === firstPlayableIdx ? ARTICLE_PODCAST_PLAY_EVENT : undefined}
              />
            );
          }
          const externalLinks: ListenLinksMap = {
            spotify: p.spotify_url ?? undefined,
            applePodcasts: p.apple_podcasts_url ?? undefined,
            youtube: p.youtube_url ?? undefined,
            soundcloud: p.soundcloud_url ?? undefined,
            audible: p.audible_url ?? undefined,
          };
          return (
            <div
              key={p.id}
              style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: "var(--r-md)", padding: "10px 14px" }}
            >
              <Link
                href={`/podcast/${p.slug}`}
                style={{ color: "var(--da-text)", fontSize: "var(--fs-body-sm)", fontWeight: 600, textDecoration: "none" }}
              >
                {p.title}
              </Link>
              <ListenLinks links={externalLinks} size="sm" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ArticleBodyGrid({ children, hasToc }: { children: React.ReactNode; hasToc: boolean }) {
  // Gleiches Raster wie Kopf und Navbar (1200 inkl. Rand): Text 680 px
  // linksbuendig, Inhaltsverzeichnis rechts an der Kante.
  return (
    <>
      <style>{`
        .article-grid {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 var(--gutter);
          display: grid;
          grid-template-columns: ${hasToc ? "minmax(0, 680px) 220px" : "minmax(0, 680px)"};
          justify-content: space-between;
          align-items: start;
        }
        .art-endbar {
          margin-top: var(--sp-10);
          padding-top: var(--sp-6);
          border-top: 1px solid var(--da-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--sp-4);
          flex-wrap: wrap;
        }
        .art-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .art-tag {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          color: var(--da-text-strong);
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 999px;
          font-family: var(--da-font-mono);
          text-decoration: none;
          transition: border-color var(--t-fast), color var(--t-fast);
        }
        .art-tag:hover { border-color: var(--da-green); color: var(--da-text); }
        @media (max-width: 1024px) {
          .article-grid { grid-template-columns: minmax(0, 1fr); }
          .article-grid > aside { display: none; }
        }
      `}</style>
      <div className="article-grid">{children}</div>
    </>
  );
}

// Kopf der Beitragsseite (Design-Check Artikel, PR 198, Entscheid Ali
// 13.11.2026: Variante A). Raster wie die Navbar (1200 inkl. Rand): Rubrik /
// Unterrubrik, Titel ueber die ganze Breite, darunter links das Beitragsbild,
// rechts Abstract und Autorzeile (unten buendig). Bild im natuerlichen
// Seitenverhaeltnis, nur sehr hohe Bilder werden ab --ah-img-max beschnitten.
// Bis 1024 px untereinander (Abstract, Autor, Bild), auf dem Handy das Bild
// direkt unter dem Titel.
function ArticleHeadStyles() {
  return (
    <style>{`
      .ah { max-width: 1200px; margin: 0 auto; padding: 44px var(--gutter) var(--sp-10); }
      .ah-kicker {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        font-family: var(--da-font-mono); font-size: 12px; font-weight: 700;
        letter-spacing: 0.1em; text-transform: uppercase;
      }
      .ah-kicker__rubric { color: var(--da-green); text-decoration: none; }
      a.ah-kicker__rubric:hover { text-decoration: underline; text-underline-offset: 3px; }
      .ah-kicker__sep { color: var(--da-faint); }
      .ah-kicker__sub { color: var(--da-muted); }
      .ah-title {
        color: var(--da-text);
        font-family: var(--da-font-display);
        font-size: clamp(30px, 3.9vw, 50px);
        font-weight: 700;
        line-height: 1.12;
        letter-spacing: -0.02em;
        max-width: 1000px;
        margin: 18px 0 0;
      }
      .ah-body {
        display: grid; grid-template-columns: minmax(0, 1fr) 360px; grid-template-areas: "fig side";
        column-gap: 40px; margin-top: 32px; align-items: stretch;
      }
      .ah-side { grid-area: side; display: flex; flex-direction: column; gap: 24px; min-width: 0; }
      .ah-dek { color: #c6c6c6; font-size: 17px; line-height: 1.6; margin: 0; }
      .ah-byline {
        margin-top: auto; display: flex; flex-direction: column; align-items: flex-start; gap: 16px;
        padding-top: 18px; border-top: 1px solid var(--da-border);
      }
      .ah-author { display: flex; align-items: center; gap: 12px; }
      .ah-avatar {
        position: relative; width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%;
        overflow: hidden; border: 2px solid var(--da-green); display: block;
      }
      .ah-author__name { color: var(--da-text); font-size: 15px; font-weight: 600; text-decoration: none; }
      .ah-author__meta { color: var(--da-muted); font-family: var(--da-font-mono); font-size: 12px; margin: 2px 0 0; }
      .ah-actions { display: flex; align-items: center; gap: 14px; flex-wrap: nowrap; }
      .ah-actions .share-row__label { display: none; }
      .ah-figure { grid-area: fig; margin: 0; --ah-img-max: 480px; }
      .ah-figure__frame { position: relative; border-radius: 10px; overflow: hidden; background: var(--da-card); }
      .ah-figure__img { width: 100%; height: auto; max-height: var(--ah-img-max); object-fit: cover; display: block; }
      .ah-figure__cap {
        display: flex; gap: 10px; flex-wrap: wrap; align-items: baseline;
        margin-top: 10px; font-size: 13px; color: var(--da-text-strong);
      }
      .ah-figure__cap small { color: var(--da-muted-soft); font-size: 12px; font-style: italic; }

      @media (max-width: 1024px) {
        .ah-body { display: flex; flex-direction: column; margin-top: 0; }
        .ah-side { gap: 0; }
        .ah-dek { font-size: 19px; max-width: 760px; margin-top: 20px; }
        .ah-byline {
          margin-top: 28px; flex-direction: row; align-items: center; justify-content: space-between;
          flex-wrap: wrap; padding: 18px 0; border-bottom: 1px solid var(--da-border);
        }
        .ah-actions .share-row__label { display: inline; }
        .ah-figure { margin-top: 32px; --ah-img-max: 640px; }
      }
      @media (max-width: 640px) {
        .ah { padding-top: 32px; }
        .ah-figure { order: -1; margin-top: 22px; --ah-img-max: 420px; }
        .ah-dek { font-size: 17px; margin-top: 20px; }
        .ah-byline { margin-top: 22px; padding: 16px 0; gap: 14px; }
        .ah-actions { gap: 12px; }
        .ah-actions .share-row__label { display: none; }
        .ah-figure__frame { border-radius: 8px; }
      }
    `}</style>
  );
}

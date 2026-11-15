import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import Footer from "@/components/Footer";
import ListenButton from "@/components/ListenButton";
import ShareButtons from "@/components/ShareButtons";
import AuthorBox from "@/components/AuthorBox";
import ArticleBody from "@/components/ArticleBody";
import ArticleSection from "@/components/ArticleSection";
import {
  ArticleBodyGrid,
  ArticleFigure,
  ArticleHeadStyles,
  DisclosureNote,
  LinkedPodcastsSection,
} from "@/components/article/ArticlePageParts";
import BlockReader from "@/components/BlockReader";
import { getSlotReservation, type SlotReservation } from "@/lib/ads/slotReservation";
import HtmlLang from "@/components/HtmlLang";
import InlineText from "@/components/InlineText";
import NewsletterSignup from "@/components/NewsletterSignup";
import ReadingProgress from "@/components/ReadingProgress";
import TableOfContents from "@/components/TableOfContents";
import ExternalBadge from "@/components/ExternalBadge";
import { getArticleBySlug, type ArticleWithFullRelations } from "@/lib/articleApi";
import { getArticlesByAuthor } from "@/lib/authorApi";
import {
  buildArticleJsonLd,
  buildArticleMetadata,
  deriveTocItems,
  formatDateDE,
  resolveBlockDocument,
} from "@/lib/articlePage";
import { SHOWCASE_PATH, editorialOnly } from "@/lib/contentType";
import { getPublishedContentType } from "@/lib/showcaseApi";
import { getCoverUrl } from "@/lib/coverImage";
import { getBaseUrl } from "@/lib/siteUrl";
import { slugifyTag } from "@/lib/tagSlug";
import { buildBreadcrumbJsonLd } from "@/lib/jsonLd";
import { createPublicClient } from "@/lib/supabase/public";
import { buildSpeechChunks, resolveSpeechLang } from "@/lib/listen/speechText";
import { getPodcastsByArticleSlug } from "@/lib/podcastApi";
import {
  ARTICLE_PODCAST_ANCHOR,
  ARTICLE_PODCAST_PLAY_EVENT,
} from "@/lib/podcast/articleAudio";

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
    const { data } = await editorialOnly(
      supabase.from("articles").select("slug").eq("status", "published"),
    );
    return (data ?? []).map((a) => ({ slug: a.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return {};
  return buildArticleMetadata(article, getBaseUrl(), `/artikel/${article.slug}`);
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    // Unternehmensbeitraege stehen unter /showcase/<slug> (S2b). Alte Links,
    // Suchmaschinen und interne Verweise auf /artikel/<slug> landen dort.
    if ((await getPublishedContentType(slug)) === "company") permanentRedirect(`${SHOWCASE_PATH}/${slug}`);
    notFound();
  }
  if (!article.author) notFound();
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

          <ArticleFigure article={article} />
        </div>
      </header>

      <LinkedPodcastsSection podcasts={linkedPodcasts} />
      {htmlLang !== "de" && <HtmlLang lang={htmlLang} />}

      <ArticleBodyGrid hasToc={tocItems.length > 0}>
        <article lang={htmlLang}>
          <DisclosureNote note={article.disclosure_note} />
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

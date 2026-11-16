import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import ArticleBody from "@/components/ArticleBody";
import ArticleSection from "@/components/ArticleSection";
import AuthorBox from "@/components/AuthorBox";
import BlockReader from "@/components/BlockReader";
import ExternalBadge from "@/components/ExternalBadge";
import Footer from "@/components/Footer";
import HtmlLang from "@/components/HtmlLang";
import InlineText from "@/components/InlineText";
import ListenButton from "@/components/ListenButton";
import NewsletterSignup from "@/components/NewsletterSignup";
import ReadingProgress from "@/components/ReadingProgress";
import ReadingMeter from "@/components/article/ReadingMeter";
import ShareButtons from "@/components/ShareButtons";
import TableOfContents from "@/components/TableOfContents";
import {
  ArticleBodyGrid,
  ArticleFigure,
  ArticleHeadStyles,
  DisclosureNote,
  LinkedPodcastsSection,
} from "@/components/article/ArticlePageParts";
import type { SlotReserve } from "@/components/module/ModuleSlot";
import type { ArticleWithFullRelations } from "@/lib/articleApi";
import {
  buildArticleJsonLd,
  deriveTocItems,
  formatDateDE,
  resolveBlockDocument,
  type RelatedCard,
} from "@/lib/articlePage";
import { buildBreadcrumbJsonLd } from "@/lib/jsonLd";
import { buildSpeechChunks, resolveSpeechLang } from "@/lib/listen/speechText";
import {
  ARTICLE_PODCAST_ANCHOR,
  ARTICLE_PODCAST_PLAY_EVENT,
} from "@/lib/podcast/articleAudio";
import type { PodcastWithRecommender } from "@/lib/podcastApi";
import { slugifyTag } from "@/lib/tagSlug";

// Ansicht eines redaktionellen Artikels. Ohne Datenzugriff und ohne
// Server-Importe: Die publizierte Seite (/artikel/<slug>) rendert sie auf dem
// Server, die Vorschau (/vorschau/artikel/…) im Browser mit denselben Daten.
// Was die Seite braucht (Podcasts, weitere Artikel, Anzeigen-Reservierung),
// laedt die Route und reicht es herein. Gegenstueck fuer
// Unternehmensbeitraege: ShowcaseArticleView.

export type ArticleViewPreview = {
  // Datum der Autorzeile, vom Server formatiert (kein Sprung beim Hydrieren).
  dateLabel?: string;
  // Steht nach dem Text und vor «Mehr von diesem Autor» (Rueckmeldung).
  afterBody?: ReactNode;
};

type Props = {
  article: ArticleWithFullRelations;
  baseUrl: string;
  linkedPodcasts: PodcastWithRecommender[];
  related: RelatedCard[];
  moduleReserve?: SlotReserve;
  // Gesetzt = Vorschau: keine strukturierten Daten, keine Anzeigen.
  preview?: ArticleViewPreview;
};

// category.slug aus der DB (z.B. "ki-business") matched nicht direkt mit dem
// Listing-Pfad (/ki-im-business); kleines Lookup deckt die bekannten
// Kategorien ab. Unbekannter Slug → Crumb ohne URL.
const CATEGORY_ROUTES: Record<string, string> = {
  "ki-business": "/ki-im-business",
  "future-tech": "/future-tech",
  "swiss-ai": "/swiss-ai",
};

export default function ArticleView({ article, baseUrl, linkedPodcasts, related, moduleReserve, preview }: Props) {
  const author = article.author!;
  const isExternal = author.role === "external";
  const subcategory = article.subcategory ?? article.category?.name_de ?? "";
  const dateLabel = preview?.dateLabel ?? formatDateDE(article.published_at);
  // ShareButtons brauchen die absolute URL — sonst landet beim Copy auf
  // einem Preview-Deploy die Hash-Vercel-URL im Zwischenspeicher.
  const url = `${baseUrl}/artikel/${article.slug}`;
  const doc = resolveBlockDocument(article);
  // "Anhoeren" liest den ganzen Artikel: Titel -> Abstract -> Body-Bloecke.
  const speechChunks = buildSpeechChunks({ title: article.title, excerpt: article.excerpt, doc });
  const speechLang = resolveSpeechLang(article.locale);
  // SEO N2: <html lang> ist im Root-Layout "de". Englische Artikel markieren
  // ihren Inhalt am <article> und setzen das Dokument-lang im Client nach.
  const htmlLang = article.locale === "en" ? "en" : "de";
  const authorHandle = author.handle ?? author.slug;

  // Existiert ein self-hosted Podcast zum Beitrag, spielt der ANHOEREN-Button
  // diesen ab (statt TTS) und die TOC bekommt einen "Play Podcast"-Eintrag.
  const hasPlayablePodcast = linkedPodcasts.some((p) => p.source_type === "self_hosted" && !!p.audio_url);
  const baseToc = deriveTocItems(doc.blocks);
  const tocItems = hasPlayablePodcast
    ? [{ id: ARTICLE_PODCAST_ANCHOR, label: "Play Podcast" }, ...baseToc]
    : baseToc;

  // Breadcrumb-Schema folgt der SEO-Hierarchie (Hauptkategorie, nicht die
  // sichtbare Subcategory — letztere hat keine eigene Route). Letzter Eintrag
  // ohne URL = aktuelle Page.
  const categoryName = article.category?.name_de;
  const categorySlug = article.category?.slug;
  const categoryRoute = categorySlug ? CATEGORY_ROUTES[categorySlug] : undefined;

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      {!preview && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildArticleJsonLd(article, baseUrl) }} />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: buildBreadcrumbJsonLd([
                { name: "Home", url: `${baseUrl}/` },
                ...(categoryName
                  ? [categoryRoute ? { name: categoryName, url: `${baseUrl}${categoryRoute}` } : { name: categoryName }]
                  : []),
                { name: article.title },
              ]),
            }}
          />
        </>
      )}
      <ReadingProgress />
      {/* Lesestatistik: nur auf der publizierten Seite, nie in der Vorschau. */}
      {!preview && <ReadingMeter articleId={article.id} readingMinutes={article.reading_minutes} />}

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
            <BlockReader
              doc={doc}
              articleSlug={article.slug}
              ressortSlug={categorySlug}
              moduleReserve={moduleReserve}
              locale={article.locale}
              ads={preview ? false : undefined}
            />
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

      {preview?.afterBody}

      {related.length > 0 && (
        <ArticleSection title="Mehr von diesem Autor" href={`/autor/${authorHandle}`} articles={related} />
      )}

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}

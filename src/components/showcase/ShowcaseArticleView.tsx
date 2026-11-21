import Link from "next/link";
import type { ReactNode } from "react";

import ArticleBody from "@/components/ArticleBody";
import {
  ArticleBodyGrid,
  ArticleFigure,
  ArticleHeadStyles,
  DisclosureNote,
  LinkedPodcastsSection,
} from "@/components/article/ArticlePageParts";
import type { ListArticle } from "@/components/ArticleListRow";
import BlockReader from "@/components/BlockReader";
import Footer from "@/components/Footer";
import HtmlLang from "@/components/HtmlLang";
import InlineText from "@/components/InlineText";
import ListenButton from "@/components/ListenButton";
import ReadingProgress from "@/components/ReadingProgress";
import ReadingMeter from "@/components/article/ReadingMeter";
import WebsiteClickSignal from "@/components/showcase/WebsiteClickSignal";
import { companyHost } from "@/lib/showcase/kit";
import ShareButtons from "@/components/ShareButtons";
import TableOfContents from "@/components/TableOfContents";
import {
  CompanyAbout,
  CompanyMasthead,
  CompanySide,
  ShowcaseBand,
  ShowcaseRows,
  ShowcaseStyles,
} from "@/components/showcase/ShowcaseParts";
import {
  buildArticleJsonLd,
  deriveTocItems,
  formatDateDE,
  resolveBlockDocument,
} from "@/lib/articlePage";
import { SHOWCASE_PATH, contentTypeLabel } from "@/lib/contentType";
import { buildBreadcrumbJsonLd } from "@/lib/jsonLd";
import { buildSpeechChunks, resolveSpeechLang } from "@/lib/listen/speechText";
import {
  ARTICLE_PODCAST_ANCHOR,
  ARTICLE_PODCAST_PLAY_EVENT,
} from "@/lib/podcast/articleAudio";
import type { PodcastWithRecommender } from "@/lib/podcastApi";
import type { ShowcaseArticle } from "@/lib/showcaseApi";
import { slugifyTag } from "@/lib/tagSlug";

// Ansicht eines Unternehmensbeitrags (Showcase, S2b). Entscheid Ali
// 15.11.2026: Variante B «Bühne», ohne KI-Schablonen-Look. Aufbau von oben:
// feste Zeile mit der Kennzeichnung, Rubrik «Showcase / Branche», Kopfzeile
// des Absenders zwischen zwei Linien, Titel, links Abstract und Autorzeile,
// rechts das Bild (kleiner als im redaktionellen Artikel: der Text fuehrt).
// Neben dem Text bleibt der Absender ueber dem Inhaltsverzeichnis stehen, am
// Ende steht «Über das Unternehmen» anstelle der Autorenbox. Externe Links
// tragen rel="sponsored", Anzeigen gibt es hier keine.
//
// Ohne Datenzugriff und ohne Server-Importe (wie ArticleView): Die Route laedt
// Podcasts und weitere Beitraege, die Vorschau rendert dieselbe Ansicht im
// Browser.

type Props = {
  article: ShowcaseArticle;
  // «Weitere Beiträge»: von der Seite geladen (desselben Unternehmens, sonst
  // andere aus dem Showcase).
  moreHeading: string;
  moreRows: ListArticle[];
  baseUrl: string;
  linkedPodcasts: PodcastWithRecommender[];
  // Gesetzt = Vorschau: keine strukturierten Daten. dateLabel kommt vom
  // Server, afterBody steht nach dem Text (Rueckmeldung).
  preview?: { dateLabel?: string; afterBody?: ReactNode };
};

export default function ShowcaseArticleView({ article, moreHeading, moreRows, baseUrl, linkedPodcasts, preview }: Props) {
  const author = article.author!;
  const company = article.startup;
  const label = contentTypeLabel(article) ?? "Unternehmensbeitrag";
  const dateLabel = preview?.dateLabel ?? formatDateDE(article.published_at);
  const websiteHost = companyHost(article.startup.website);
  const path = `${SHOWCASE_PATH}/${article.slug}`;
  const url = `${baseUrl}${path}`;
  const doc = resolveBlockDocument(article);
  const speechChunks = buildSpeechChunks({ title: article.title, excerpt: article.excerpt, doc });
  const speechLang = resolveSpeechLang(article.locale);
  const htmlLang = article.locale === "en" ? "en" : "de";
  const authorHandle = author.handle ?? author.slug;

  const hasPlayablePodcast = linkedPodcasts.some((p) => p.source_type === "self_hosted" && !!p.audio_url);
  const baseToc = deriveTocItems(doc.blocks);
  const tocItems = hasPlayablePodcast ? [{ id: ARTICLE_PODCAST_ANCHOR, label: "Play Podcast" }, ...baseToc] : baseToc;

  const jsonLd = preview
    ? null
    : buildArticleJsonLd(article, baseUrl, path, {
        name: company.name,
        profileUrl: `${baseUrl}/swiss-ai/${company.slug}`,
        website: company.website,
        paid: article.is_paid === true,
      });
  const breadcrumbJsonLd = preview
    ? null
    : buildBreadcrumbJsonLd([
        { name: "Home", url: `${baseUrl}/` },
        { name: "Showcase", url: `${baseUrl}${SHOWCASE_PATH}` },
        { name: article.title },
      ]);

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />}
      {breadcrumbJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />}
      <ReadingProgress />
      {/* Lesestatistik: nur auf der publizierten Seite, nie in der Vorschau. */}
      {!preview && <ReadingMeter articleId={article.id} readingMinutes={article.reading_minutes} />}
      {!preview && websiteHost && <WebsiteClickSignal host={websiteHost} />}
      <ArticleHeadStyles />
      <ShowcaseStyles />

      <ShowcaseBand company={company} label={label} />

      <header className="sc-head">
        <nav aria-label="Breadcrumb" className="ah-kicker">
          <Link href={SHOWCASE_PATH} className="ah-kicker__rubric">Showcase</Link>
          {company.industry && (
            <>
              <span className="ah-kicker__sep" aria-hidden>/</span>
              <span className="ah-kicker__sub">{company.industry}</span>
            </>
          )}
        </nav>

        <CompanyMasthead company={company} />

        <h1 className="ah-title">{article.title}</h1>

        <div className="sc-lead">
          <div className="sc-lead__text">
            {article.excerpt && (
              <p className="sc-dek">
                <InlineText content={article.excerpt} sources={doc.sources} linkRel="sponsored" />
              </p>
            )}
            <div className="sc-byline">
              <div>
                <Link href={`/autor/${authorHandle}`} className="ah-author__name">{author.display_name}</Link>
                <p className="ah-author__meta">{dateLabel} · {article.reading_minutes ?? 0} min Lesezeit</p>
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

      <ArticleBodyGrid hasToc>
        <article lang={htmlLang}>
          <DisclosureNote note={article.disclosure_note} />
          <ArticleBody>
            {/* Kein articleSlug-Slot, keine Anzeigen: ads={false}. */}
            <BlockReader doc={doc} locale={article.locale} linkRel="sponsored" ads={false} />
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

          <CompanyAbout company={company} />
        </article>

        <aside style={{ position: "sticky", top: "calc(var(--nav-h) + var(--ticker-h) + 40px + 24px)", alignSelf: "start" }}>
          <CompanySide company={company} />
          {tocItems.length > 0 && <TableOfContents items={tocItems} />}
        </aside>
      </ArticleBodyGrid>

      {preview?.afterBody}

      {moreRows.length > 0 && (
        <div className="sc-more">
          <ShowcaseRows heading={moreHeading} rows={moreRows} moreHref={SHOWCASE_PATH} />
        </div>
      )}

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}

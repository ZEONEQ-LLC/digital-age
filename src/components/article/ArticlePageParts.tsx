import Image from "next/image";
import Link from "next/link";

import ArticleCoverVideo from "@/components/ArticleCoverVideo";
import ArticlePodcastBar from "@/components/ArticlePodcastBar";
import ListenLinks, { type ListenLinksMap } from "@/components/ListenLinks";
import type { ArticleWithFullRelations } from "@/lib/articleApi";
import { getCoverUrl } from "@/lib/coverImage";
import { DISCLOSURE_LABEL } from "@/lib/disclosure";
import {
  ARTICLE_PODCAST_ANCHOR,
  ARTICLE_PODCAST_PLAY_EVENT,
} from "@/lib/podcast/articleAudio";
import type { PodcastWithRecommender } from "@/lib/podcastApi";

// Bausteine der Beitragsseiten. /artikel/<slug> (redaktionell) und
// /showcase/<slug> (Unternehmensbeitrag, seit S2b) setzen ihren Kopf selbst
// zusammen und teilen sich Bild, Podcast-Leiste, Raster und Stile. Bis S2b
// lagen diese Teile in src/app/artikel/[slug]/page.tsx.

// Beitragsbild mit optionaler Hero-Animation und Bildunterschrift.
export function ArticleFigure({
  article,
}: {
  article: Pick<
    ArticleWithFullRelations,
    "title" | "cover_image_url" | "cover_image_alt" | "cover_image_caption" | "cover_image_source" | "cover_video_url"
  >;
}) {
  return (
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
  );
}

// Interessenbindung (articles.disclosure_note): steht ueber dem Text, wenn
// Autor:in oder Herausgeber eigene Interessen am Thema haben. Ruhig gesetzt,
// aber vor dem ersten Absatz, damit man sie vor dem Lesen sieht.
export function DisclosureNote({ note }: { note: string | null | undefined }) {
  const text = note?.trim();
  if (!text) return null;
  return (
    <p className="art-disclosure" role="note">
      <strong>{DISCLOSURE_LABEL}:</strong> {text}
    </p>
  );
}

// Schlanke Podcast-Leiste(n) fuer Podcasts, die auf diesen Beitrag verweisen
// (related_article_slug). Sitzt direkt UNTER dem Hero-Bild, damit der visuelle
// Einstieg (Lead -> Bild) intakt bleibt. Self-hosted -> einzeilige Play-Leiste
// (ArticlePodcastBar), extern -> Titel + Plattform-Links. Der Anchor
// (ARTICLE_PODCAST_ANCHOR) ist Ziel des ANHOEREN-Buttons + TOC-Eintrags; der
// erste self-hosted Player bekommt das Play-Event.
export function LinkedPodcastsSection({ podcasts }: { podcasts: PodcastWithRecommender[] }) {
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

export function ArticleBodyGrid({ children, hasToc }: { children: React.ReactNode; hasToc: boolean }) {
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
        .art-disclosure {
          margin: 0 0 var(--sp-8); padding: 2px 0 2px 16px; border-left: 2px solid var(--da-orange);
          color: var(--da-text-strong); font-size: 15px; line-height: 1.6;
        }
        .art-disclosure strong { color: var(--da-text); font-weight: 600; }
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
export function ArticleHeadStyles() {
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

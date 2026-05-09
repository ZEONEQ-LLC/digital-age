"use client";

import Image from "next/image";
import Link from "next/link";
import ListenLinks from "./ListenLinks";
import { getArticleTitleBySlug } from "@/lib/articleSlugRegistry";
import { PODCAST_LANGUAGES, type Podcast } from "@/types/podcast";
import { getAuthor } from "@/lib/mockAuthorApi";

type PodcastCardProps = {
  podcast: Podcast;
};

function formatDateDE(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function PodcastCard({ podcast }: PodcastCardProps) {
  const langShort = PODCAST_LANGUAGES.find((l) => l.code === podcast.language)?.short ?? podcast.language.toUpperCase();
  const langLabel = PODCAST_LANGUAGES.find((l) => l.code === podcast.language)?.label ?? podcast.language;
  const author = getAuthor(podcast.recommendedByAuthorId);
  const articleTitle = podcast.relatedArticleSlug ? getArticleTitleBySlug(podcast.relatedArticleSlug) : null;

  return (
    <>
      <style>{`
        .pdc {
          display: grid; grid-template-columns: 120px 1fr;
          gap: 20px; padding: 18px;
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: var(--r-lg);
          transition: border-color var(--t-fast);
        }
        .pdc:hover { border-color: var(--da-green); }
        .pdc__cover {
          position: relative;
          width: 120px; height: 120px;
          border-radius: var(--r-md);
          overflow: hidden;
          flex-shrink: 0;
        }
        .pdc__head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: var(--sp-3); margin-bottom: 8px;
        }
        .pdc__cat {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
        }
        .pdc__lang {
          font-family: var(--da-font-mono);
          font-size: 9px; font-weight: 700;
          letter-spacing: 0.12em;
          padding: 3px 7px;
          border: 1px solid var(--da-faint);
          color: var(--da-muted);
          border-radius: 3px;
          flex-shrink: 0;
          line-height: 1;
        }
        .pdc__title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 18px; font-weight: 700; line-height: 1.3;
          margin-bottom: 8px;
        }
        .pdc__desc {
          color: var(--da-text-strong);
          font-size: 14px; line-height: 1.55;
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .pdc__listen { margin-bottom: 12px; }
        .pdc__foot {
          display: flex; align-items: center; gap: 12px;
          font-size: 12px; flex-wrap: wrap;
          padding-top: 10px;
          border-top: 1px solid var(--da-border);
        }
        .pdc__by {
          color: var(--da-muted);
        }
        .pdc__by-name {
          color: var(--da-text-strong); font-weight: 600;
        }
        .pdc__date {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 11px;
        }
        .pdc__note {
          font-style: italic;
          color: var(--da-muted);
          font-size: 12px;
          line-height: 1.5;
          margin-bottom: 10px;
          padding-left: 10px;
          border-left: 2px solid var(--da-border);
        }
        .pdc__related {
          display: inline-flex; align-items: center; gap: 6px;
          color: var(--da-green);
          font-size: 12px; font-weight: 600;
          text-decoration: none;
          margin-left: auto;
        }
        .pdc__related:hover { text-decoration: underline; text-underline-offset: 3px; }
        @media (max-width: 640px) {
          .pdc { grid-template-columns: 1fr; gap: 14px; padding: 14px; }
          .pdc__cover { width: 100%; height: 200px; }
          .pdc__related { margin-left: 0; }
        }
      `}</style>
      <article className="pdc">
        <div className="pdc__cover">
          <Image
            src={podcast.cover}
            alt={podcast.title}
            fill
            sizes="(max-width: 640px) 100vw, 120px"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="pdc__head">
            <span className="pdc__cat">{podcast.category}</span>
            <span className="pdc__lang" title={langLabel} aria-label={`Sprache: ${langLabel}`}>
              {langShort}
            </span>
          </div>
          <h3 className="pdc__title">{podcast.title}</h3>
          <p className="pdc__desc">{podcast.description}</p>
          {podcast.recommendedByNote && (
            <p className="pdc__note">&bdquo;{podcast.recommendedByNote}&ldquo;</p>
          )}
          <div className="pdc__listen">
            <ListenLinks links={podcast.listenLinks} size="sm" />
          </div>
          <div className="pdc__foot">
            <span className="pdc__by">
              Empfohlen von <span className="pdc__by-name">{author?.name ?? "Unbekannt"}</span>
            </span>
            <span style={{ color: "var(--da-faint)" }}>·</span>
            <span className="pdc__date">{formatDateDE(podcast.publishedAt)}</span>
            {articleTitle && podcast.relatedArticleSlug && (
              <Link href={`/artikel/${podcast.relatedArticleSlug}`} className="pdc__related">
                → Zum Artikel: {articleTitle}
              </Link>
            )}
          </div>
        </div>
      </article>
    </>
  );
}

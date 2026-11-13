import Image from "next/image";
import Link from "next/link";
import ExternalBadge from "@/components/ExternalBadge";
import type { ArticleWithRelations } from "@/lib/articleApi";
import { getCoverUrl } from "@/lib/coverImage";
import { plainExcerpt } from "@/lib/excerpt";

// Aufmacher der Startseite: grosses Bild, Rubrik, Titel, Abstract, Autor.
export function articleMeta(a: ArticleWithRelations): string {
  const date = a.published_at
    ? new Date(a.published_at).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" })
    : "";
  const read = a.reading_minutes ? `${a.reading_minutes} min` : "";
  return [date, read].filter(Boolean).join(" · ");
}

export function categoryLabel(a: ArticleWithRelations): string {
  return a.subcategory ?? a.category?.name_de ?? "";
}

export function accentFor(a: ArticleWithRelations): string {
  return a.category?.slug === "future-tech" ? "var(--da-purple)" : "var(--da-green)";
}

export default function LeadStory({ article }: { article: ArticleWithRelations }) {
  const href = `/artikel/${article.slug}`;
  return (
    <article className="ls">
      <style>{`
        .ls { min-width: 0; }
        .ls__img { position: relative; display: block; aspect-ratio: 16 / 9; border-radius: 8px; overflow: hidden; background: var(--da-card); }
        .ls__img img { object-fit: cover; transition: transform 0.4s ease; }
        .ls__img:hover img { transform: scale(1.02); }
        .ls__body { padding-top: 22px; }
        .ls__cat { font-family: var(--da-font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin: 0 0 10px; }
        .ls__title { font-family: var(--da-font-display); font-size: clamp(28px, 3.2vw, 40px); font-weight: 700; line-height: 1.12; letter-spacing: -0.02em; margin: 0 0 14px; }
        .ls__title a { color: var(--da-text); text-decoration: none; }
        .ls__title a:hover { color: var(--da-green); }
        .ls__abstract { color: var(--da-muted); font-size: 17px; line-height: 1.6; margin: 0 0 14px; max-width: 680px;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .ls__meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; color: var(--da-muted-soft); font-family: var(--da-font-mono); font-size: 12px; }
        .ls__author { color: var(--da-text-strong); font-family: var(--da-font-body); font-size: 14px; font-weight: 600; }
        @media (max-width: 640px) {
          .ls__body { padding-top: 16px; }
          .ls__abstract { font-size: 16px; }
        }
      `}</style>
      <Link href={href} className="ls__img" aria-hidden tabIndex={-1}>
        <Image src={getCoverUrl(article)} alt="" fill priority sizes="(max-width: 1024px) 100vw, 760px" unoptimized />
      </Link>
      <div className="ls__body">
        <p className="ls__cat" style={{ color: accentFor(article) }}>{categoryLabel(article)}</p>
        <h2 className="ls__title"><Link href={href}>{article.title}</Link></h2>
        {article.excerpt && <p className="ls__abstract">{plainExcerpt(article.excerpt)}</p>}
        <div className="ls__meta">
          <span className="ls__author">{article.author?.display_name}</span>
          {article.author?.role === "external" && <ExternalBadge size="xs" />}
          <span>·</span>
          <span>{articleMeta(article)}</span>
        </div>
      </div>
    </article>
  );
}

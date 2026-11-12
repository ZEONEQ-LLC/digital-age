import Image from "next/image";
import Link from "next/link";
import type { ArticleWithRelations } from "@/lib/articleApi";
import { getCoverUrl } from "@/lib/coverImage";
import { accentFor, articleMeta, categoryLabel, plainExcerpt } from "./LeadStory";

// Rubrik auf der Startseite: ein grosser Beitrag links, drei kompakte rechts.
// Abwechslung statt dreier gleicher Karten pro Rubrik.
export default function RubricBlock({ title, href, articles }: { title: string; href: string; articles: ArticleWithRelations[] }) {
  if (articles.length === 0) return null;
  const [main, ...rest] = articles;
  return (
    <section className="rb">
      <style>{`
        .rb { max-width: var(--max-content); margin: 0 auto; padding: 64px var(--gutter) 0; }
        .rb__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--da-border); padding-bottom: 16px; margin-bottom: 28px; }
        .rb__h { color: var(--da-text); font-size: 24px; font-weight: 700; margin: 0; }
        .rb__more { color: var(--da-green); font-size: 13px; font-weight: 600; text-decoration: none; letter-spacing: 0.05em; }
        .rb__grid { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 36px; align-items: start; }
        .rb__img { position: relative; display: block; aspect-ratio: 16 / 9; border-radius: 8px; overflow: hidden; background: var(--da-card); }
        .rb__img img { object-fit: cover; }
        .rb__cat { font-family: var(--da-font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 16px 0 8px; }
        .rb__title { font-family: var(--da-font-display); font-size: 24px; font-weight: 700; line-height: 1.2; letter-spacing: -0.01em; margin: 0 0 10px; }
        .rb__title a, .rb__ititle a { color: var(--da-text); text-decoration: none; }
        .rb__title a:hover, .rb__ititle a:hover { color: var(--da-green); }
        .rb__abstract { color: var(--da-muted); font-size: 15px; line-height: 1.6; margin: 0 0 10px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .rb__meta { color: var(--da-muted-soft); font-family: var(--da-font-mono); font-size: 12px; }
        .rb__meta b { color: var(--da-text-strong); font-family: var(--da-font-body); font-weight: 600; font-size: 13px; }
        .rb__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
        .rb__item { display: grid; grid-template-columns: 132px minmax(0, 1fr); gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--da-border); }
        .rb__item:first-child { padding-top: 0; }
        .rb__thumb { position: relative; display: block; aspect-ratio: 3 / 2; border-radius: 6px; overflow: hidden; background: var(--da-card); }
        .rb__thumb img { object-fit: cover; }
        .rb__icat { font-family: var(--da-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 6px; }
        .rb__ititle { font-size: 16px; font-weight: 600; line-height: 1.35; margin: 0 0 6px;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        @media (max-width: 900px) {
          .rb__grid { grid-template-columns: 1fr; gap: 24px; }
        }
        @media (max-width: 640px) {
          .rb { padding-top: 40px; }
          .rb__item { grid-template-columns: 96px minmax(0, 1fr); gap: 14px; }
          .rb__title { font-size: 21px; }
        }
      `}</style>
      <div className="rb__head">
        <h2 className="rb__h">{title}</h2>
        <Link href={href} className="rb__more">mehr →</Link>
      </div>
      <div className="rb__grid">
        <article>
          <Link href={`/artikel/${main.slug}`} className="rb__img" aria-hidden tabIndex={-1}>
            <Image src={getCoverUrl(main)} alt="" fill sizes="(max-width: 900px) 100vw, 660px" unoptimized />
          </Link>
          <p className="rb__cat" style={{ color: accentFor(main) }}>{categoryLabel(main)}</p>
          <h3 className="rb__title"><Link href={`/artikel/${main.slug}`}>{main.title}</Link></h3>
          {main.excerpt && <p className="rb__abstract">{plainExcerpt(main.excerpt)}</p>}
          <p className="rb__meta"><b>{main.author?.display_name}</b> · {articleMeta(main)}</p>
        </article>
        <ul className="rb__list">
          {rest.map((a) => (
            <li key={a.id} className="rb__item">
              <Link href={`/artikel/${a.slug}`} className="rb__thumb" aria-hidden tabIndex={-1}>
                <Image src={getCoverUrl(a)} alt="" fill sizes="132px" unoptimized />
              </Link>
              <div>
                <p className="rb__icat" style={{ color: accentFor(a) }}>{categoryLabel(a)}</p>
                <h3 className="rb__ititle"><Link href={`/artikel/${a.slug}`}>{a.title}</Link></h3>
                <p className="rb__meta">{a.author?.display_name} · {articleMeta(a)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

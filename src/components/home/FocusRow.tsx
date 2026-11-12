import Image from "next/image";
import Link from "next/link";
import type { ArticleWithRelations } from "@/lib/articleApi";
import { getCoverUrl } from "@/lib/coverImage";
import { accentFor, articleMeta, categoryLabel } from "./LeadStory";

// «Im Fokus» unter dem Aufmacher: drei Beitraege. Desktop als Karten, auf dem
// Handy als kompakte Liste (Bild links), damit die Seite nicht aus drei
// bildschirmhohen Karten besteht.
export default function FocusRow({ articles }: { articles: ArticleWithRelations[] }) {
  if (articles.length === 0) return null;
  return (
    <section className="fr" aria-labelledby="fr-h">
      <style>{`
        .fr { max-width: var(--max-content); margin: 0 auto; padding: 56px var(--gutter) 0; }
        .fr__head { border-bottom: 1px solid var(--da-border); padding-bottom: 16px; margin-bottom: 24px; }
        .fr__h { color: var(--da-text); font-size: 24px; font-weight: 700; margin: 0; }
        .fr__grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
        .fr__item { display: flex; flex-direction: column; gap: 0; }
        .fr__img { position: relative; display: block; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; background: var(--da-card); }
        .fr__img img { object-fit: cover; transition: transform 0.4s ease; }
        .fr__img:hover img { transform: scale(1.03); }
        .fr__cat { font-family: var(--da-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 14px 0 6px; }
        .fr__title { font-size: 18px; font-weight: 700; line-height: 1.3; margin: 0 0 8px; font-family: var(--da-font-display); letter-spacing: -0.01em; }
        .fr__title a { color: var(--da-text); text-decoration: none; }
        .fr__title a:hover { color: var(--da-green); }
        .fr__meta { color: var(--da-muted-soft); font-family: var(--da-font-mono); font-size: 12px; margin: 0; }
        @media (max-width: 900px) {
          .fr__grid { grid-template-columns: 1fr; gap: 0; }
          .fr__item { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--da-border); }
          .fr__item:first-child { padding-top: 0; }
          .fr__img { aspect-ratio: 3 / 2; }
          .fr__cat { margin-top: 0; }
          .fr__title { font-size: 16px; }
        }
        @media (max-width: 640px) {
          .fr { padding-top: 40px; }
          .fr__item { grid-template-columns: 96px minmax(0, 1fr); }
        }
      `}</style>
      <div className="fr__head"><h2 className="fr__h" id="fr-h">Im Fokus</h2></div>
      <ul className="fr__grid">
        {articles.map((a) => (
          <li key={a.id} className="fr__item">
            <Link href={`/artikel/${a.slug}`} className="fr__img" aria-hidden tabIndex={-1}>
              <Image src={getCoverUrl(a)} alt="" fill sizes="(max-width: 900px) 112px, 380px" unoptimized />
            </Link>
            <div>
              <p className="fr__cat" style={{ color: accentFor(a) }}>{categoryLabel(a)}</p>
              <h3 className="fr__title"><Link href={`/artikel/${a.slug}`}>{a.title}</Link></h3>
              <p className="fr__meta">{a.author?.display_name} · {articleMeta(a)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

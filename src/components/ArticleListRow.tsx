import Image from "next/image";
import Link from "next/link";
import ExternalBadge from "./ExternalBadge";

export type ListArticle = {
  id: number | string;
  category: string;
  title: string;
  author: string;
  // Author-Slug für client-seitiges Filtern auf Topic-Pages
  // (?author=<slug>). Optional, damit nicht jede Mapper-Quelle nachziehen
  // muss — der Filter ignoriert Rows ohne Slug einfach.
  authorSlug?: string;
  date: string;
  image: string;
  readTime: string;
  href: string;
  external?: boolean;
  // Abstract als Klartext (plainExcerpt), in der Liste zweizeilig.
  excerpt?: string;
};

type ArticleListRowProps = {
  article: ListArticle;
  dotColor: string;
};

export default function ArticleListRow({ article, dotColor }: ArticleListRowProps) {
  return (
    <>
      <style>{`
        .alr { display: block; text-decoration: none; color: inherit; }
        .alr__in {
          display: grid;
          grid-template-columns: 232px minmax(0, 1fr);
          gap: var(--sp-6);
          padding: var(--sp-6) 0;
          border-bottom: 1px solid var(--da-border);
          align-items: start;
        }
        .alr__cover {
          position: relative;
          aspect-ratio: 16 / 9;
          border-radius: var(--r-md);
          overflow: hidden;
          background: var(--da-card);
        }
        .alr__cover img { transition: transform var(--t-base); }
        .alr:hover .alr__cover img { transform: scale(1.03); }
        .alr__body { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
        .alr__head { display: flex; align-items: center; gap: var(--sp-2); flex-wrap: wrap; }
        .alr__cat {
          font-family: var(--da-font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .alr__read { color: var(--da-muted-soft); font-family: var(--da-font-mono); font-size: 11px; }
        .alr__title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 20px;
          font-weight: 700;
          line-height: 1.3;
          letter-spacing: -0.005em;
          margin: 0;
          transition: color var(--t-fast);
        }
        .alr:hover .alr__title { color: var(--da-green); }
        .alr__excerpt {
          color: var(--da-muted);
          font-size: 15px;
          line-height: 1.55;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .alr__meta {
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 12px;
          display: flex;
          gap: var(--sp-2);
          align-items: center;
          flex-wrap: wrap;
        }
        .alr__meta-name { color: var(--da-text-strong); font-family: var(--da-font-body); font-size: 13px; font-weight: 600; }
        @media (max-width: 640px) {
          .alr__in { grid-template-columns: minmax(0, 1fr) 112px; gap: var(--sp-4); padding: var(--sp-5) 0; }
          .alr__cover { order: 2; }
          .alr__title { font-size: 17px; }
          .alr__excerpt { display: none; }
        }
      `}</style>
      <Link href={article.href} className="alr">
        <article className="alr__in">
          <div className="alr__cover">
            <Image
              src={article.image}
              alt=""
              fill
              sizes="(max-width: 640px) 112px, 232px"
              style={{ objectFit: "cover" }}
              unoptimized
            />
          </div>
          <div className="alr__body">
            <div className="alr__head">
              <span className="alr__cat" style={{ color: dotColor }}>{article.category}</span>
              {article.readTime !== "—" && <span className="alr__read">· {article.readTime}</span>}
            </div>
            <h3 className="alr__title">{article.title}</h3>
            {article.excerpt && <p className="alr__excerpt">{article.excerpt}</p>}
            <div className="alr__meta">
              <span className="alr__meta-name">{article.author}</span>
              {article.external && <ExternalBadge size="xs" />}
              <span>·</span>
              <span style={{ whiteSpace: "nowrap" }}>{article.date}</span>
            </div>
          </div>
        </article>
      </Link>
    </>
  );
}

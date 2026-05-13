import Image from "next/image";
import Link from "next/link";
import ExternalBadge from "./ExternalBadge";

export type ListArticle = {
  id: number | string;
  category: string;
  title: string;
  author: string;
  date: string;
  image: string;
  readTime: string;
  href: string;
  external?: boolean;
};

type ArticleListRowProps = {
  article: ListArticle;
  dotColor: string;
};

export default function ArticleListRow({ article, dotColor }: ArticleListRowProps) {
  return (
    <>
      <style>{`
        .alr {
          display: flex;
          gap: var(--sp-5);
          padding: var(--sp-5) 0;
          border-bottom: 1px solid var(--da-border);
          transition: opacity var(--t-base);
        }
        .alr:hover { opacity: 0.75; }
        .alr__bar {
          width: 3px;
          flex-shrink: 0;
          align-self: stretch;
          border-radius: 2px;
        }
        .alr__cover {
          position: relative;
          width: 156px;
          height: 104px;
          flex-shrink: 0;
          border-radius: var(--r-md);
          overflow: hidden;
        }
        .alr__body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 6px;
        }
        .alr__head {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          flex-wrap: wrap;
        }
        .alr__cat {
          font-family: var(--da-font-mono);
          font-size: var(--fs-overline);
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .alr__pill {
          background: var(--da-card);
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: var(--fs-overline);
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
          white-space: nowrap;
        }
        .alr__title {
          color: var(--da-text);
          font-size: var(--fs-lead);
          font-weight: 600;
          line-height: 1.4;
          margin: 0;
        }
        .alr__meta {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: var(--fs-meta);
          display: flex;
          gap: var(--sp-2);
          align-items: center;
          flex-wrap: nowrap;
        }
        .alr__meta-name { color: var(--da-muted); white-space: nowrap; }
        @media (max-width: 640px) {
          .alr { gap: var(--sp-4); }
          .alr__cover { width: 104px; height: 80px; }
          .alr__title { font-size: var(--fs-body); }
        }
      `}</style>
      <Link href={article.href} style={{ textDecoration: "none", display: "block" }}>
        <article className="alr">
          <div className="alr__bar" style={{ background: dotColor }} aria-hidden />
          <div className="alr__cover">
            <Image
              src={article.image}
              alt={article.title}
              fill
              sizes="(max-width: 640px) 104px, 156px"
              style={{ objectFit: "cover" }}
            />
          </div>
          <div className="alr__body">
            <div className="alr__head">
              <span className="alr__cat" style={{ color: dotColor }}>{article.category}</span>
              <span className="alr__pill">{article.readTime}</span>
            </div>
            <h3 className="alr__title">{article.title}</h3>
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

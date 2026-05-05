import Image from "next/image";
import Link from "next/link";

export type BentoArticle = {
  category: string;
  title: string;
  author: string;
  date: string;
  image: string;
  href?: string;
};

type BentoCardProps = {
  article: BentoArticle;
  size?: "lg" | "md" | "sm";
  accent?: "green" | "orange" | "purple";
};

const accentVar = {
  green: "var(--da-green)",
  orange: "var(--da-orange)",
  purple: "var(--da-purple)",
} as const;

export default function BentoCard({ article, size = "sm", accent = "green" }: BentoCardProps) {
  const titleSize = size === "lg" ? "26px" : size === "md" ? "20px" : "16px";

  return (
    <>
      <style>{`
        .bento-card {
          position: relative; display: block;
          width: 100%; height: 100%;
          overflow: hidden; border-radius: var(--r-lg);
          background: var(--da-card);
        }
        .bento-card__img {
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .bento-card:hover .bento-card__img { transform: scale(1.04); }
        .bento-card__overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(28,28,30,0.97) 0%, rgba(28,28,30,0.35) 55%, transparent 100%);
        }
        .bento-card__body {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: var(--sp-6);
        }
        .bento-card__cat {
          color: var(--da-dark);
          font-size: var(--fs-overline); font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          padding: 3px 10px; border-radius: var(--r-xs);
          display: inline-block; margin-bottom: var(--sp-3);
          font-family: var(--da-font-mono);
        }
        .bento-card__title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-weight: 700; line-height: 1.25;
          letter-spacing: -0.01em;
          margin-top: var(--sp-2); margin-bottom: var(--sp-2);
        }
        .bento-card__meta {
          color: rgba(255,255,255,0.5);
          font-size: var(--fs-meta);
          font-family: var(--da-font-mono);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
      `}</style>
      <Link href={article.href ?? "#"} className="bento-card">
        <Image
          src={article.image}
          alt={article.title}
          fill
          sizes={size === "lg" ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
          className="bento-card__img"
        />
        <div className="bento-card__overlay" />
        <div className="bento-card__body">
          <span className="bento-card__cat" style={{ background: accentVar[accent] }}>
            {article.category}
          </span>
          <h3 className="bento-card__title" style={{ fontSize: titleSize }}>
            {article.title}
          </h3>
          <div className="bento-card__meta">
            {article.author} · {article.date}
          </div>
        </div>
      </Link>
    </>
  );
}

import ArticleCard from "./ArticleCard";

type Article = {
  category: string;
  title: string;
  author: string;
  date: string;
  image: string;
  href: string;
  external?: boolean;
};

type ArticleSectionProps = {
  title: string;
  href: string;
  articles: Article[];
  featured?: boolean;
};

export default function ArticleSection({ title, href, articles, featured = false }: ArticleSectionProps) {
  return (
    <>
      <style>{`
        @media (max-width: 1024px) {
          .article-grid-3 { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .article-grid-3 { grid-template-columns: 1fr !important; }
          .article-grid-2 { grid-template-columns: 1fr !important; }
          .section-header { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
          .section-wrapper { padding: 40px 16px 0 !important; }
        }
      `}</style>
      <section className="section-wrapper" style={{ maxWidth: "1200px", margin: "0 auto", padding: "64px 32px 0" }}>
        <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", borderBottom: "1px solid var(--da-border)", paddingBottom: "16px" }}>
          <h2 style={{ color: "var(--da-text)", fontSize: "24px", fontWeight: 700 }}>{title}</h2>
          <a href={href} style={{ color: "var(--da-green)", fontSize: "13px", fontWeight: 600, textDecoration: "none", letterSpacing: "0.05em" }}>
            mehr →
          </a>
        </div>
        <div
          className={featured ? "article-grid-2" : "article-grid-3"}
          style={{ display: "grid", gridTemplateColumns: featured ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: "24px" }}
        >
          {articles.map((article, i) => (
            <ArticleCard key={i} {...article} featured={featured} />
          ))}
        </div>
      </section>
    </>
  );
}

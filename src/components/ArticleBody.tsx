export default function ArticleBody({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .article-body {
          color: #d8d8d8;
          font-size: 18px;
          line-height: 1.85;
          font-weight: 400;
        }
        .article-body p { margin-bottom: 28px; }
        .article-body h2 {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 56px 0 18px;
        }
        .article-body h3 {
          color: var(--da-text);
          font-family: var(--da-font-body);
          font-size: 21px;
          font-weight: 600;
          margin: 40px 0 14px;
        }
        .article-body blockquote {
          border-left: 3px solid var(--da-green);
          background: var(--da-card);
          color: var(--da-text);
          font-size: 21px;
          font-style: italic;
          line-height: 1.6;
          padding: 16px 28px;
          margin: 40px 0;
          border-radius: 0 var(--r-lg) var(--r-lg) 0;
        }
        .article-body ul,
        .article-body ol { margin: -12px 0 20px 28px; padding: 0; }
        .article-body ul { list-style: disc outside; }
        .article-body ol { list-style: decimal outside; }
        .article-body li { margin-bottom: 6px; padding-left: 4px; }
        .article-body strong { color: var(--da-text); font-weight: 600; }
        .article-body code {
          background: var(--da-card);
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-size: 15px;
          padding: 2px 7px;
          border-radius: var(--r-sm);
        }
        .article-body a {
          color: var(--da-green);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
      <div className="article-body">{children}</div>
    </>
  );
}

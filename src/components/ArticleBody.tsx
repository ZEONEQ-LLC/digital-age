export default function ArticleBody({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .article-body { color: #e0e0e0; font-size: 17px; line-height: 1.75; }
        .article-body p { margin-bottom: 24px; }
        .article-body h2 { color: #ffffff; font-size: 28px; font-weight: 600; margin: 48px 0 16px; font-family: Inter, sans-serif; }
        .article-body h3 { color: #ffffff; font-size: 22px; font-weight: 600; margin: 32px 0 12px; font-family: Inter, sans-serif; }
        .article-body blockquote { border-left: 4px solid #32ff7e; padding: 8px 24px; margin: 32px 0; color: #ffffff; font-size: 20px; font-style: italic; background-color: #2a2a2e; border-radius: 0 8px 8px 0; }
        .article-body ul, .article-body ol { margin: 0 0 24px 24px; padding: 0; }
        .article-body li { margin-bottom: 8px; }
        .article-body a { color: #32ff7e; text-decoration: underline; }
        .article-body strong { color: #ffffff; font-weight: 600; }
        .article-body code { background-color: #2a2a2e; padding: 2px 6px; border-radius: 4px; font-family: "Roboto Mono", monospace; font-size: 15px; color: #32ff7e; }
      `}</style>
      <div className="article-body">{children}</div>
    </>
  );
}

export default function ArticleBody({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .article-body { color: var(--da-text-strong); font-size: 17px; line-height: 1.75; }
        .article-body p { margin-bottom: 24px; }
        .article-body h2 { color: var(--da-text); font-size: 28px; font-weight: 600; margin: 48px 0 16px; font-family: Inter, sans-serif; }
        .article-body h3 { color: var(--da-text); font-size: 22px; font-weight: 600; margin: 32px 0 12px; font-family: Inter, sans-serif; }
        .article-body blockquote { border-left: 4px solid var(--da-green); padding: 8px 24px; margin: 32px 0; color: var(--da-text); font-size: 20px; font-style: italic; background-color: var(--da-card); border-radius: 0 8px 8px 0; }
        .article-body ul, .article-body ol { margin: 0 0 24px 24px; padding: 0; }
        .article-body li { margin-bottom: 8px; }
        .article-body a { color: var(--da-green); text-decoration: underline; }
        .article-body strong { color: var(--da-text); font-weight: 600; }
        .article-body code { background-color: var(--da-card); padding: 2px 6px; border-radius: 4px; font-family: "Roboto Mono", monospace; font-size: 15px; color: var(--da-green); }
      `}</style>
      <div className="article-body">{children}</div>
    </>
  );
}

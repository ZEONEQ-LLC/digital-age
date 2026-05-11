import Link from "next/link";
import PageTitle from "@/components/author/PageTitle";
import MyArticlesList from "@/components/author/MyArticlesList";
import { getMyArticles } from "@/lib/authorApi";

export default async function MyArticlesPage() {
  const articles = await getMyArticles();
  return (
    <>
      <PageTitle
        title="Meine Artikel"
        subtitle={`${articles.length} Artikel insgesamt`}
        right={
          <Link
            href="/autor/artikel/neu"
            style={{
              background: "var(--da-green)",
              color: "var(--da-dark)",
              padding: "11px 18px",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            + Neuer Artikel
          </Link>
        }
      />
      <MyArticlesList articles={articles} />
    </>
  );
}

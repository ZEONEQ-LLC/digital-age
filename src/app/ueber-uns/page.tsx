import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleBody from "@/components/ArticleBody";
import BlockReader from "@/components/BlockReader";
import Footer from "@/components/Footer";
import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import { getPublishedPageBySlug } from "@/lib/pagesApi";
import type { BlockDocument } from "@/types/blocks";

const SLUG = "ueber-uns";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPageBySlug(SLUG);
  if (!page) return {};
  return {
    title: page.title,
    description: page.meta_description ?? undefined,
    robots: page.noindex ? { index: false, follow: true } : undefined,
  };
}

export default async function Page() {
  const page = await getPublishedPageBySlug(SLUG);
  if (!page) notFound();

  const doc = page.body_blocks as unknown as BlockDocument;

  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero
        category={page.hero_category ?? undefined}
        title={page.title}
        description={page.lead ?? undefined}
      />
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "48px 32px 96px" }}>
        <ArticleBody>
          <BlockReader doc={doc} />
        </ArticleBody>
      </section>
      <Footer />
    </main>
  );
}

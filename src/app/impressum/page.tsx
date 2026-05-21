import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import NewsTicker from "@/components/NewsTicker";
import PageContent from "@/components/PageContent";
import { getPublishedPageBySlug } from "@/lib/pagesApi";
import type { BlockDocument } from "@/types/blocks";

const SLUG = "impressum";

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
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <PageContent title={page.title} lead={page.lead} doc={doc} />
      <Footer />
    </main>
  );
}

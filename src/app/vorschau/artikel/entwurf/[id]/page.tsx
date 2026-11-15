import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ArticlePreview from "@/components/article/ArticlePreview";
import { DraftPreviewBar } from "@/components/article/PreviewNotices";
import { getPreviewForUser, loadPreviewData } from "@/lib/articles/previewApi";
import { getBaseUrl } from "@/lib/siteUrl";

// Vorschau des gespeicherten Stands fuer eingeloggte Autor:innen: dieselbe
// Ansicht wie die publizierte Seite. Der Tab «Vorschau» im Editor bettet diese
// Seite ein (?embed=1) und schickt ihr den ungespeicherten Stand
// (ArticlePreview, live). RLS entscheidet, wer welchen Beitrag sieht.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vorschau · digital age",
  robots: { index: false, follow: false, nocache: true },
};

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ embed?: string }> };

export default async function DraftPreviewPage({ params, searchParams }: PageProps) {
  const [{ id }, { embed }] = await Promise.all([params, searchParams]);
  const article = await getPreviewForUser(id);
  if (!article || !article.author) notFound();
  const data = await loadPreviewData(article);
  const embedded = embed === "1";
  return (
    <ArticlePreview data={data} baseUrl={getBaseUrl()} live={embedded}>
      {!embedded && <DraftPreviewBar articleId={article.id} />}
    </ArticlePreview>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import ArticlePreview from "@/components/article/ArticlePreview";
import { PreviewExpired } from "@/components/article/PreviewNotices";
import PreviewResponse from "@/components/article/PreviewResponse";
import {
  PREVIEW_TOKEN_RE,
  canRespondToPreview,
  formatDayCH,
  previewDecisionStatus,
  previewFingerprint,
} from "@/lib/articles/preview";
import { getPreviewByToken, loadPreviewData } from "@/lib/articles/previewApi";
import { articlePath } from "@/lib/contentType";
import { getCoverUrl } from "@/lib/coverImage";
import { getBaseUrl } from "@/lib/siteUrl";

// Vorschau eines Beitrags ueber den Link der Redaktion: zeigt ihn so, wie er
// erscheinen wird (dieselbe Ansicht wie /artikel/<slug> bzw. /showcase/<slug>),
// und nimmt am Ende die Rueckmeldung entgegen. Nur ueber den Token erreichbar,
// nie indexiert, ohne Tracking und ohne Anzeigen (siteChrome.ts, robots.ts).
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ token: string }> };

const ROBOTS = { index: false, follow: false, nocache: true };
const load = cache(async (token: string) => getPreviewByToken(token));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const fallback: Metadata = { title: "Vorschau · digital age", robots: ROBOTS };
  if (!PREVIEW_TOKEN_RE.test(token)) return fallback;
  const found = await load(token).catch(() => null);
  if (!found || found.state !== "active" || found.article.status === "archived") return fallback;
  // Titel und Bild fuer die Link-Vorschau in Mail und Messenger: Wer den Link
  // bekommt, erkennt den Beitrag.
  const title = `Vorschau: ${found.article.title}`;
  const cover = getCoverUrl(found.article);
  const image = /^https?:\/\//.test(cover) ? cover : `${getBaseUrl()}${cover}`;
  return {
    title,
    robots: ROBOTS,
    openGraph: { title, description: "Noch nicht veröffentlicht. So wird der Beitrag auf digital age erscheinen.", images: [image] },
  };
}

export default async function ArticlePreviewPage({ params }: PageProps) {
  const { token } = await params;
  if (!PREVIEW_TOKEN_RE.test(token)) notFound();
  const found = await load(token);
  if (!found || found.state === "revoked") notFound();
  if (found.state === "expired") return <PreviewExpired />;
  const { article, link } = found;
  if (article.status === "archived" || !article.author) notFound();

  const data = await loadPreviewData(article);
  const canRespond = canRespondToPreview(article.status);
  return (
    <ArticlePreview data={data} baseUrl={getBaseUrl()}>
      <PreviewResponse
        token={token}
        status={previewDecisionStatus(link, previewFingerprint(article))}
        canRespond={canRespond}
        liveUrl={canRespond ? null : articlePath(article)}
        defaultName={article.author.display_name}
        expiresLabel={formatDayCH(link.expires_at)}
      />
    </ArticlePreview>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";

import ArticleView from "@/components/article/ArticleView";
import ShowcaseArticleView from "@/components/showcase/ShowcaseArticleView";
import {
  PREVIEW_MSG_DRAFT,
  PREVIEW_MSG_READY,
  applyPreviewOverrides,
  formatDayCH,
  isPreviewOverrides,
  type PreviewOverrides,
} from "@/lib/articles/preview";
import type { PreviewData } from "@/lib/articles/previewApi";
import type { ShowcaseArticle } from "@/lib/showcaseApi";

// Beitragsvorschau: dieselbe Ansicht wie die publizierte Seite (ArticleView
// oder ShowcaseArticleView), ohne strukturierte Daten und ohne Anzeigen.
//
// `live` (Tab «Vorschau» im Editor, eingebettet): Die Seite meldet sich beim
// Editor und zeigt den Stand, den er schickt, also auch Ungespeichertes. Links
// sind dann ausgeschaltet, damit die Vorschau beim Beitrag bleibt; Sprungmarken
// des Inhaltsverzeichnisses gehen weiter.
type Props = {
  data: PreviewData;
  baseUrl: string;
  live?: boolean;
  // Steht nach dem Text: Rueckmeldung (Link) oder Hinweis (Entwurf).
  children?: ReactNode;
};

type Draft = { overrides: PreviewOverrides; dateLabel: string };

export default function ArticlePreview({ data, baseUrl, live = false, children }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (!live || window.parent === window) return;
    const origin = window.location.origin;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || e.source !== window.parent) return;
      const msg = e.data as { type?: unknown; overrides?: unknown } | null;
      if (!msg || msg.type !== PREVIEW_MSG_DRAFT) return;
      if (msg.overrides === null) {
        setDraft(null);
        return;
      }
      if (!isPreviewOverrides(msg.overrides)) return;
      const o = msg.overrides;
      // Ohne gesetztes Datum: heute, wie beim ersten Publizieren.
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(o.published_date) ? `${o.published_date}T11:00:00.000Z` : new Date().toISOString();
      setDraft({ overrides: o, dateLabel: formatDayCH(iso) });
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!a || (a.getAttribute("href") ?? "").startsWith("#")) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("message", onMessage);
    document.addEventListener("click", onClick, true);
    window.parent.postMessage({ type: PREVIEW_MSG_READY }, origin);
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", onClick, true);
    };
  }, [live]);

  const article = draft ? applyPreviewOverrides(data.article, draft.overrides) : data.article;
  const preview = { dateLabel: draft?.dateLabel ?? data.dateLabel, afterBody: children };

  if (data.company && article.startup) {
    return (
      <ShowcaseArticleView
        article={article as ShowcaseArticle}
        moreHeading={data.moreHeading}
        moreRows={data.moreRows}
        baseUrl={baseUrl}
        linkedPodcasts={data.linkedPodcasts}
        preview={preview}
      />
    );
  }
  return (
    <ArticleView
      article={article}
      baseUrl={baseUrl}
      linkedPodcasts={data.linkedPodcasts}
      related={data.related}
      preview={preview}
    />
  );
}

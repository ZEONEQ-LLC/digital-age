"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import AuthorStatusBadge from "@/components/author/AuthorStatusBadge";
import BlockEditor from "@/components/author/BlockEditor";
import EditorRevisions from "@/components/author/EditorRevisions";
import EditorSeoPanel, { type SeoState } from "@/components/author/EditorSeoPanel";
import EditorSidebar from "@/components/author/EditorSidebar";
import MarkdownEditor from "@/components/author/MarkdownEditor";
import {
  archiveArticle,
  deleteArticle,
  publishArticle,
  saveArticle,
  submitForReview,
  type ArticlePatch,
} from "@/lib/authorActions";
import type { SuiteArticle, RevisionWithEditor, ArticleStatus } from "@/lib/authorApi";
import { blocksToMarkdown, markdownToBlocks } from "@/lib/markdownBlocks";
import type { Block } from "@/types/blocks";

type Tab = "content" | "seo" | "revisions";
type Mode = "visual" | "markdown";

type Props = {
  article: SuiteArticle;
  revisions: RevisionWithEditor[];
  categories: { id: string; slug: string; name_de: string }[];
  isEditor: boolean;
};

export default function EditorClient({ article, revisions, categories, isEditor }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("content");
  const [mode, setMode] = useState<Mode>("visual");

  const [title, setTitle] = useState(article.title);
  const [excerpt, setExcerpt] = useState(article.excerpt ?? "");
  const [cover, setCover] = useState(article.cover_image_url ?? "");
  const [categoryId, setCategoryId] = useState(article.category_id);
  const [subcategory, setSubcategory] = useState(article.subcategory ?? "");
  const [tagsText, setTagsText] = useState((article.tags ?? []).join(", "));

  const [blocks, setBlocks] = useState<Block[]>(() => markdownToBlocks(article.body_md ?? ""));
  const [markdown, setMarkdown] = useState(article.body_md ?? "");
  const [status, setStatus] = useState<ArticleStatus>(article.status);

  const [seo, setSeo] = useState<SeoState>({
    title: article.seo_title ?? "",
    description: article.seo_description ?? "",
    slug: article.slug,
    keyword: article.seo_keyword ?? "",
  });

  const [savedAt, setSavedAt] = useState<string>("Geladen");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function switchMode(next: Mode) {
    if (next === mode) return;
    if (next === "markdown") {
      setMarkdown(blocksToMarkdown(blocks));
    } else {
      setBlocks(markdownToBlocks(markdown));
    }
    setMode(next);
  }

  const wordCount = useMemo(() => {
    const text = blocks.reduce((acc, b) => {
      if (b.type === "list") return acc + " " + b.items.join(" ");
      if (b.type === "image") return acc + " " + b.alt + " " + (b.caption ?? "");
      if (b.type === "code") return acc + " " + b.content;
      return acc + " " + b.content;
    }, "") + " " + title + " " + excerpt;
    return text.split(/\s+/).filter(Boolean).length;
  }, [blocks, title, excerpt]);

  const readMinutes = Math.max(1, Math.round(wordCount / 200));

  function buildPatch(): ArticlePatch {
    const bodyMd = mode === "visual" ? blocksToMarkdown(blocks) : markdown;
    const cleanTags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const patch: ArticlePatch = {
      title,
      excerpt: excerpt || null,
      cover_image_url: cover || null,
      category_id: categoryId,
      subcategory: subcategory || null,
      body_md: bodyMd,
      tags: cleanTags,
      seo_title: seo.title || null,
      seo_description: seo.description || null,
      seo_keyword: seo.keyword || null,
    };
    if (seo.slug && seo.slug !== article.slug) {
      patch.slug = seo.slug;
    }
    return patch;
  }

  async function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await saveArticle(article.id, buildPatch());
        setStatus(updated.status);
        setSavedAt("Gespeichert");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  async function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await saveArticle(article.id, buildPatch());
        const next = await submitForReview(article.id);
        setStatus(next.status);
        router.push("/autor/artikel");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Einreichen fehlgeschlagen.");
      }
    });
  }

  async function handlePublish() {
    setError(null);
    startTransition(async () => {
      try {
        await saveArticle(article.id, buildPatch());
        const next = await publishArticle(article.id);
        setStatus(next.status);
        setSavedAt("Publiziert");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Publish fehlgeschlagen.");
      }
    });
  }

  async function handleArchive() {
    setError(null);
    startTransition(async () => {
      try {
        const next = await archiveArticle(article.id);
        setStatus(next.status);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Archivieren fehlgeschlagen.");
      }
    });
  }

  async function handleDelete() {
    if (!confirm("Diesen Draft endgültig löschen?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteArticle(article.id);
        router.push("/autor/artikel");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }

  const canSubmit = status === "draft";
  const canPublish = isEditor && (status === "draft" || status === "in_review");
  const canArchive = isEditor && status === "published";
  const canDelete = status === "draft";
  const categoryName = categories.find((c) => c.id === categoryId)?.name_de ?? "—";

  return (
    <>
      <style>{`
        .a-edit-toolbar {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 24px; gap: 16px; flex-wrap: wrap;
        }
        .a-edit-toolbar__btn {
          background: transparent; color: var(--da-text);
          border: 1px solid var(--da-border);
          padding: 9px 16px; border-radius: 4px;
          font-size: 12px; font-weight: 600; cursor: pointer;
          font-family: inherit;
        }
        .a-edit-toolbar__btn--ghost {
          background: transparent; color: var(--da-muted-soft);
          padding: 7px 14px;
        }
        .a-edit-toolbar__btn--primary {
          background: var(--da-green); color: var(--da-dark);
          border: none; padding: 9px 18px;
          font-weight: 700;
        }
        .a-edit-toolbar__btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .a-edit-toolbar__btn--danger {
          background: transparent; color: var(--da-red, #ff5c5c);
          border: 1px solid var(--da-red, #ff5c5c);
        }
        .a-edit-error {
          background: rgba(255,92,92,0.12);
          border: 1px solid var(--da-red, #ff5c5c);
          color: var(--da-red, #ff5c5c);
          padding: 10px 14px; border-radius: 6px;
          font-size: 13px; margin-bottom: 16px;
        }
        .a-edit-tabs {
          display: flex; gap: 0;
          border-bottom: 1px solid var(--da-border);
          margin-bottom: 28px;
        }
        .a-edit-tab {
          background: transparent; color: var(--da-muted-soft);
          border: none; border-bottom: 2px solid transparent;
          padding: 12px 22px; font-size: 13px; font-weight: 600;
          cursor: pointer; margin-bottom: -1px;
          font-family: inherit;
        }
        .a-edit-tab--active { color: var(--da-green); border-bottom-color: var(--da-green); }
        .a-edit-content-grid {
          display: grid; grid-template-columns: 1fr 280px;
          gap: 28px; align-items: start;
        }
        .a-edit-mode-toggle {
          display: inline-flex; background: var(--da-card);
          border: 1px solid var(--da-border); border-radius: 6px; padding: 3px;
        }
        .a-edit-mode-btn {
          background: transparent; color: var(--da-muted-soft);
          border: none; border-radius: 4px;
          padding: 7px 16px; font-size: 12px; font-weight: 700;
          cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
          font-family: inherit;
        }
        .a-edit-mode-btn--active { background: var(--da-green); color: var(--da-dark); }
        .a-edit-cover {
          position: relative; border-radius: 8px; overflow: hidden;
          margin-bottom: 18px; border: 1px solid var(--da-border);
          background: var(--da-card);
          min-height: 120px;
        }
        .a-edit-cover__img {
          width: 100%; aspect-ratio: 16/8; object-fit: cover; display: block;
        }
        .a-edit-cover__input {
          position: absolute; bottom: 14px; right: 14px;
          background: rgba(0,0,0,0.7); color: var(--da-text);
          border: 1px solid var(--da-border);
          padding: 8px 14px; border-radius: 4px;
          font-size: 12px; font-weight: 600;
          font-family: inherit;
          width: clamp(220px, 50%, 360px);
        }
        .a-edit-title-card {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: 8px; padding: 28px; margin-bottom: 18px;
        }
        .a-edit-title-input {
          width: 100%; background: transparent; border: none; outline: none;
          color: var(--da-text); font-size: 32px; font-weight: 700;
          font-family: var(--da-font-display);
          letter-spacing: -0.01em; line-height: 1.1;
          margin-bottom: 14px; padding: 0;
        }
        .a-edit-excerpt {
          width: 100%; background: transparent; border: none; outline: none;
          color: var(--da-muted); font-size: 16px; line-height: 1.6;
          font-style: italic; resize: none; padding: 0;
          font-family: inherit;
        }
        .a-edit-meta-row {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 12px; margin-bottom: 18px;
        }
        .a-edit-meta-input, .a-edit-meta-select {
          width: 100%; background: var(--da-card);
          border: 1px solid var(--da-border); border-radius: 4px;
          color: var(--da-text); padding: 8px 12px;
          font-size: 13px; font-family: inherit;
        }
        .a-edit-meta-label {
          color: var(--da-faint); font-size: 10px; font-weight: 700;
          font-family: var(--da-font-mono); letter-spacing: 0.12em;
          text-transform: uppercase; margin-bottom: 5px;
          display: block;
        }
        .a-edit-body-card {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: 8px; padding: 28px;
        }
        .a-edit-mode-row {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 14px; gap: 12px; flex-wrap: wrap;
        }
        .a-edit-mode-hint {
          color: var(--da-muted-soft); font-size: 11px;
          font-family: var(--da-font-mono);
        }
        @media (max-width: 1280px) {
          .a-edit-content-grid { grid-template-columns: 1fr 260px; gap: 20px; }
        }
        @media (max-width: 1100px) {
          .a-edit-content-grid { grid-template-columns: 1fr; }
          .a-edit-meta-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="a-edit-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Link href="/autor/artikel" className="a-edit-toolbar__btn a-edit-toolbar__btn--ghost">
            ← Zurück
          </Link>
          <AuthorStatusBadge status={status} />
          <span style={{ color: "var(--da-green)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
            ● {pending ? "Speichert…" : savedAt}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canDelete && (
            <button
              type="button"
              className="a-edit-toolbar__btn a-edit-toolbar__btn--danger"
              onClick={handleDelete}
              disabled={pending}
            >
              Löschen
            </button>
          )}
          <button
            type="button"
            className="a-edit-toolbar__btn"
            onClick={handleSave}
            disabled={pending}
          >
            Speichern
          </button>
          {canSubmit && (
            <button
              type="button"
              className="a-edit-toolbar__btn a-edit-toolbar__btn--primary"
              onClick={handleSubmit}
              disabled={pending}
            >
              Zur Review einreichen →
            </button>
          )}
          {canPublish && (
            <button
              type="button"
              className="a-edit-toolbar__btn a-edit-toolbar__btn--primary"
              onClick={handlePublish}
              disabled={pending}
            >
              Publizieren
            </button>
          )}
          {canArchive && (
            <button
              type="button"
              className="a-edit-toolbar__btn"
              onClick={handleArchive}
              disabled={pending}
            >
              Archivieren
            </button>
          )}
        </div>
      </div>

      {error && <div className="a-edit-error">{error}</div>}

      <div className="a-edit-tabs">
        {[
          { id: "content", label: "Inhalt" },
          { id: "seo", label: "SEO & Meta" },
          { id: "revisions", label: "Revisionen" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`a-edit-tab${t.id === tab ? " a-edit-tab--active" : ""}`}
            onClick={() => setTab(t.id as Tab)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "content" && (
        <div className="a-edit-content-grid">
          <div>
            <div className="a-edit-mode-row">
              <div className="a-edit-mode-toggle">
                {([
                  { id: "visual", label: "Visual", icon: "▤" },
                  { id: "markdown", label: "Markdown", icon: "M↓" },
                ] as const).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`a-edit-mode-btn${mode === m.id ? " a-edit-mode-btn--active" : ""}`}
                    onClick={() => switchMode(m.id)}
                  >
                    <span style={{ fontSize: 11, opacity: mode === m.id ? 1 : 0.7 }}>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
              <span className="a-edit-mode-hint">
                {mode === "markdown" ? "Markdown direkt editieren" : "Hover über Blöcke für Aktionen"}
              </span>
            </div>

            <div className="a-edit-cover">
              {cover && (
                <Image
                  src={cover}
                  alt=""
                  width={1600}
                  height={800}
                  className="a-edit-cover__img"
                  unoptimized
                />
              )}
              <input
                type="url"
                className="a-edit-cover__input"
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                placeholder="Cover-URL einfügen"
              />
            </div>

            <div className="a-edit-title-card">
              <input
                className="a-edit-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Artikel-Titel"
              />
              <textarea
                rows={3}
                className="a-edit-excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Abstract / Lead-Paragraph"
              />
            </div>

            <div className="a-edit-meta-row">
              <div>
                <label className="a-edit-meta-label">Kategorie</label>
                <select
                  className="a-edit-meta-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name_de}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="a-edit-meta-label">Subkategorie</label>
                <input
                  className="a-edit-meta-input"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder='z.B. "AI in Banking"'
                />
              </div>
              <div>
                <label className="a-edit-meta-label">Tags (komma-separiert)</label>
                <input
                  className="a-edit-meta-input"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="z.B. KI, KMU, Schweiz"
                />
              </div>
            </div>

            <div className="a-edit-body-card">
              {mode === "visual" ? (
                <BlockEditor blocks={blocks} onChange={setBlocks} />
              ) : (
                <MarkdownEditor value={markdown} onChange={setMarkdown} />
              )}
            </div>
          </div>

          <EditorSidebar
            wordCount={wordCount}
            readMinutes={readMinutes}
            category={categoryName}
            tags={tagsText.split(",").map((t) => t.trim()).filter(Boolean)}
          />
        </div>
      )}

      {tab === "seo" && (
        <div style={{ maxWidth: 720 }}>
          <EditorSeoPanel seo={seo} onChange={setSeo} />
        </div>
      )}

      {tab === "revisions" && (
        <div style={{ maxWidth: 720 }}>
          <EditorRevisions revisions={revisions} />
        </div>
      )}
    </>
  );
}

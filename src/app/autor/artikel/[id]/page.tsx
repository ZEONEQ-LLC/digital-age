"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { use, useEffect, useMemo, useRef, useState } from "react";
import AuthorShell from "@/components/author/AuthorShell";
import AuthorCard from "@/components/author/AuthorCard";
import AuthorStatusBadge from "@/components/author/AuthorStatusBadge";
import BlockEditor from "@/components/author/BlockEditor";
import EditorRevisions from "@/components/author/EditorRevisions";
import EditorSeoPanel, { type SeoState } from "@/components/author/EditorSeoPanel";
import EditorSidebar from "@/components/author/EditorSidebar";
import FeedbackBanner from "@/components/author/FeedbackBanner";
import MarkdownEditor from "@/components/author/MarkdownEditor";
import MobileEditorWarning from "@/components/author/MobileEditorWarning";
import {
  blocksAsMarkdown,
  getArticle,
  getAuthors,
  getRevisions,
  markdownAsBlocks,
  saveDraft,
  submitForReview,
} from "@/lib/mockAuthorApi";
import type { Article, Author, Block } from "@/types/author";

type Tab = "content" | "seo" | "revisions";
type Mode = "visual" | "markdown";

type PageProps = { params: Promise<{ id: string }> };

export default function EditorPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const initial = useMemo<Article | null>(() => getArticle(id), [id]);
  const authorsById = useMemo<Record<string, Author>>(() => {
    const out: Record<string, Author> = {};
    for (const a of getAuthors()) out[a.id] = a;
    return out;
  }, []);
  const initialRevisions = useMemo(() => getRevisions(id), [id]);

  if (!initial) {
    notFound();
  }

  return (
    <AuthorShell>
      <MobileEditorWarning />
      <div className="a-editor-root">
        <EditorClient
          initial={initial as Article}
          authorsById={authorsById}
          revisions={initialRevisions}
          onAfterSubmit={() => router.push("/autor/artikel")}
        />
      </div>
    </AuthorShell>
  );
}

type EditorClientProps = {
  initial: Article;
  authorsById: Record<string, Author>;
  revisions: ReturnType<typeof getRevisions>;
  onAfterSubmit: () => void;
};

function EditorClient({ initial, authorsById, revisions, onAfterSubmit }: EditorClientProps) {
  const [tab, setTab] = useState<Tab>("content");
  const [mode, setMode] = useState<Mode>("visual");
  const [title, setTitle] = useState(initial.title);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [cover, setCover] = useState(initial.cover);
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks);
  const [markdown, setMarkdown] = useState(initial.contentMd);
  const [status, setStatus] = useState(initial.status);
  const [feedback] = useState(initial.feedback);
  const [seo, setSeo] = useState<SeoState>({
    title: initial.seoTitle,
    description: initial.seoDescription,
    slug: initial.slug ?? "",
    keyword: initial.seoKeyword,
  });
  const [autosave, setAutosave] = useState<string>("Geladen");
  const [submitting, setSubmitting] = useState(false);

  // Block <-> markdown sync on mode switch.
  const lastModeRef = useRef<Mode>("visual");
  useEffect(() => {
    if (lastModeRef.current === mode) return;
    if (mode === "markdown") {
      setMarkdown(blocksAsMarkdown(blocks));
    } else {
      setBlocks(markdownAsBlocks(markdown));
    }
    lastModeRef.current = mode;
  }, [mode, blocks, markdown]);

  // Autosave (debounced) — saves blocks/markdown depending on active mode.
  useEffect(() => {
    const t = setTimeout(() => {
      const patch: Partial<Article> = {
        title,
        excerpt,
        cover,
        seoTitle: seo.title,
        seoDescription: seo.description,
        seoKeyword: seo.keyword,
        slug: seo.slug || null,
      };
      if (mode === "visual") patch.blocks = blocks;
      else patch.blocks = markdownAsBlocks(markdown);
      const saved = saveDraft(initial.id, patch);
      if (saved) setAutosave("Gespeichert vor wenigen Sekunden");
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, excerpt, cover, blocks, markdown, seo, mode]);

  const wordCount = useMemo(() => {
    const text = blocks.reduce((acc, b) => {
      if (b.type === "list") return acc + " " + b.items.join(" ");
      if (b.type === "image") return acc + " " + b.alt + " " + (b.caption ?? "");
      if (b.type === "code") return acc + " " + b.content;
      return acc + " " + b.content;
    }, "") + " " + title + " " + excerpt;
    return text.split(/\s+/).filter(Boolean).length;
  }, [blocks, title, excerpt]);

  const readMinutes = Math.max(1, Math.round(wordCount / 220));

  const handleSubmit = () => {
    setSubmitting(true);
    const next = submitForReview(initial.id);
    if (next) setStatus(next.status);
    setTimeout(() => {
      setSubmitting(false);
      onAfterSubmit();
    }, 600);
  };

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
        .a-edit-toolbar__btn--primary:disabled {
          opacity: 0.6; cursor: not-allowed;
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
        .a-edit-seo-grid {
          display: grid; grid-template-columns: 1fr 320px;
          gap: 28px; align-items: start;
        }
        @media (max-width: 1280px) {
          .a-edit-content-grid { grid-template-columns: 1fr 260px; gap: 20px; }
        }
        @media (max-width: 1100px) {
          .a-edit-content-grid, .a-edit-seo-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="a-edit-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Link href="/autor/artikel" className="a-edit-toolbar__btn a-edit-toolbar__btn--ghost">
            ← Zurück
          </Link>
          <AuthorStatusBadge status={status} />
          <span style={{ color: "var(--da-green)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
            ● {autosave}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="a-edit-toolbar__btn"
            disabled
            title="Vorschau kommt mit Supabase"
            style={{ opacity: 0.6, cursor: "not-allowed" }}
          >
            Vorschau
          </button>
          <button
            type="button"
            className="a-edit-toolbar__btn"
            onClick={() => {
              const patch: Partial<Article> = {
                title,
                excerpt,
                cover,
                blocks: mode === "visual" ? blocks : markdownAsBlocks(markdown),
                seoTitle: seo.title,
                seoDescription: seo.description,
                seoKeyword: seo.keyword,
                slug: seo.slug || null,
              };
              saveDraft(initial.id, patch);
              setAutosave("Gespeichert");
            }}
          >
            Als Entwurf speichern
          </button>
          <button
            type="button"
            className="a-edit-toolbar__btn a-edit-toolbar__btn--primary"
            disabled={submitting || status === "in_review"}
            onClick={handleSubmit}
          >
            {submitting ? "Wird eingereicht…" : "Zur Review einreichen →"}
          </button>
        </div>
      </div>

      {status === "changes" && feedback && (
        <FeedbackBanner feedback={feedback} reviewerName="Ali Soy, Editor in Chief · vor 1 Tag" />
      )}

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
                    onClick={() => setMode(m.id)}
                  >
                    <span style={{ fontSize: 11, opacity: mode === m.id ? 1 : 0.7 }}>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
              <span className="a-edit-mode-hint">
                {mode === "markdown" ? "Markdown links, Live-Vorschau rechts" : "Hover über Blöcke für Aktionen"}
              </span>
            </div>

            <div className="a-edit-cover">
              <Image
                src={cover}
                alt=""
                width={1600}
                height={800}
                className="a-edit-cover__img"
                unoptimized
              />
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
            category={initial.category}
            tags={initial.tags}
          />
        </div>
      )}

      {tab === "seo" && (
        <div className="a-edit-seo-grid">
          <EditorSeoPanel seo={seo} onChange={setSeo} />
          <aside style={{ position: "sticky", top: 24 }}>
            <AuthorCard padding={20} accent="var(--da-purple)">
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                <span style={{ color: "var(--da-purple)", fontSize: 16 }}>✨</span>
                <p
                  style={{
                    color: "var(--da-purple)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontFamily: "var(--da-font-mono)",
                  }}
                >
                  SEO mit AI
                </p>
              </div>
              <p style={{ color: "var(--da-muted)", fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>
                Lass die AI alle SEO-Felder auf einmal optimieren — basierend auf Titel und Abstract.
              </p>
              <button
                type="button"
                disabled
                title="AI-Features kommen in einer späteren Phase"
                style={{
                  width: "100%",
                  background: "var(--da-purple)",
                  color: "var(--da-dark)",
                  border: "none",
                  padding: 11,
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "not-allowed",
                  opacity: 0.6,
                  fontFamily: "inherit",
                }}
              >
                ✨ Alles optimieren
              </button>
            </AuthorCard>
          </aside>
        </div>
      )}

      {tab === "revisions" && (
        <div style={{ maxWidth: 720 }}>
          <EditorRevisions revisions={revisions} authorsById={authorsById} />
        </div>
      )}
    </>
  );
}

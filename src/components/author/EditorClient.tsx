"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import AuthorStatusBadge from "@/components/author/AuthorStatusBadge";
import BlockEditor from "@/components/author/BlockEditor";
import EditorRevisions from "@/components/author/EditorRevisions";
import EditorSeoPanel, { type SeoState } from "@/components/author/EditorSeoPanel";
import EditorSidebar from "@/components/author/EditorSidebar";
import LegacyMigrationModal from "@/components/author/LegacyMigrationModal";
import MarkdownEditor from "@/components/author/MarkdownEditor";
import ArticleBody from "@/components/ArticleBody";
import BlockReader from "@/components/BlockReader";
import InlineText from "@/components/InlineText";
import InlineToolbarTextarea from "@/components/editor/InlineToolbarTextarea";
import InternalArticleAutocomplete from "@/components/editor/InternalArticleAutocomplete";
import SourcePicker, { newSourceId } from "@/components/editor/SourcePicker";
import type { ArticleSearchResult } from "@/lib/articleSearchActions";
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
import type { Block, BlockDocument } from "@/types/blocks";
import {
  BLOCK_SCHEMA_VERSION,
  emptyBlockDocument,
  hasSpecialBlocks,
} from "@/types/blocks";

type Tab = "content" | "preview" | "seo" | "revisions";
type Mode = "visual" | "markdown";

type Props = {
  article: SuiteArticle;
  revisions: RevisionWithEditor[];
  categories: { id: string; slug: string; name_de: string }[];
  isEditor: boolean;
  allAuthors: { id: string; display_name: string; role: string }[];
};

export default function EditorClient({ article, revisions, categories, isEditor, allAuthors }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("content");
  const [mode, setMode] = useState<Mode>("visual");

  const [title, setTitle] = useState(article.title);
  const [excerpt, setExcerpt] = useState(article.excerpt ?? "");
  const [cover, setCover] = useState(article.cover_image_url ?? "");
  const [categoryId, setCategoryId] = useState(article.category_id);
  const [subcategory, setSubcategory] = useState(article.subcategory ?? "");
  const [tagsText, setTagsText] = useState((article.tags ?? []).join(", "));
  // Veröffentlichungsdatum: YYYY-MM-DD-Format für <input type="date">.
  // Bei Save wird's auf Midnight-UTC-ISO-Timestamp expandiert; null bei leer.
  const [publishedAtDate, setPublishedAtDate] = useState<string>(
    article.published_at ? article.published_at.slice(0, 10) : "",
  );

  // Initial-State:
  //   - body_blocks gesetzt → BlockDocument geladen, Visual ist Source-of-Truth
  //   - body_blocks null + body_md leer → frischer Artikel, leerer Doc
  //   - body_blocks null + body_md nicht leer → Legacy-Artikel, doc=null bis
  //     User Markdown→Visual triggert (Confirmation-Modal)
  const initialDoc: BlockDocument | null = (() => {
    if (article.body_blocks) {
      return article.body_blocks as unknown as BlockDocument;
    }
    if (!article.body_md || article.body_md.trim() === "") {
      return emptyBlockDocument();
    }
    return null; // Legacy, awaiting migration
  })();

  const [doc, setDoc] = useState<BlockDocument | null>(initialDoc);
  const [markdown, setMarkdown] = useState(article.body_md ?? "");
  // Wird true sobald der User im Markdown-Modus tippt. Wird auf false
  // gesetzt, wenn wir Markdown aus doc neu erzeugen (also bei Visual→Markdown-
  // Switch). Steuert ob beim nächsten Visual-Switch / Save re-geparst wird —
  // sonst gehen Spezial-Blocks unnötig verloren.
  const [markdownDirty, setMarkdownDirty] = useState(false);
  const [status, setStatus] = useState<ArticleStatus>(article.status);
  const [showLegacyModal, setShowLegacyModal] = useState(false);
  const [articlePickHandler, setArticlePickHandler] = useState<
    ((r: ArticleSearchResult) => void) | null
  >(null);
  const [sourceInsertHandler, setSourceInsertHandler] = useState<
    ((n: number) => void) | null
  >(null);

  // Wrap in einer setter-Funktion (Form mit Vorher-State), damit setState
  // den Callback nicht als Reducer behandelt.
  function requestArticlePick(onPick: (r: ArticleSearchResult) => void) {
    setArticlePickHandler(() => onPick);
  }
  function requestSourcePick(insertMarker: (n: number) => void) {
    setSourceInsertHandler(() => insertMarker);
  }

  // Informational flag: zeigt einen Hinweis-Banner im Markdown-Modus, dass
  // Spezial-Blocks bei Markdown-Edits verloren gehen. Macht Markdown NICHT
  // read-only — der User entscheidet selbst.
  const hasSpecialContent = doc !== null && hasSpecialBlocks(doc);

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
      // Visual → Markdown: aus aktuellem Doc rendern, Dirty-Flag zurücksetzen.
      if (doc) setMarkdown(blocksToMarkdown(doc.blocks));
      setMarkdownDirty(false);
      setMode("markdown");
      return;
    }

    // next === "visual"
    if (doc === null) {
      // Legacy: bei nicht-leerem Markdown via Modal bestätigen.
      if (markdown.trim() !== "") {
        setShowLegacyModal(true);
        return;
      }
      setDoc(emptyBlockDocument());
      setMode("visual");
      return;
    }

    // doc existiert. Nur re-parsen wenn der User wirklich getippt hat —
    // sonst gehen Spezial-Blocks unnötig verloren beim Hin-und-Her-Wechseln.
    if (markdownDirty) {
      setDoc({ ...doc, blocks: markdownToBlocks(markdown) });
      setMarkdownDirty(false);
    }
    setMode("visual");
  }

  function confirmLegacyMigration() {
    const blocks = markdownToBlocks(markdown);
    setDoc({ version: BLOCK_SCHEMA_VERSION, blocks, sources: [] });
    setShowLegacyModal(false);
    setMode("visual");
  }

  const wordCount = useMemo(() => {
    const blocks: Block[] = doc?.blocks ?? [];
    const blockText = blocks.reduce((acc, b) => {
      if (b.type === "list") return acc + " " + b.items.join(" ");
      if (b.type === "image") return acc + " " + b.alt + " " + (b.caption ?? "");
      if (b.type === "code") return acc + " " + b.content;
      if (b.type === "statbox") {
        return acc + " " + b.items.map((it) => `${it.value} ${it.label}`).join(" ");
      }
      if (b.type === "disclaimer") return acc + " " + b.text + " " + (b.linkText ?? "");
      if (b.type === "internalArticleCard") return acc + " " + b.cachedTitle;
      if (b.type === "divider") return acc;
      return acc + " " + b.content;
    }, "");
    const fallback = doc ? "" : markdown;
    const text = blockText + " " + fallback + " " + title + " " + excerpt;
    return text.split(/\s+/).filter(Boolean).length;
  }, [doc, markdown, title, excerpt]);

  const readMinutes = Math.max(1, Math.round(wordCount / 200));

  function buildPatch(): ArticlePatch {
    const cleanTags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    // Date-Input liefert "YYYY-MM-DD"; wir speichern Midnight-UTC. Leerer
    // String → null (DB-Spalte ist nullable). Beim Publish behält publishArticle
    // das vorhandene Datum und überschreibt nicht.
    const publishedAtIso = publishedAtDate
      ? `${publishedAtDate}T00:00:00.000Z`
      : null;
    const patch: ArticlePatch = {
      title,
      excerpt: excerpt || null,
      cover_image_url: cover || null,
      category_id: categoryId,
      subcategory: subcategory || null,
      tags: cleanTags,
      seo_title: seo.title || null,
      seo_description: seo.description || null,
      seo_keyword: seo.keyword || null,
      published_at: publishedAtIso,
    };
    if (doc) {
      // Wenn im Markdown-Modus getippt wurde: Markdown → Blocks synchronisieren
      // bevor wir doc speichern. Sources bleiben erhalten (doc-level), aber
      // Spezial-Block-Strukturen werden beim Re-Parse verworfen.
      if (mode === "markdown" && markdownDirty) {
        patch.body_blocks = { ...doc, blocks: markdownToBlocks(markdown) };
      } else {
        patch.body_blocks = doc;
      }
    } else {
      // Legacy-Markdown-Only: body_md as-is durchschleifen
      patch.body_md = markdown;
    }
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
          { id: "preview", label: "Vorschau" },
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


            <div className="a-edit-title-card">
              <input
                className="a-edit-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Artikel-Titel"
              />
              <InlineToolbarTextarea
                rows={3}
                value={excerpt}
                onChange={setExcerpt}
                placeholder="Abstract / Lead-Paragraph"
                onRequestArticlePick={requestArticlePick}
                onRequestSourcePick={requestSourcePick}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--da-muted)",
                  fontSize: 16,
                  lineHeight: 1.6,
                  fontStyle: "italic",
                  resize: "none",
                  padding: 0,
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div className="a-edit-meta-row">
              <div>
                <label className="a-edit-meta-label">Kategorie</label>
                <select
                  className="a-edit-meta-select"
                  value={categoryId}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === categoryId) return;
                    // Featured/Hero werden serverseitig auf false gesetzt
                    // (siehe saveArticle), aber wir warnen den User vorher.
                    if ((article.is_featured || article.is_hero) && next !== article.category_id) {
                      const ok = window.confirm(
                        "Dieser Artikel ist als Featured oder Hero markiert. Beim Wechsel der Kategorie werden Featured- und Hero-Status zurückgesetzt. Fortfahren?",
                      );
                      if (!ok) return;
                    }
                    setCategoryId(next);
                  }}
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
                doc ? (
                  <>
                    <div
                      style={{
                        background: "rgba(50, 255, 126, 0.06)",
                        border: "1px solid var(--da-border)",
                        color: "var(--da-muted)",
                        padding: "8px 12px",
                        borderRadius: 4,
                        fontSize: 12,
                        marginBottom: 14,
                        lineHeight: 1.5,
                      }}
                    >
                      Inline-Formatierung (Bold, Highlights, Links, Quellen
                      etc.) erscheint hier als Markdown- und Custom-Syntax.
                      Wie der Artikel später aussieht, zeigt der{" "}
                      <button
                        type="button"
                        onClick={() => setTab("preview")}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--da-green)",
                          textDecoration: "underline",
                          cursor: "pointer",
                          fontSize: "inherit",
                          padding: 0,
                          fontFamily: "inherit",
                        }}
                      >
                        Vorschau-Tab
                      </button>
                      .
                    </div>
                    <BlockEditor
                      doc={doc}
                      onChange={setDoc}
                      articleId={article.id}
                      onRequestArticlePick={requestArticlePick}
                      onRequestSourcePick={requestSourcePick}
                    />
                  </>
                ) : (
                  <div style={{ color: "var(--da-muted)", fontSize: 14 }}>
                    Visual-Editor wird vorbereitet…
                  </div>
                )
              ) : (
                <>
                  {hasSpecialContent && (
                    <div
                      style={{
                        background: "rgba(255, 140, 66, 0.08)",
                        border: "1px solid var(--da-orange)",
                        color: "var(--da-orange)",
                        padding: "10px 14px",
                        borderRadius: 4,
                        fontSize: 13,
                        marginBottom: 12,
                      }}
                    >
                      Dieser Artikel enthält Spezial-Blocks (StatBox,
                      Disclaimer, Quellen, etc.). Markdown-Sicht zeigt eine
                      vereinfachte Darstellung — wenn du hier änderst und
                      speicherst, werden die Spezial-Blocks durch den
                      Markdown-Inhalt ersetzt.
                    </div>
                  )}
                  <MarkdownEditor
                    value={markdown}
                    onChange={(v) => {
                      setMarkdown(v);
                      setMarkdownDirty(true);
                    }}
                  />
                </>
              )}
            </div>
          </div>

          <EditorSidebar
            wordCount={wordCount}
            readMinutes={readMinutes}
            category={categoryName}
            tags={tagsText.split(",").map((t) => t.trim()).filter(Boolean)}
            articleId={article.id}
            coverImageUrl={cover}
            onCoverChange={setCover}
            publishedAtDate={publishedAtDate}
            onPublishedAtChange={setPublishedAtDate}
            isEditor={isEditor}
            allAuthors={allAuthors}
            currentAuthorId={article.author_id}
            initialIsFeatured={article.is_featured ?? false}
            initialIsHero={article.is_hero ?? false}
          />
        </div>
      )}

      {showLegacyModal && (
        <LegacyMigrationModal
          onCancel={() => setShowLegacyModal(false)}
          onConfirm={confirmLegacyMigration}
        />
      )}

      <InternalArticleAutocomplete
        open={articlePickHandler !== null}
        onClose={() => setArticlePickHandler(null)}
        onPick={(result) => {
          articlePickHandler?.(result);
          setArticlePickHandler(null);
        }}
        excludeId={article.id}
      />

      <SourcePicker
        open={sourceInsertHandler !== null}
        onClose={() => setSourceInsertHandler(null)}
        sources={doc?.sources ?? []}
        onPickExisting={(n) => {
          sourceInsertHandler?.(n);
          setSourceInsertHandler(null);
        }}
        onCreateNew={(source) => {
          if (!doc) return;
          const newSources = [
            ...doc.sources,
            { id: newSourceId(), ...source },
          ];
          setDoc({ ...doc, sources: newSources });
          const newN = newSources.length;
          sourceInsertHandler?.(newN);
          setSourceInsertHandler(null);
        }}
      />

      {tab === "preview" && (
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            background: "var(--da-darker)",
            border: "1px solid var(--da-border)",
            borderRadius: 8,
            padding: "32px 36px 48px",
          }}
        >
          <div
            style={{
              color: "var(--da-faint)",
              fontFamily: "var(--da-font-mono)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Vorschau · So sieht der Artikel auf der Public-Page aus
          </div>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              style={{
                width: "100%",
                aspectRatio: "16/9",
                objectFit: "cover",
                borderRadius: 8,
                marginBottom: 24,
              }}
            />
          )}
          <h1
            style={{
              color: "var(--da-text)",
              fontFamily: "var(--da-font-display)",
              fontSize: 36,
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: 12,
            }}
          >
            {title || "(Ohne Titel)"}
          </h1>
          {excerpt && (
            <p
              style={{
                color: "var(--da-muted)",
                fontSize: 18,
                lineHeight: 1.55,
                marginBottom: 28,
              }}
            >
              <InlineText content={excerpt} sources={doc?.sources ?? []} />
            </p>
          )}
          <ArticleBody>
            <BlockReader
              doc={
                doc ?? {
                  version: BLOCK_SCHEMA_VERSION,
                  blocks: markdownToBlocks(markdown),
                  sources: [],
                }
              }
            />
          </ArticleBody>
          {(() => {
            const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
            if (tags.length === 0) return null;
            return (
              <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      background: "var(--da-card)",
                      border: "1px solid var(--da-border)",
                      color: "var(--da-text-strong)",
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontFamily: "var(--da-font-mono)",
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            );
          })()}
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

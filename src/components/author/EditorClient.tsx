"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import AuthorStatusBadge from "@/components/author/AuthorStatusBadge";
// BlockEditor / MarkdownEditor / LegacyMigrationModal werden seit
// Etappe A nicht mehr aus EditorClient gerendert. Der Pages-Editor
// (src/app/autor/(suite)/seiten/[id]/PageEditorClient.tsx) importiert
// `BlockEditor` direkt aus dessen Datei — er ist nicht von uns hier
// abhängig. Cleanup-Imports in Etappe C, falls die Pages-Migration so
// weit ist.
import LegacyMigrationModal from "@/components/author/LegacyMigrationModal";
import EditorRevisions from "@/components/author/EditorRevisions";
import EditorSeoPanel, { type SeoState } from "@/components/author/EditorSeoPanel";
import EditorSidebar from "@/components/author/EditorSidebar";
import TagInput from "@/components/author/TagInput";
import ArticleBody from "@/components/ArticleBody";
import BlockReader from "@/components/BlockReader";
import InlineText from "@/components/InlineText";
import SourcePicker, { newSourceId } from "@/components/editor/SourcePicker";
import { SunIcon } from "@/components/tiptap-icons/sun-icon";
import { MoonStarIcon } from "@/components/tiptap-icons/moon-star-icon";
import TiptapAbstractEditor, { type TiptapAbstractEditorHandle } from "@/components/author/tiptap/TiptapAbstractEditor";
import TiptapBodyEditor, { type TiptapBodyEditorHandle } from "@/components/author/tiptap/TiptapBodyEditor";
import TiptapFooterEditor, { type DisclaimerValue, type InternalCard } from "@/components/author/tiptap/TiptapFooterEditor";
import {
  archiveArticle,
  deleteArticle,
  publishArticle,
  saveArticle,
  submitForReview,
  type ArticlePatch,
} from "@/lib/authorActions";
import type { SuiteArticle, RevisionWithEditor, ArticleStatus } from "@/lib/authorApi";
import { markdownToBlocks } from "@/lib/markdownBlocks";
import type { Block, BlockDocument } from "@/types/blocks";
import {
  BLOCK_SCHEMA_VERSION,
  emptyBlockDocument,
  hasSpecialBlocks,
} from "@/types/blocks";
import { blocksToTiptap } from "@/lib/tiptap/blocksToTiptap";
import { tiptapToBlocks } from "@/lib/tiptap/tiptapToBlocks";
import { contentWhitelistMatch, runRoundtripGuard, type GuardResult } from "@/lib/tiptap/roundtripGuard";
import { cleanupMarkdown } from "@/lib/editor/mdCleanup";

type Tab = "content" | "preview" | "seo" | "revisions";

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
  // Session-only Editor-Theme — kein localStorage, kein Server-Persist.
  // Reload geht zurück auf Default (dark). Klasse hängt am Karten-Wrapper,
  // damit Action-Toolbar/Tabs/Sidebars/Footer ungescopt im Dark-Theme
  // bleiben.
  const [editorTheme, setEditorTheme] = useState<"dark" | "light">("dark");

  const [title, setTitle] = useState(article.title);
  const [excerpt, setExcerpt] = useState(article.excerpt ?? "");
  const [cover, setCover] = useState(article.cover_image_url ?? "");
  const [categoryId, setCategoryId] = useState(article.category_id);
  const [subcategory, setSubcategory] = useState(article.subcategory ?? "");
  const [tagList, setTagList] = useState<string[]>(article.tags ?? []);
  // Sprache: bestimmt das `lang`-Attribut auf der Detail-Page und das
  // og:locale-Meta-Tag. DB-Werte sind "de-CH" oder "en" (CHECK constraint).
  // Fallback auf "de-CH" für die Edge-Case-TS-Lücke wenn ein Legacy-Row
  // ohne locale-Wert ankommt — DB hat NOT NULL DEFAULT, sollte nie auftreten.
  const [locale, setLocale] = useState<"de-CH" | "en">(
    (article.locale as "de-CH" | "en" | null) ?? "de-CH",
  );
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
  // Markdown-Restbestand: body_md wird zwar weiter regeneriert (saveArticle
  // macht das serverseitig), ist hier aber nicht mehr editierbar. State
  // bleibt für die Plain-Text-Aggregation unten (bodyText/firstParagraph).
  const markdown = article.body_md ?? "";
  const [status, setStatus] = useState<ArticleStatus>(article.status);
  const [showLegacyModal, setShowLegacyModal] = useState(false);
  const [sourceInsertHandler, setSourceInsertHandler] = useState<
    ((n: number) => void) | null
  >(null);

  // Wrap in einer setter-Funktion (Form mit Vorher-State), damit setState
  // den Callback nicht als Reducer behandelt.
  function requestSourcePick(insertMarker: (n: number) => void) {
    setSourceInsertHandler(() => insertMarker);
  }

  // (Markdown-Modus-Hinweis aus dem alten Editor — wird seit Etappe A
  // nicht mehr verwendet. `hasSpecialBlocks` bleibt als Import-Side-Effect
  // erreichbar für Migrations-Hilfslogik. Cleanup in Etappe C.)
  void hasSpecialBlocks;

  // === Tiptap-Editor (Etappe A) ===
  // Body-Blocks vs. Footer-Blocks (disclaimer + internalArticleCard) bei
  // Load aufteilen. Footer-Elemente landen im React-State, Body als
  // Tiptap-Doc. Beim Save in umgekehrter Reihenfolge zusammenfügen +
  // Roundtrip-Guard.
  const initialSplit = useMemo(() => {
    const blocks = doc?.blocks ?? [];
    const body: Block[] = [];
    let footerDisclaimer: Extract<Block, { type: "disclaimer" }> | null = null;
    const footerCards: Extract<Block, { type: "internalArticleCard" }>[] = [];
    for (const b of blocks) {
      if (b.type === "disclaimer") {
        // Letzter Disclaimer gewinnt (sollte in der Praxis max einer pro
        // Artikel sein).
        footerDisclaimer = b;
      } else if (b.type === "internalArticleCard") {
        footerCards.push(b);
      } else {
        body.push(b);
      }
    }
    return { body, footerDisclaimer, footerCards };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialBodyTiptap = useMemo(
    () =>
      blocksToTiptap({
        version: BLOCK_SCHEMA_VERSION,
        blocks: initialSplit.body,
        sources: doc?.sources ?? [],
      }),
    [initialSplit, doc],
  );

  // Abstract als single-paragraph BlockDocument verpacken und durch das
  // bestehende, getestete blocksToTiptap-Konverter-Paar in einen Tiptap-
  // Doc wandeln. Damit überleben Bestand-Marker (`[^N]`, `[[slug]]`,
  // `{{lg/xl}}`) den Mount auch wenn der Abstract-Editor keine Toolbar-
  // Buttons dafür hat — Pass-Through-Marks sind in TiptapAbstractEditor
  // mit-registriert.
  const initialAbstractTiptap = useMemo(
    () =>
      blocksToTiptap({
        version: BLOCK_SCHEMA_VERSION,
        blocks: [{ id: "abs", type: "paragraph", content: article.excerpt ?? "" }],
        sources: [],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const bodyEditorRef = useRef<TiptapBodyEditorHandle | null>(null);
  const abstractEditorRef = useRef<TiptapAbstractEditorHandle | null>(null);

  // Liest den aktuellen Abstract-Stand aus dem Tiptap-Editor und
  // serialisiert ihn in den Token-String, der in `articles.excerpt`
  // gespeichert wird. Verwendet das geprüfte tiptapToBlocks-Konverter-
  // Paar — NICHT den Sandbox-Serializer, weil der pass-through Marks
  // (internalLink, fontSize) und daSourceRef nicht kennt.
  // MD-Cleanup: nimmt den Body-Editor-Text als Markdown, parst Header +
  // Quellen-Sektion + Inline-Refs und ersetzt Editor-Inhalt + Sources.
  // Idempotenz-Schutz: wenn keine `## Quellen`-Sektion gefunden wurde,
  // bleiben die bestehenden doc.sources unangetastet — sonst gingen die
  // beim ersten Cleanup angelegten Quellen beim zweiten Klick verloren.
  function handleMdCleanup() {
    const md = bodyEditorRef.current?.getText() ?? "";
    if (!md.trim()) {
      window.alert("Editor ist leer — nichts zu bereinigen.");
      return;
    }
    const ok = window.confirm(
      "MD-Cleanup ersetzt den gesamten Body-Inhalt und extrahiert die " +
        "Quellen-Sektion. Fortfahren? (Undo mit Strg+Z möglich.)",
    );
    if (!ok) return;
    const { blocks, sources, foundSourcesSection } = cleanupMarkdown(md);
    const tiptap = blocksToTiptap({
      version: BLOCK_SCHEMA_VERSION,
      blocks,
      sources: foundSourcesSection ? sources : doc?.sources ?? [],
    });
    bodyEditorRef.current?.setContent(tiptap);
    setDoc((prev) => {
      const base = prev ?? { version: BLOCK_SCHEMA_VERSION, blocks: [], sources: [] };
      return {
        ...base,
        sources: foundSourcesSection ? sources : base.sources,
      };
    });
  }

  function readExcerptFromAbstract(): string {
    const json = abstractEditorRef.current?.getJSON();
    if (!json) return excerpt;
    const back = tiptapToBlocks(
      json as Parameters<typeof tiptapToBlocks>[0],
      [],
    );
    const first = back.blocks.find((b) => b.type === "paragraph");
    return first?.type === "paragraph" ? first.content : "";
  }
  const [disclaimer, setDisclaimer] = useState<DisclaimerValue>(
    initialSplit.footerDisclaimer
      ? {
          text: initialSplit.footerDisclaimer.text,
          linkText: initialSplit.footerDisclaimer.linkText ?? "",
          linkUrl: initialSplit.footerDisclaimer.linkUrl ?? "",
        }
      : null,
  );
  const [relatedArticles, setRelatedArticles] = useState<InternalCard[]>(
    initialSplit.footerCards.map((c) => ({
      articleSlug: c.articleSlug,
      cachedTitle: c.cachedTitle,
      cachedCoverUrl: c.cachedCoverUrl,
      cachedExcerpt: c.cachedExcerpt,
    })),
  );
  const [guardResult, setGuardResult] = useState<GuardResult | null>(null);

  function makeBlockId(): string {
    return `bl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // Serialisiert Tiptap-Body + Footer-State zu finalem BlockDocument.
  // Behält sources[] vom Original-Doc bei (kein Picker in Etappe A).
  function buildBlockDocumentFromEditor(): BlockDocument {
    const original = doc ?? { version: BLOCK_SCHEMA_VERSION, blocks: [], sources: [] };
    const bodyJson = bodyEditorRef.current?.getJSON();
    const bodyRound = bodyJson
      ? tiptapToBlocks(
          bodyJson as Parameters<typeof tiptapToBlocks>[0],
          original.sources,
        )
      : { version: BLOCK_SCHEMA_VERSION, blocks: [], sources: original.sources };
    const finalBlocks: Block[] = [...bodyRound.blocks];
    if (disclaimer) {
      finalBlocks.push({
        id: makeBlockId(),
        type: "disclaimer",
        text: disclaimer.text,
        ...(disclaimer.linkText ? { linkText: disclaimer.linkText } : {}),
        ...(disclaimer.linkUrl ? { linkUrl: disclaimer.linkUrl } : {}),
      });
    }
    for (const c of relatedArticles) {
      finalBlocks.push({
        id: makeBlockId(),
        type: "internalArticleCard",
        articleSlug: c.articleSlug,
        cachedTitle: c.cachedTitle,
        ...(c.cachedCoverUrl ? { cachedCoverUrl: c.cachedCoverUrl } : {}),
        ...(c.cachedExcerpt ? { cachedExcerpt: c.cachedExcerpt } : {}),
      });
    }
    return {
      version: BLOCK_SCHEMA_VERSION,
      blocks: finalBlocks,
      sources: original.sources,
    };
  }

  const [seo, setSeo] = useState<SeoState>({
    title: article.seo_title ?? "",
    description: article.seo_description ?? "",
    slug: article.slug,
    keyword: article.seo_keyword_primary ?? "",
  });

  const [savedAt, setSavedAt] = useState<string>("Geladen");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Legacy-Modal wird seit Etappe A nicht mehr verwendet. Bleibt als
  // No-Op-Closure, damit der Modal-Render unten keinen Compile-Error wirft.
  // Cleanup in Etappe C.
  function confirmLegacyMigration() {
    setShowLegacyModal(false);
  }

  // Plain-Text-Aggregation des Body-Inhalts: Block-Tree (Visual) ODER
  // Markdown-Fallback (Legacy). Inline-Marker werden mit-genommen — für
  // AI-Kontext akzeptabel, der LLM ignoriert sie ohnehin. Dient zwei
  // Zwecken: wordCount + AI-Server-Action-Input (z.B. SEO-Titel-Vorschlag).
  // Erster Absatz für die SEO-Review-Analyse: erster Block vom Typ
  // 'paragraph' im Visual-Tree. Wenn der Doc null/leer ist oder kein
  // paragraph drin: leerer String — der LLM bekommt das im Prompt und
  // kann das als "Lead-Paragraph fehlt"-Empfehlung zurückgeben.
  const firstParagraph = useMemo(() => {
    const blocks: Block[] = doc?.blocks ?? [];
    for (const b of blocks) {
      if (b.type === "paragraph" && b.content.trim() !== "") {
        return b.content;
      }
    }
    return "";
  }, [doc]);

  const bodyText = useMemo(() => {
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
    return (blockText + " " + fallback).trim();
  }, [doc, markdown]);

  const wordCount = useMemo(() => {
    const text = bodyText + " " + title + " " + excerpt;
    return text.split(/\s+/).filter(Boolean).length;
  }, [bodyText, title, excerpt]);

  const readMinutes = Math.max(1, Math.round(wordCount / 200));

  // Build patch ohne Guard — wird intern von handleSave/Submit/Publish
  // VOR `saveArticle` gerufen. Der Guard läuft separat (siehe runGuard),
  // damit bei einer Abweichung das Save abgebrochen und der Hinweis
  // angezeigt werden kann.
  function buildPatchUnchecked(finalDoc: BlockDocument, finalExcerpt: string): ArticlePatch {
    const cleanTags = tagList.map((t) => t.trim()).filter(Boolean);
    const publishedAtIso = publishedAtDate
      ? `${publishedAtDate}T00:00:00.000Z`
      : null;
    const patch: ArticlePatch = {
      title,
      excerpt: finalExcerpt || null,
      cover_image_url: cover || null,
      category_id: categoryId,
      subcategory: subcategory || null,
      tags: cleanTags,
      seo_title: seo.title || null,
      seo_description: seo.description || null,
      seo_keyword_primary: seo.keyword || null,
      published_at: publishedAtIso,
      locale,
      body_blocks: finalDoc,
    };
    if (seo.slug && seo.slug !== article.slug) {
      patch.slug = seo.slug;
    }
    return patch;
  }

  // Roundtrip-Guard, Self-Fixpoint-Variante (seit Etappe B):
  // Statt finalDoc gegen den geladenen DB-Stand zu vergleichen — was
  // jedes legitime Hinzufügen/Entfernen von Blocks fälschlich blockt —
  // round-trippen wir finalDoc selbst nochmal durch das Konverter-Paar
  // (blocksToTiptap → tiptapToBlocks) und schauen, ob es semantisch
  // unverändert wieder rauskommt. Der Guard fängt damit Serializer-
  // Verlust (z.B. wenn der Roundtrip einen Mark verschluckt), ohne dass
  // ein zusätzlicher Absatz im Editor als "Drift gegen Original"
  // missverstanden wird.
  function runGuard(finalDoc: BlockDocument, finalExcerpt: string): GuardResult {
    const tiptap = blocksToTiptap(finalDoc);
    const fixpoint = tiptapToBlocks(
      tiptap as Parameters<typeof tiptapToBlocks>[0],
      finalDoc.sources,
    );
    const bodyGuard = runRoundtripGuard(finalDoc, fixpoint);

    // Abstract-Mini-Guard via gleichem Self-Fixpoint-Verfahren wie Body:
    // serialize → blocksToTiptap → tiptapToBlocks → vergleiche per
    // contentWhitelistMatch. Bei Diff wird ein Pseudo-Eintrag in
    // changedBlocks angehängt und das Gesamt-Result auf blockiert gesetzt.
    const wrappedAbstract = blocksToTiptap({
      version: BLOCK_SCHEMA_VERSION,
      blocks: [{ id: "abs", type: "paragraph", content: finalExcerpt }],
      sources: [],
    });
    const backAbstract = tiptapToBlocks(
      wrappedAbstract as Parameters<typeof tiptapToBlocks>[0],
      [],
    );
    const fixExcerpt =
      backAbstract.blocks[0]?.type === "paragraph"
        ? backAbstract.blocks[0].content
        : "";
    if (
      finalExcerpt !== fixExcerpt &&
      !contentWhitelistMatch(finalExcerpt, fixExcerpt)
    ) {
      return {
        allowed: false,
        changedBlocks: [
          ...bodyGuard.changedBlocks,
          {
            index: -1,
            type: "abstract",
            reason: "Abstract roundtrip lossy — Inhalt würde verändert.",
            origPreview: finalExcerpt.slice(0, 120),
            candPreview: fixExcerpt.slice(0, 120),
          },
        ],
      };
    }
    return bodyGuard;
  }

  // Pre-Save-Schritt: Editor → BlockDocument + Guard. Returnt null wenn
  // Guard blockt (Error wird gesetzt), sonst das finale Doc + Excerpt.
  function prepareSave(): { finalDoc: BlockDocument; finalExcerpt: string } | null {
    setError(null);
    const finalDoc = buildBlockDocumentFromEditor();
    const finalExcerpt = readExcerptFromAbstract();
    const guard = runGuard(finalDoc, finalExcerpt);
    setGuardResult(guard);
    if (!guard.allowed) {
      setError(
        `Speichern blockiert: ${guard.changedBlocks.length} Block(s) würden verändert. ` +
          "Details unten — bitte prüfen.",
      );
      return null;
    }
    return { finalDoc, finalExcerpt };
  }

  async function handleSave() {
    const prepared = prepareSave();
    if (!prepared) return;
    const { finalDoc, finalExcerpt } = prepared;
    startTransition(async () => {
      try {
        const updated = await saveArticle(article.id, buildPatchUnchecked(finalDoc, finalExcerpt));
        setStatus(updated.status);
        setSavedAt("Gespeichert");
        setDoc(finalDoc);
        setExcerpt(finalExcerpt);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  async function handleSubmit() {
    const prepared = prepareSave();
    if (!prepared) return;
    const { finalDoc, finalExcerpt } = prepared;
    startTransition(async () => {
      try {
        await saveArticle(article.id, buildPatchUnchecked(finalDoc, finalExcerpt));
        const next = await submitForReview(article.id);
        setStatus(next.status);
        router.push("/autor/artikel");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Einreichen fehlgeschlagen.");
      }
    });
  }

  async function handlePublish() {
    const prepared = prepareSave();
    if (!prepared) return;
    const { finalDoc, finalExcerpt } = prepared;
    startTransition(async () => {
      try {
        await saveArticle(article.id, buildPatchUnchecked(finalDoc, finalExcerpt));
        const next = await publishArticle(article.id);
        setStatus(next.status);
        setSavedAt("Publiziert");
        setDoc(finalDoc);
        setExcerpt(finalExcerpt);
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
        .a-edit-zone-card {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: 8px; margin-bottom: 18px;
        }
        .a-edit-zone-card--padded { padding: 24px; }
        .a-edit-zone-label {
          display: block; color: var(--da-faint); font-size: 10px;
          font-family: var(--da-font-mono); letter-spacing: 0.12em;
          text-transform: uppercase; font-weight: 700;
        }
        .a-edit-title-input {
          width: 100%; background: transparent; border: none; outline: none;
          color: var(--da-text); font-size: 32px; font-weight: 700;
          font-family: var(--da-font-display);
          letter-spacing: -0.01em; line-height: 1.1;
          padding: 0;
        }
        .a-edit-abstract-body {
          background: var(--da-darker); color: var(--da-muted);
          padding: 18px 24px; font-size: 16px; font-style: italic;
          line-height: 1.6;
          /* Auto-grow: kleine min-height für leeren State (Placeholder
             sichtbar), kein max-height-Cap, kein resize-Griff — Container
             wächst beim Tippen mit. Bewusst NICHT a-edit-tiptap-resizable
             verwenden (die gehört zum Body-Editor). */
          min-height: 60px;
        }
        .a-edit-tiptap-resizable {
          resize: vertical; overflow: auto;
          min-height: 300px; max-height: 80vh; height: 500px;
        }
        .a-edit-tiptap-resizable::-webkit-resizer {
          background: linear-gradient(
            135deg,
            transparent 50%,
            var(--da-border, rgba(255, 255, 255, 0.2)) 50%
          );
        }
        .a-edit-body-counter {
          display: flex; justify-content: flex-end; gap: 16px;
          padding: 8px 16px; border-top: 1px solid var(--da-border);
          font-family: var(--da-font-mono); font-size: 12px;
          color: var(--da-muted);
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
          border-radius: 8px;
        }

        /* ======================================================
           Editor-Theme-Light — gescopt auf die drei Zonen-Karten
           ======================================================
           Ports der Sandbox-Override (siehe tiptap-test.css:276+).
           Der Light-Modus überschreibt --da-* nur INNERHALB der
           Karten — alle var(--da-…) Lookups in Titel/Abstract/
           Body resolven hell, während Action-Toolbar, Tabs, Meta-
           Row, Footer (Zone 4), Sidebars im Dark-Token-Scope
           bleiben (sie sitzen ausserhalb des Karten-Selektors).
           Link-Popover-Input-Override liegt bereits global in
           tiptap-editor.css und funktioniert in beiden Modi
           (dunkler Text auf weisser Vendor-Popover-Card). */
        .editor-theme-light .a-edit-zone-card,
        .editor-theme-light .a-edit-body-card {
          --da-card: #ffffff;
          --da-darker: #f5f5f7;
          --da-text: #1c1c1e;
          --da-text-strong: #000000;
          --da-muted: rgba(0, 0, 0, 0.6);
          --da-border: rgba(0, 0, 0, 0.12);
        }
        .editor-theme-light .a-edit-zone-card .tiptap-button,
        .editor-theme-light .a-edit-body-card .tiptap-button {
          --tt-button-default-icon-color: rgba(0, 0, 0, 0.7);
          --tt-button-hover-icon-color: rgba(0, 0, 0, 0.95);
          --tt-button-active-icon-color: var(--da-green, #32ff7e);
          --tt-button-disabled-icon-color: rgba(0, 0, 0, 0.3);
        }
        .editor-theme-light .a-edit-zone-card .tiptap-separator,
        .editor-theme-light .a-edit-body-card .tiptap-separator {
          --tt-link-border-color: rgba(0, 0, 0, 0.12);
        }
        .editor-theme-light .a-edit-zone-card .ProseMirror ::selection,
        .editor-theme-light .a-edit-body-card .ProseMirror ::selection {
          background-color: rgba(50, 255, 126, 0.35);
          color: #1c1c1e;
        }
        .editor-theme-light .a-edit-body-card .tiptap.ProseMirror pre,
        .editor-theme-light .a-edit-body-card .tiptap.ProseMirror code {
          color: #1c1c1e;
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.1);
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
          <button
            type="button"
            className="a-edit-toolbar__btn"
            onClick={() => setEditorTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label={
              editorTheme === "dark"
                ? "Editor auf hell umschalten"
                : "Editor auf dunkel umschalten"
            }
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {editorTheme === "dark" ? (
              <SunIcon style={{ width: 14, height: 14 }} />
            ) : (
              <MoonStarIcon style={{ width: 14, height: 14 }} />
            )}
            <span>{editorTheme === "dark" ? "Hell" : "Dunkel"}</span>
          </button>
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
            onClick={() => {
              // Lazy-Sync vor Wechsel auf Vorschau: aktuellen Editor-State
              // in `doc` schreiben, damit BlockReader das Aktuelle rendert.
              if (t.id === "preview") {
                try {
                  const next = buildBlockDocumentFromEditor();
                  setDoc(next);
                  setExcerpt(readExcerptFromAbstract());
                } catch (e) {
                  console.error("Vorschau-Sync fehlgeschlagen:", e);
                }
              }
              setTab(t.id as Tab);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content-Tab dauerhaft gemountet, nur per CSS ein-/ausgeblendet.
          Grund: Tiptap-Editor verliert beim Unmount Live-State (Cursor,
          Selection, Undo-Stack, NodeView-State) UND seedet beim Remount
          aus dem (statischen) initialBodyTiptap — das hat in PR #99 den
          Verlust von neu eingefügten daSourceRef-Nodes beim Tab-Zyklus
          ausgelöst. Vorschau/SEO/Revisionen bleiben bedingt gerendert,
          da sie keinen verlierbaren Live-State haben. */}
      <div
        className={`a-edit-content-grid editor-theme-${editorTheme}`}
        style={{ display: tab === "content" ? undefined : "none" }}
      >
          <div>
            {guardResult && !guardResult.allowed && (
              <div
                style={{
                  background: "rgba(255, 92, 92, 0.08)",
                  border: "1px solid var(--da-red, #ff5c5c)",
                  borderRadius: 6,
                  padding: "12px 14px",
                  marginBottom: 14,
                  fontSize: 13,
                  color: "var(--da-text)",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--da-red, #ff5c5c)" }}>
                  Speichern verweigert — {guardResult.changedBlocks.length} Block(s) würden semantisch verändert.
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: "var(--da-muted)" }}>
                  {guardResult.changedBlocks.slice(0, 8).map((c, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      <span style={{ fontFamily: "var(--da-font-mono)", color: "var(--da-text-strong)" }}>
                        Block #{c.index} ({c.type}):
                      </span>{" "}
                      {c.reason}
                      <div style={{ fontSize: 11, marginTop: 4, color: "var(--da-muted-soft)" }}>
                        Original: <code>{c.origPreview}</code>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--da-muted-soft)" }}>
                        Nach Save: <code>{c.candPreview}</code>
                      </div>
                    </li>
                  ))}
                  {guardResult.changedBlocks.length > 8 && (
                    <li>… {guardResult.changedBlocks.length - 8} weitere Abweichungen</li>
                  )}
                </ul>
              </div>
            )}

            {/* Zone 1 — Titel */}
            <div className="a-edit-zone-card a-edit-zone-card--padded">
              <span className="a-edit-zone-label" style={{ marginBottom: 8 }}>
                Zone 1 · Titel
              </span>
              <input
                className="a-edit-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Artikel-Titel"
              />
            </div>

            {/* Zone 2 — Abstract */}
            <div className="a-edit-zone-card">
              <span
                className="a-edit-zone-label"
                style={{ padding: "12px 16px 0" }}
              >
                Zone 2 · Abstract
              </span>
              <TiptapAbstractEditor
                ref={abstractEditorRef}
                initialContent={initialAbstractTiptap}
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
                <label className="a-edit-meta-label">Tags</label>
                <TagInput
                  value={tagList}
                  onChange={setTagList}
                  placeholder="Tag suchen oder neu anlegen…"
                />
              </div>
              <div>
                <label className="a-edit-meta-label">Sprache</label>
                <select
                  className="a-edit-meta-select"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as "de-CH" | "en")}
                >
                  <option value="de-CH">Deutsch (Schweiz)</option>
                  <option value="en">Englisch</option>
                </select>
              </div>
            </div>

            {/* Zone 3 — Body */}
            <div className="a-edit-body-card">
              <span
                className="a-edit-zone-label"
                style={{ padding: "12px 16px 0" }}
              >
                Zone 3 · Body
              </span>
              <TiptapBodyEditor
                ref={bodyEditorRef}
                articleId={article.id}
                initialContent={initialBodyTiptap}
                onRequestSourcePick={requestSourcePick}
                onMdCleanup={handleMdCleanup}
              />
            </div>
            <TiptapFooterEditor
              disclaimer={disclaimer}
              onChangeDisclaimer={setDisclaimer}
              relatedArticles={relatedArticles}
              onChangeRelatedArticles={setRelatedArticles}
            />
          </div>

          <EditorSidebar
            wordCount={wordCount}
            readMinutes={readMinutes}
            category={categoryName}
            tags={tagList}
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

      {showLegacyModal && (
        <LegacyMigrationModal
          onCancel={() => setShowLegacyModal(false)}
          onConfirm={confirmLegacyMigration}
        />
      )}

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
          // N wird aus der NEUEN Array-Länge abgeleitet — nicht aus dem
          // doc-State, der per setDoc erst nach dem Re-Render aktualisiert
          // wird. Der Editor-Command-Aufruf passiert synchron auf der
          // Tiptap-Instanz und braucht das N JETZT.
          setDoc({ ...doc, sources: newSources });
          const newN = newSources.length;
          sourceInsertHandler?.(newN);
          setSourceInsertHandler(null);
        }}
        onUpdateExisting={(index, source) => {
          if (!doc) return;
          // Quelle an Position `index` ersetzen, alle anderen + N's
          // unverändert. Tiptap-Doc wird NICHT angefasst — daSourceRef-
          // Nodes referenzieren weiter dasselbe N.
          const nextSources = doc.sources.map((s, i) =>
            i === index
              ? { id: s.id, text: source.text, ...(source.url ? { url: source.url } : {}) }
              : s,
          );
          setDoc({ ...doc, sources: nextSources });
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
            const tags = tagList;
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
          <EditorSeoPanel
            seo={seo}
            onChange={setSeo}
            articleId={article.id}
            articleTitle={title}
            articleBodyText={bodyText}
            articleFirstParagraph={firstParagraph}
            locale={locale}
          />
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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import AuthorStatusBadge from "@/components/author/AuthorStatusBadge";
import EditorDetailsTab from "@/components/author/EditorDetailsTab";
import EditorRevisions from "@/components/author/EditorRevisions";
import EditorSeoPanel, { type SeoState } from "@/components/author/EditorSeoPanel";
import ArticleBody from "@/components/ArticleBody";
import BlockReader from "@/components/BlockReader";
import InlineText from "@/components/InlineText";
import MdCleanupModal from "@/components/editor/MdCleanupModal";
import SourcePicker, { newSourceId } from "@/components/editor/SourcePicker";
import SourceList from "@/components/editor/SourceList";
import {
  referencedSourceIndices,
  deletableSourceIndices,
  updateSourceAt,
  appendSource,
  removeSourceAt,
} from "@/components/editor/sourceListOps";
import { computeSourceDisplayItems } from "@/components/blockReader/sources";
import { checkSourceUrlsAction } from "@/lib/editor/sourceCheckActions";
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
import { validatePublishGate } from "@/lib/publishGate";
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
import { contentWhitelistMatch, runEditorRoundtripGuard, runRoundtripGuard, stripAllMarkup, type GuardResult } from "@/lib/tiptap/roundtripGuard";
import { cleanupMarkdown } from "@/lib/editor/mdCleanup";
import { generateAbstract } from "@/lib/ai/abstractActions";

type Tab = "content" | "details" | "sources" | "preview" | "seo" | "revisions";

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
  // Hero-Cover Bild-Metadaten (ALT/Caption/Source). Alle drei sind in der
  // DB nullable; State haelt sie als string mit "" als leer-Wert. Beim
  // Save in buildPatchUnchecked werden leere Strings zu null normalisiert.
  const [coverMetadata, setCoverMetadata] = useState({
    alt: article.cover_image_alt ?? "",
    caption: article.cover_image_caption ?? "",
    source: article.cover_image_source ?? "",
  });
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
  const [checkingUrls, setCheckingUrls] = useState(false);
  // Markdown-Restbestand: body_md wird zwar weiter regeneriert (saveArticle
  // macht das serverseitig), ist hier aber nicht mehr editierbar. State
  // bleibt für die Plain-Text-Aggregation unten (bodyText/firstParagraph).
  const markdown = article.body_md ?? "";
  const [status, setStatus] = useState<ArticleStatus>(article.status);
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
  // MD-Cleanup-Modal-State. Eingabe läuft über eine Plain-Textarea, weil
  // Tiptap-Paste den HTML-Pfad nimmt sobald das Clipboard HTML mitliefert
  // (typisch bei Copy aus GUI-Editoren) — dort kollabieren Linebreaks
  // schon vor dem getJSON/getText. Die Textarea bewahrt `\n` bytegenau.
  const [mdCleanupOpen, setMdCleanupOpen] = useState(false);
  // Warn-Banner nach Cleanup — informiert ueber unparseable Quellen-Zeilen
  // (jetzt im Sicherheitsnetz, nicht mehr verworfen) und ueber Mix-Faelle,
  // in denen explizite Autor-Indizes durch Auto-Nummerierung ueberschrieben
  // wurden. Pro Cleanup neu gesetzt; vom User per ✕ wegklickbar.
  const [mdCleanupWarning, setMdCleanupWarning] = useState<string | null>(null);

  function applyMdCleanup(markdown: string) {
    const {
      blocks,
      sources,
      foundSourcesSection,
      unparseableSourceLines,
      renumberedDueToMix,
    } = cleanupMarkdown(markdown);
    const tiptap = blocksToTiptap({
      version: BLOCK_SCHEMA_VERSION,
      blocks,
      sources: foundSourcesSection ? sources : doc?.sources ?? [],
    });
    bodyEditorRef.current?.setContent(tiptap);
    // Idempotenz-Schutz: ohne erkannte Quellen-Sektion bleibt doc.sources
    // unverändert — sonst gingen beim zweiten Cleanup-Lauf die beim ersten
    // Lauf angelegten Quellen verloren.
    setDoc((prev) => {
      const base = prev ?? { version: BLOCK_SCHEMA_VERSION, blocks: [], sources: [] };
      return {
        ...base,
        sources: foundSourcesSection ? sources : base.sources,
      };
    });

    // Warn-Banner zusammenstellen.
    const warns: string[] = [];
    if (unparseableSourceLines.length > 0) {
      const n = unparseableSourceLines.length;
      warns.push(
        n === 1
          ? "1 Quellen-Zeile konnte nicht als Quelle erkannt werden — wurde als Text in den Body übernommen. Format prüfen."
          : `${n} Quellen-Zeilen konnten nicht als Quellen erkannt werden — wurden als Text in den Body übernommen. Format prüfen.`,
      );
    }
    if (renumberedDueToMix) {
      warns.push(
        "Die Quellen-Sektion enthielt manche Zeilen mit [N]-Index und manche ohne — alle Quellen wurden positionsbasiert neu nummeriert.",
      );
    }
    setMdCleanupWarning(warns.length > 0 ? warns.join(" ") : null);

    setMdCleanupOpen(false);
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

  // AI-Abstract-Generierung. Pipeline: bodyText strippen (siehe useMemo
  // weiter unten) → callLLM via generateAbstract(Server Action) → Token-
  // String als Single-Paragraph-Block durch blocksToTiptap → setContent
  // auf den Abstract-Editor. Plus setExcerpt für die State-Sync, damit
  // Vorschau + Word-Count sofort stimmen ohne weiteren Tab-Wechsel.
  const [aiAbstractBusy, setAiAbstractBusy] = useState(false);
  const [aiAbstractError, setAiAbstractError] = useState<string | null>(null);

  function aiAbstractErrorMessage(kind: string): string {
    if (kind === "rate_limit") return "AI-Limit erreicht. Bitte später erneut versuchen.";
    if (kind === "timeout") return "Zeitüberschreitung. Bitte erneut versuchen.";
    if (kind === "auth" || kind === "config") return "AI-Service nicht verfügbar.";
    return "Generierung fehlgeschlagen.";
  }

  async function handleGenerateAbstract() {
    if (aiAbstractBusy) return;
    setAiAbstractError(null);
    const cleanBody = stripAllMarkup(bodyText).trim();
    if (cleanBody.length < 200) return; // Doppel-Guard zum disabled-Button.
    if (excerpt.trim().length > 0) {
      const ok = window.confirm(
        "Bestehender Abstract wird ersetzt. Fortfahren? (Undo mit Strg+Z möglich.)",
      );
      if (!ok) return;
    }
    setAiAbstractBusy(true);
    try {
      const result = await generateAbstract({
        title: title.trim(),
        bodyText: cleanBody,
        locale,
        // SEO-Modus: wenn ein Focus-Keyword im SEO-Tab gesetzt ist, baut
        // der Abstract es natürlich in den Lead ein. Ohne Keyword läuft
        // die Generierung wie bisher. Seit PR #119 ist der Abstract der
        // "Lead" für seo_review — Keyword im Lead vermeidet Folge-Befunde
        // wie "Keyword fehlt im Lead".
        focusKeyword: seo.keyword.trim() || null,
      });
      if (!result.ok) {
        setAiAbstractError(aiAbstractErrorMessage(result.kind));
        return;
      }
      const aiText = result.text.trim();
      if (!aiText) {
        setAiAbstractError("Generierung lieferte leeren Text.");
        return;
      }
      const tiptap = blocksToTiptap({
        version: BLOCK_SCHEMA_VERSION,
        blocks: [{ id: "abs", type: "paragraph", content: aiText }],
        sources: [],
      });
      abstractEditorRef.current?.setContent(tiptap);
      setExcerpt(aiText);
    } finally {
      setAiAbstractBusy(false);
    }
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
    secondaryKeywords: article.seo_keywords_secondary ?? [],
  });

  const [savedAt, setSavedAt] = useState<string>("Geladen");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Plain-Text-Aggregation des Body-Inhalts: Block-Tree (Visual) ODER
  // Markdown-Fallback (Legacy). Inline-Marker werden mit-genommen — für
  // AI-Kontext akzeptabel, der LLM ignoriert sie ohnehin. Dient zwei
  // Zwecken: wordCount + AI-Server-Action-Input (z.B. SEO-Titel-Vorschlag).
  // Lead für die SEO-Review-Analyse. Aus SEO-Sicht zählt der sichtbare
  // Einstieg der Public-Page — und das ist der ABSTRACT (excerpt), der
  // oben gross über dem Body-Text gerendert wird (artikel/[slug]/page.tsx
  // ~Z.354). Vorher zog die Analyse den ersten Body-Paragraph, was zu
  // False-Negatives führte, wenn das Keyword im Abstract stand, aber
  // nicht im Body-Lead (Beispiel: portable-trust).
  // Inline-Marker (**, {{g}}…{{/g}}, [^N]) bleiben drin — der LLM
  // ignoriert sie, und die Marker-zu-Plain-Konvertierung würde State
  // duplizieren. Fallback auf ersten Body-Paragraph wenn excerpt leer.
  const firstParagraph = useMemo(() => {
    const abstractText = excerpt.trim();
    if (abstractText !== "") return abstractText;
    const blocks: Block[] = doc?.blocks ?? [];
    for (const b of blocks) {
      if (b.type === "paragraph" && b.content.trim() !== "") {
        return b.content;
      }
    }
    return "";
  }, [excerpt, doc]);

  // H2-Liste für die SEO-Review-Analyse. seo_review prüft, ob das
  // Focus-Keyword in mindestens einer H2 vorkommt (claude-seo:
  // 1 H1 + 1-2 H2-Mentions sind sufficient) — ohne H2-Daten kann
  // das Modell den Punkt nicht bewerten.
  const headingsLevel2 = useMemo(() => {
    const blocks: Block[] = doc?.blocks ?? [];
    const out: string[] = [];
    for (const b of blocks) {
      if (b.type === "heading" && b.level === 2 && b.content.trim() !== "") {
        out.push(b.content);
      }
    }
    return out;
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

  // Mindestlänge des gestrippten Body-Texts, ab der die AI-Abstract-
  // Generierung sinnvoll Rate-Limit-Kontingent verbraucht. Token-Marker
  // (`[^N]`, `{{g}}`, `**`) zählen NICHT mit — sie tragen keinen
  // semantischen Inhalt für die Zusammenfassung.
  const MIN_BODY_FOR_ABSTRACT = 200;
  const aiAbstractDisabledReason = useMemo(() => {
    const clean = stripAllMarkup(bodyText).trim();
    if (clean.length < MIN_BODY_FOR_ABSTRACT) {
      return "Body-Text zu kurz für Abstract-Generierung (mindestens 200 Zeichen).";
    }
    return null;
  }, [bodyText]);

  // Build patch ohne Guard — wird intern von handleSave/Submit/Publish
  // VOR `saveArticle` gerufen. Der Guard läuft separat (siehe runGuard),
  // damit bei einer Abweichung das Save abgebrochen und der Hinweis
  // angezeigt werden kann.
  function buildPatchUnchecked(finalDoc: BlockDocument, finalExcerpt: string): ArticlePatch {
    const cleanTags = tagList.map((t) => t.trim()).filter(Boolean);
    const publishedAtIso = publishedAtDate
      ? `${publishedAtDate}T00:00:00.000Z`
      : null;
    const cleanSecondary = seo.secondaryKeywords
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    const patch: ArticlePatch = {
      title,
      excerpt: finalExcerpt || null,
      cover_image_url: cover || null,
      cover_image_alt: coverMetadata.alt.trim() || null,
      cover_image_caption: coverMetadata.caption.trim() || null,
      cover_image_source: coverMetadata.source.trim() || null,
      category_id: categoryId,
      subcategory: subcategory || null,
      tags: cleanTags,
      seo_title: seo.title || null,
      seo_description: seo.description || null,
      seo_keyword_primary: seo.keyword || null,
      seo_keywords_secondary: cleanSecondary,
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

    // Editor-vs-Roundtrip-Guard: faengt Editor→Block-Verluste, die der
    // Self-Fixpoint nicht sehen kann (hardBreak, unbekannte Inline-Nodes
    // /Marks).
    //
    // Wichtig: bodyEditorRef.getJSON() liefert NUR die Body-Blocks.
    // finalDoc.blocks hingegen ist `body + footer` (Disclaimer +
    // InternalArticleCard werden in buildBlockDocumentFromEditor an die
    // Body-Blocks angehaengt — sie leben architektonisch im separaten
    // TiptapFooterEditor, nicht im Body-Editor). Wenn wir den Guard gegen
    // blocksToTiptap(finalDoc) laufen lassen, wuerde er die Footer-Blocks
    // als "im Editor verloren" werten und systematisch False-Positive
    // werfen (62% der Artikel haben einen Disclaimer).
    //
    // Loesung: rebuilt-Doc fuer den Editor-Vergleich aus den Body-only-
    // Blocks neu serialisieren, damit beide Seiten denselben Scope haben.
    // Der Self-Fixpoint-Guard oben bleibt unangetastet — der prueft
    // finalDoc gegen sich selbst und ist Footer-symmetrisch korrekt.
    const editorJson = bodyEditorRef.current?.getJSON();
    if (editorJson) {
      const bodyOnlyBlocks = finalDoc.blocks.filter(
        (b) => b.type !== "disclaimer" && b.type !== "internalArticleCard",
      );
      const tiptapBodyOnly = blocksToTiptap({
        ...finalDoc,
        blocks: bodyOnlyBlocks,
      });
      const editorGuard = runEditorRoundtripGuard(editorJson, tiptapBodyOnly);
      if (!editorGuard.allowed) {
        return {
          allowed: false,
          changedBlocks: [...bodyGuard.changedBlocks, ...editorGuard.changedBlocks],
        };
      }
    }

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

    // Pre-Publish-Gate nur beim Erst-Publish (published_at war beim Laden
    // null). Bei Re-Publish/Archiv-Re-Publish bleibt das bisherige
    // Verhalten unveraendert. Quelle ist der frisch gesyncte Stand aus
    // prepareSave (finalExcerpt) plus die Live-Editor-State-Werte —
    // damit ein gerade getippter Abstract zaehlt, ohne Tab-Wechsel.
    // Server validiert zusaetzlich; UI-Check ist Anzeigequalitaet.
    const isFirstPublish = article.published_at == null;
    if (isFirstPublish) {
      const gate = validatePublishGate({
        seo_title: seo.title,
        seo_description: seo.description,
        slug: seo.slug,
        seo_keyword_primary: seo.keyword,
        excerpt: finalExcerpt,
        cover_image_url: cover,
        cover_image_alt: coverMetadata.alt,
      });
      if (!gate.ok) {
        setError(
          `Publizieren nicht möglich — es fehlen: ${gate.missing.join(", ")}.`,
        );
        return;
      }
    }

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
          /* Single-Column-Layout — Setup-Felder (Hero, Datum, Kategorie,
             Tags, Featured, Author) leben jetzt im eigenen Details-Tab,
             Content-Tab konzentriert sich auf Inhalt (Titel + Abstract +
             Body + Footer). Kein zweiter Sidebar-Slot mehr noetig. */
          display: block;
        }
        /* Sprache-Inline-Select vor dem Titel — kompakte Anzeige der
           harten Vorgabe (de-CH / en), die das og:locale + html-lang +
           AI-Prompt-Sprache steuert. Bewusst hier oben statt im Details-
           Tab: Sprache ist Content-relevant und sollte beim Editing
           immer sichtbar sein. */
        .a-edit-locale-strip {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        .a-edit-locale-strip__label {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .a-edit-locale-strip__select {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          color: var(--da-text);
          padding: 4px 8px;
          font-size: 12px;
          font-family: var(--da-font-mono);
          font-weight: 600;
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
        /* Mini-Counter unter dem Body-Editor — Live-Feedback fuer
           Word-Count + Lesezeit. Visuell schmal, damit der Editor-
           Fokus auf dem Body bleibt. */
        .a-edit-mini-stats {
          display: flex; justify-content: flex-end; gap: 18px;
          margin-top: 6px;
          font-family: var(--da-font-mono); font-size: 11px;
          color: var(--da-muted-soft);
        }
        .a-edit-mini-stats strong { color: var(--da-text); font-weight: 600; }
        .a-edit-body-card {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: 8px;
        }

        /* ======================================================
           Editor-Theme-Light — gescopt auf die drei Zonen-Karten
           ======================================================
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

      {mdCleanupWarning && (
        <div
          role="status"
          style={{
            background: "rgba(255, 165, 0, 0.10)",
            border: "1px solid var(--da-orange, #ff9f0a)",
            color: "var(--da-text)",
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 13,
            lineHeight: 1.5,
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <span>
            <strong style={{ color: "var(--da-orange, #ff9f0a)" }}>
              MD-Cleanup-Hinweis:
            </strong>{" "}
            {mdCleanupWarning}
          </span>
          <button
            type="button"
            onClick={() => setMdCleanupWarning(null)}
            style={{
              background: "transparent",
              border: 0,
              color: "var(--da-muted)",
              cursor: "pointer",
              fontSize: 14,
              padding: 0,
              lineHeight: 1,
            }}
            aria-label="Hinweis schliessen"
          >
            ✕
          </button>
        </div>
      )}

      <div className="a-edit-tabs">
        {[
          { id: "content", label: "Inhalt" },
          { id: "details", label: "Details" },
          { id: "sources", label: locale === "en" ? "Sources" : "Quellen" },
          { id: "preview", label: "Vorschau" },
          { id: "seo", label: "SEO & Meta" },
          { id: "revisions", label: "Revisionen" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`a-edit-tab${t.id === tab ? " a-edit-tab--active" : ""}`}
            onClick={() => {
              // Lazy-Sync vor Wechsel auf Vorschau ODER SEO-Tab: aktuellen
              // Editor-State in `doc` schreiben.
              //   - Preview: BlockReader rendert den aktuellen Stand.
              //   - SEO:     headingsLevel2- und firstParagraph-Memos lesen
              //              den aktuellen Stand für die seo_review-Analyse;
              //              ohne Sync sehen sie nur den letzten gespeicherten
              //              doc-Stand (Diagnose-Leck 1).
              // buildBlockDocumentFromEditor ist nebenwirkungsfrei (purer
              // Read+Transform, kein Save/Guard/Dirty-Trigger).
              if (t.id === "preview" || t.id === "seo" || t.id === "sources") {
                try {
                  const next = buildBlockDocumentFromEditor();
                  setDoc(next);
                  setExcerpt(readExcerptFromAbstract());
                } catch (e) {
                  console.error("Editor-Sync fehlgeschlagen:", e);
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

            {/* Sprache-Strip — kompakter Inline-Select VOR dem Titel.
                Sprache steuert og:locale + html-lang + AI-Prompt-Sprache,
                ist also Content-relevant und gehoert ueber den Titel. */}
            <div className="a-edit-locale-strip">
              <span className="a-edit-locale-strip__label">Sprache</span>
              <select
                className="a-edit-locale-strip__select"
                value={locale}
                onChange={(e) => setLocale(e.target.value as "de-CH" | "en")}
                aria-label="Sprache des Artikels"
              >
                <option value="de-CH">de-CH</option>
                <option value="en">en</option>
              </select>
            </div>

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
                onGenerateAbstract={handleGenerateAbstract}
                aiBusy={aiAbstractBusy}
                aiDisabledReason={aiAbstractDisabledReason}
              />
              {aiAbstractError && (
                <div
                  role="status"
                  style={{
                    margin: "8px 16px 12px",
                    padding: "8px 12px",
                    borderRadius: 4,
                    background: "rgba(255, 92, 92, 0.12)",
                    border: "1px solid var(--da-red, #ff5c5c)",
                    color: "var(--da-red, #ff5c5c)",
                    fontSize: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span>{aiAbstractError}</span>
                  <button
                    type="button"
                    onClick={() => setAiAbstractError(null)}
                    style={{
                      background: "transparent",
                      border: 0,
                      color: "inherit",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                    aria-label="Fehlermeldung schliessen"
                  >
                    ✕
                  </button>
                </div>
              )}
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
                onMdCleanup={() => setMdCleanupOpen(true)}
              />
            </div>
            <div className="a-edit-mini-stats" aria-label="Live-Statistik">
              <span><strong>{wordCount}</strong> Wörter</span>
              <span><strong>{readMinutes} min</strong> Lesezeit</span>
            </div>
            <TiptapFooterEditor
              disclaimer={disclaimer}
              onChangeDisclaimer={setDisclaimer}
              relatedArticles={relatedArticles}
              onChangeRelatedArticles={setRelatedArticles}
            />
          </div>
      </div>

      {/* Details-Tab — alle Artikel-Setup-Felder (Hero, Datum, Featured,
          Author, Kategorie/Subkat/Tags). Bleibt wie Content-Tab dauerhaft
          gemountet, damit Featured-Toggle-State (Server-Action-Pending)
          ueber Tab-Wechsel nicht verloren geht. */}
      <div style={{ display: tab === "details" ? undefined : "none" }}>
        <EditorDetailsTab
          articleId={article.id}
          coverImageUrl={cover}
          onCoverChange={setCover}
          coverMetadata={coverMetadata}
          onCoverMetadataChange={setCoverMetadata}
          publishedAtDate={publishedAtDate}
          onPublishedAtChange={setPublishedAtDate}
          isEditor={isEditor}
          allAuthors={allAuthors}
          currentAuthorId={article.author_id}
          initialIsFeatured={article.is_featured ?? false}
          initialIsHero={article.is_hero ?? false}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          categories={categories}
          subcategory={subcategory}
          onSubcategoryChange={setSubcategory}
          tagList={tagList}
          onTagListChange={setTagList}
          articleIsFeatured={article.is_featured ?? false}
          articleIsHero={article.is_hero ?? false}
          articleCategoryId={article.category_id}
        />
      </div>

      <MdCleanupModal
        open={mdCleanupOpen}
        // Live-Check aus dem Tiptap-Editor statt stale React-State.
        // doc.blocks wird von applyMdCleanup nicht synchron aktualisiert
        // (setContent geht direkt in Tiptap), darum wuerde ein stale-
        // Boolean beim zweiten Cleanup faelschlich "leer" sagen und die
        // Confirm-Warnung silent schlucken.
        getBodyHasContent={() => !(bodyEditorRef.current?.isEmpty() ?? true)}
        onClose={() => setMdCleanupOpen(false)}
        onApply={applyMdCleanup}
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

      {tab === "sources" && (() => {
        const sources = doc?.sources ?? [];
        const referenced = referencedSourceIndices(doc?.blocks ?? []);
        const deletable = deletableSourceIndices(sources.length, referenced);
        // Anzeige in Renderer-Endreihenfolge + Renderer-Nummern (Single
        // Source of Truth). Mutationen laufen weiter ueber item.index.
        const items = computeSourceDisplayItems(doc?.blocks ?? [], sources);
        const en = locale === "en";
        return (
          <div style={{ maxWidth: 720 }}>
            <SourceList
              items={items}
              referenced={referenced}
              deletable={deletable}
              labels={{
                empty: en
                  ? "No sources yet. Add one below, or insert a source reference in the body."
                  : "Noch keine Quellen. Unten anlegen, oder im Body einen Quellen-Verweis einfügen.",
                edit: en ? "Edit" : "Bearbeiten",
                delete: en ? "Delete" : "Löschen",
                cancel: en ? "Cancel" : "Abbrechen",
                save: en ? "Save" : "Speichern",
                add: en ? "Add source" : "Quelle anlegen",
                textLabel: en ? "Source text" : "Quellen-Text",
                urlLabel: "URL (optional)",
                unreferenced: en ? "not referenced" : "nicht referenziert",
                referenced: en ? "N stays unchanged" : "N bleibt unverändert",
                newHeading: en ? "New source" : "Neue Quelle",
                confirmDelete: en
                  ? "Delete this source? It is not referenced in the body."
                  : "Diese Quelle löschen? Sie ist im Body nicht referenziert.",
                check: en ? "Check URLs" : "URLs prüfen",
                checking: en ? "Checking…" : "Prüfe…",
                checkHint: en
                  ? "Blocked/uncertain ≠ dead — some sites block bots."
                  : "Blockiert/unklar ≠ tot — manche Seiten blocken Bots.",
                status: {
                  ok: "OK",
                  redirect: en ? "Redirect" : "Weiterleitung",
                  blocked: en ? "Blocked" : "Blockiert",
                  dead: en ? "404 / dead" : "404 / tot",
                  error: en ? "Error" : "Fehler",
                  timeout: "Timeout",
                },
              }}
              onUpdate={(index, patch) => {
                if (!doc) return;
                setDoc({ ...doc, sources: updateSourceAt(doc.sources, index, patch) });
              }}
              onCreate={(src) => {
                if (!doc) return;
                setDoc({ ...doc, sources: appendSource(doc.sources, src, newSourceId()) });
              }}
              onDelete={(index) => {
                if (!doc) return;
                setDoc({ ...doc, sources: removeSourceAt(doc.sources, index, referenced) });
              }}
              checking={checkingUrls}
              onCheckUrls={
                isEditor
                  ? async () => {
                      if (!doc) return;
                      setCheckingUrls(true);
                      try {
                        const outcomes = await checkSourceUrlsAction(
                          doc.sources.map((s) => s.url ?? null),
                        );
                        const nowIso = new Date().toISOString();
                        const nextSources = doc.sources.map((s, i) => {
                          const o = outcomes[i];
                          if (!o) return s;
                          return {
                            ...s,
                            urlStatus: o.status,
                            urlStatusCode: o.code ?? undefined,
                            urlCheckedAt: nowIso,
                          };
                        });
                        setDoc({ ...doc, sources: nextSources });
                      } catch (e) {
                        console.error("URL-Check fehlgeschlagen:", e);
                      } finally {
                        setCheckingUrls(false);
                      }
                    }
                  : undefined
              }
            />
          </div>
        );
      })()}

      {/* SEO-Panel dauerhaft gemountet, nur per CSS ein-/ausgeblendet —
          analog zum Content-Tab. Grund: das Panel hält lokalen State für
          das Analyse-Ergebnis (review, pipelineFields, dismissedKeys).
          Unmount würde diesen State beim Tab-Wechsel verwerfen — der
          Autor verliert seine Verbesserungsvorschläge, sobald er zur
          Body-Bearbeitung wechselt und zurückkommt. */}
      <div style={{ maxWidth: 720, display: tab === "seo" ? undefined : "none" }}>
        <EditorSeoPanel
          seo={seo}
          onChange={setSeo}
          articleId={article.id}
          articleTitle={title}
          articleBodyText={bodyText}
          articleFirstParagraph={firstParagraph}
          articleHeadingsLevel2={headingsLevel2}
          locale={locale}
        />
      </div>

      {tab === "revisions" && (
        <div style={{ maxWidth: 720 }}>
          <EditorRevisions revisions={revisions} />
        </div>
      )}
    </>
  );
}

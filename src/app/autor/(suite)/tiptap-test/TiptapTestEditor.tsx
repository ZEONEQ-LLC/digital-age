"use client";

import { useMemo, useRef, useState } from "react";
import {
  EditorContent,
  EditorContext,
  useEditor,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CharacterCount } from "@tiptap/extension-character-count";

// --- UI Primitives ---
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";

// --- Tiptap Node SCSS ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Vendor-Toolbar-Buttons (native Tiptap-Marks) ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import { ColorHighlightPopover } from "@/components/tiptap-ui/color-highlight-popover";
import type { HighlightColor } from "@/components/tiptap-ui/color-highlight-button/use-color-highlight";
import { LinkPopover } from "@/components/tiptap-ui/link-popover";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";

// --- Icons ---
import { SunIcon } from "@/components/tiptap-icons/sun-icon";
import { MoonStarIcon } from "@/components/tiptap-icons/moon-star-icon";

// --- Sandbox-Eigene Module ---
import { MAX_FILE_SIZE } from "@/lib/tiptap-utils";
import { uploadTiptapTestImage } from "@/lib/tiptap-test-upload";
import { StatBoxBlock, DaDividerBlock } from "./customBlocks";
import {
  tiptapDocToBlocks,
  serializeAbstractDoc,
} from "./serializer";

// --- Wiederverwendete Komponenten ---
import InternalArticleAutocomplete from "@/components/editor/InternalArticleAutocomplete";
import ArticleBody from "@/components/ArticleBody";
import BlockReader from "@/components/BlockReader";
import InlineText from "@/components/InlineText";

// --- Block-Document-Typen ---
import {
  BLOCK_SCHEMA_VERSION,
  type Block,
  type BlockDocument,
  type Source,
} from "@/types/blocks";
import type { ArticleSearchResult } from "@/lib/articleSearchActions";

// --- Polish-Overrides ---
import "./tiptap-test.css";

// === Brand-Highlight-Farben =========================================
// Identisch zu den Farben aus dem alten Sandbox-Stand: nur diese zwei
// Werte erkennt der Serializer und übersetzt sie in {{g}} / {{o}}.
const HIGHLIGHT_GREEN_HEX = "#32ff7e";
const HIGHLIGHT_ORANGE_HEX = "#ff8c42";
const BRAND_HIGHLIGHT_COLORS: HighlightColor[] = [
  {
    label: "digital-age Green",
    value: HIGHLIGHT_GREEN_HEX,
    colorValue: HIGHLIGHT_GREEN_HEX,
    border: "#28cc66",
  },
  {
    label: "digital-age Orange",
    value: HIGHLIGHT_ORANGE_HEX,
    colorValue: HIGHLIGHT_ORANGE_HEX,
    border: "#cc7035",
  },
];

const DISCLAIMER_TEMPLATES = {
  de: {
    text: "AI war beteiligt. Verantwortung übernehmen wir.",
    linkText: "So machen wir das",
    linkUrl: "/ki-transparenz",
  },
  en: {
    text: "AI contributed. The responsibility stays with us.",
    linkText: "How we handle it",
    linkUrl: "/ki-transparenz",
  },
};

type DisclaimerState = {
  text: string;
  linkText: string;
  linkUrl: string;
} | null;

type InternalCard = {
  articleSlug: string;
  cachedTitle: string;
  cachedCoverUrl?: string;
  cachedExcerpt?: string;
};

const blockId = (() => {
  let i = 0;
  return () => `bl-${Date.now()}-${(i++).toString(36)}`;
})();

async function tiptapImageUploadAdapter(
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  onProgress?.({ progress: 0 });
  if (abortSignal?.aborted) throw new Error("Upload abgebrochen.");
  const formData = new FormData();
  formData.append("file", file);
  const { url } = await uploadTiptapTestImage(formData);
  onProgress?.({ progress: 100 });
  return url;
}

// === Image-BubbleMenu (übernommen aus PR #91) ========================
type EditorLike = {
  commands: { updateAttributes: (name: string, attrs: Record<string, unknown>) => boolean };
  getAttributes: (name: string) => Record<string, unknown>;
};

function ImageBubbleMenu({ editor }: { editor: EditorLike }) {
  const attrs = editor.getAttributes("image");
  const align = (attrs.align as string) ?? "center";
  const width = (attrs.width as string) ?? "medium";
  const alt = (attrs.alt as string) ?? "";
  const update = (next: Record<string, unknown>) => editor.commands.updateAttributes("image", next);
  const btn = (active: boolean): React.CSSProperties => ({
    background: active ? "var(--da-green, #32ff7e)" : "transparent",
    color: active ? "#1c1c1e" : "var(--da-text, #fff)",
    border: "1px solid var(--da-border, rgba(255,255,255,0.2))",
    borderRadius: 4,
    padding: "4px 8px",
    fontSize: 12,
    cursor: "pointer",
  });
  return (
    <div style={{ display: "flex", gap: 8, padding: 8, background: "var(--da-card, #1c1c1e)", border: "1px solid var(--da-border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", alignItems: "center", flexWrap: "wrap", maxWidth: 480 }}>
      {(["left", "center", "right"] as const).map((a) => (
        <button key={a} type="button" onClick={() => update({ align: a })} style={btn(align === a)} aria-label={`Align ${a}`}>
          {a === "left" ? "⟸" : a === "center" ? "⇔" : "⟹"}
        </button>
      ))}
      <select value={width} onChange={(e) => update({ width: e.target.value })} style={{ background: "transparent", color: "var(--da-text)", border: "1px solid var(--da-border)", borderRadius: 4, padding: "4px 6px", fontSize: 12 }}>
        <option value="small">Klein</option>
        <option value="medium">Normal</option>
        <option value="large">Gross</option>
        <option value="full">Voll</option>
      </select>
      <input type="text" value={alt} onChange={(e) => update({ alt: e.target.value })} placeholder="Alt-Text…" style={{ flex: 1, minWidth: 140, background: "transparent", color: "var(--da-text)", border: "1px solid var(--da-border)", borderRadius: 4, padding: "4px 6px", fontSize: 12 }} />
    </div>
  );
}

// === Disclaimer-Editor (Footer-Zone) =================================
function DisclaimerEditor({
  value,
  onChange,
}: {
  value: DisclaimerState;
  onChange: (next: DisclaimerState) => void;
}) {
  const labelStyle: React.CSSProperties = {
    color: "var(--da-faint)",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "var(--da-font-mono)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    margin: "12px 0 5px",
    display: "block",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--da-darker)",
    color: "var(--da-text)",
    border: "1px solid var(--da-border)",
    borderRadius: 4,
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
  };
  const btnStyle: React.CSSProperties = {
    background: "transparent",
    border: "1px solid var(--da-border, rgba(255,255,255,0.18))",
    color: "var(--da-text, rgba(255,255,255,0.78))",
    borderRadius: 4,
    padding: "4px 10px",
    fontSize: 12,
    fontFamily: "inherit",
    cursor: "pointer",
  };

  if (!value) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, border: "1px dashed var(--da-border)", borderRadius: 6 }}>
        <span style={{ color: "var(--da-muted)", fontSize: 13 }}>Kein Disclaimer gesetzt.</span>
        <button type="button" onClick={() => onChange({ text: "", linkText: "", linkUrl: "" })} style={btnStyle}>
          + Disclaimer hinzufügen
        </button>
      </div>
    );
  }

  const applyTemplate = (lang: "de" | "en") => {
    const tpl = DISCLAIMER_TEMPLATES[lang];
    onChange({ text: tpl.text, linkText: tpl.linkText, linkUrl: tpl.linkUrl });
  };

  return (
    <div style={{ border: "1px solid var(--da-orange)", background: "rgba(255,140,66,0.04)", borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ color: "var(--da-orange)", fontSize: 11, fontFamily: "var(--da-font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
          Disclaimer
        </span>
        <button type="button" onClick={() => onChange(null)} style={{ ...btnStyle, borderColor: "var(--da-red, #ff5c5c)", color: "var(--da-red, #ff5c5c)" }}>Entfernen</button>
      </div>
      <label style={{ ...labelStyle, marginTop: 0 }}>Vorlage</label>
      <select
        style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v === "de" || v === "en") applyTemplate(v);
          e.target.value = "";
        }}
      >
        <option value="">— Vorlage wählen —</option>
        <option value="de">AI-Transparenz-Hinweis (DE)</option>
        <option value="en">AI-Transparency-Disclaimer (EN)</option>
      </select>
      <label style={labelStyle}>Text</label>
      <textarea
        rows={2}
        style={{ ...inputStyle, fontSize: 14, resize: "vertical" }}
        value={value.text}
        placeholder="z.B. 'AI war beteiligt. Verantwortung übernehmen wir.'"
        onChange={(e) => onChange({ ...value, text: e.target.value })}
      />
      <label style={labelStyle}>Link-Text (optional)</label>
      <input
        style={inputStyle}
        value={value.linkText}
        placeholder="z.B. 'So machen wir das'"
        onChange={(e) => onChange({ ...value, linkText: e.target.value })}
      />
      <label style={labelStyle}>Link-URL (optional)</label>
      <input
        style={inputStyle}
        value={value.linkUrl}
        placeholder="https://… oder /seite"
        onChange={(e) => onChange({ ...value, linkUrl: e.target.value })}
      />
    </div>
  );
}

// === Related-Articles-Editor (Footer-Zone) ============================
function RelatedArticlesEditor({
  items,
  onChange,
  onOpenPicker,
}: {
  items: InternalCard[];
  onChange: (next: InternalCard[]) => void;
  onOpenPicker: () => void;
}) {
  const btnStyle: React.CSSProperties = {
    background: "transparent",
    border: "1px solid var(--da-border, rgba(255,255,255,0.18))",
    color: "var(--da-text, rgba(255,255,255,0.78))",
    borderRadius: 4,
    padding: "4px 10px",
    fontSize: 12,
    fontFamily: "inherit",
    cursor: "pointer",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.length === 0 && (
        <div style={{ padding: 14, border: "1px dashed var(--da-border)", borderRadius: 6, color: "var(--da-muted)", fontSize: 13 }}>
          Keine verwandten Artikel.
        </div>
      )}
      {items.map((it, i) => (
        <div key={i} style={{ background: "var(--da-darker)", border: "1px solid var(--da-border)", borderRadius: 6, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "var(--da-text)", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {it.cachedTitle || "(ohne Titel)"}
            </div>
            <div style={{ color: "var(--da-muted-soft)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
              /artikel/{it.articleSlug}
            </div>
          </div>
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ ...btnStyle, borderColor: "var(--da-red, #ff5c5c)", color: "var(--da-red, #ff5c5c)", flex: "0 0 auto" }}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={onOpenPicker} style={{ ...btnStyle, alignSelf: "flex-start" }}>
        + Artikel hinzufügen
      </button>
    </div>
  );
}

// === Haupt-Editor ====================================================
export default function TiptapTestEditor() {
  const bodyToolbarRef = useRef<HTMLDivElement>(null);
  const abstractToolbarRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("ki-business");
  const [subcategory, setSubcategory] = useState("");
  const [tags, setTags] = useState("");
  const [locale, setLocale] = useState<"de-CH" | "en">("de-CH");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [publishedAtDate, setPublishedAtDate] = useState("");
  const [disclaimer, setDisclaimer] = useState<DisclaimerState>(null);
  const [relatedArticles, setRelatedArticles] = useState<InternalCard[]>([]);
  const [sources] = useState<Source[]>([]);

  const [activeTab, setActiveTab] = useState<"content" | "preview" | "seo" | "revisions">("content");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerHandler, setPickerHandler] = useState<((r: ArticleSearchResult) => void) | null>(null);

  const requestArticlePick = (onPick: (r: ArticleSearchResult) => void) => {
    setPickerHandler(() => onPick);
    setPickerOpen(true);
  };

  // === Abstract-Editor: Tiptap inline-only, 5 Marks ==================
  // StarterKit mit allen Block-Nodes deaktiviert: nur Document/Paragraph/
  // Text bleiben + Bold/Italic/Link. Highlight separat. Keine Heading,
  // Listen, Blockquote, CodeBlock, HR. Strike+Code-Mark auch raus.
  const abstractEditor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Abstract-Editor",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        code: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: "Abstract / Lead-Paragraph" }),
    ],
  });

  // === Body-Editor: voller Tiptap mit allen nativen Marks ============
  const bodyEditor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Body-Editor",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      Placeholder.configure({ placeholder: "Schreib hier los…" }),
      CharacterCount,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "da-tiptap-image" },
      }).extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            align: {
              default: "center",
              renderHTML: (a: { align?: string }) => ({ "data-align": a.align ?? "center" }),
              parseHTML: (el: HTMLElement) => el.getAttribute("data-align") ?? "center",
            },
            width: {
              default: "medium",
              renderHTML: (a: { width?: string }) => ({ "data-width": a.width ?? "medium" }),
              parseHTML: (el: HTMLElement) => el.getAttribute("data-width") ?? "medium",
            },
          };
        },
      }),
      ImageUploadNode.configure({
        accept: "image/jpeg,image/png,image/webp,image/gif",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: tiptapImageUploadAdapter,
        onError: (e) => console.error("Upload fehlgeschlagen:", e),
      }),
      StatBoxBlock,
      DaDividerBlock,
    ],
  });

  // === Serializer ====================================================
  const blockDocument: BlockDocument = useMemo(() => {
    const bodyBlocks: Block[] = bodyEditor
      ? tiptapDocToBlocks(
          bodyEditor.getJSON() as { content?: Parameters<typeof tiptapDocToBlocks>[0]["content"] },
        )
      : [];
    const footerBlocks: Block[] = [];
    if (disclaimer) {
      footerBlocks.push({
        id: blockId(),
        type: "disclaimer",
        text: disclaimer.text,
        linkText: disclaimer.linkText || undefined,
        linkUrl: disclaimer.linkUrl || undefined,
      });
    }
    for (const c of relatedArticles) {
      footerBlocks.push({
        id: blockId(),
        type: "internalArticleCard",
        articleSlug: c.articleSlug,
        cachedTitle: c.cachedTitle,
        cachedCoverUrl: c.cachedCoverUrl,
        cachedExcerpt: c.cachedExcerpt,
      });
    }
    return {
      version: BLOCK_SCHEMA_VERSION,
      blocks: [...bodyBlocks, ...footerBlocks],
      sources,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyEditor, bodyEditor?.state?.doc, disclaimer, relatedArticles, sources]);

  // Abstract als Token-String (für InlineText in der Vorschau).
  const excerptSerialized = useMemo(() => {
    if (!abstractEditor) return "";
    return serializeAbstractDoc(
      abstractEditor.getJSON() as { content?: Parameters<typeof serializeAbstractDoc>[0]["content"] },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abstractEditor, abstractEditor?.state?.doc]);

  return (
    <div
      className={`tiptap-test-wrapper theme-${theme}`}
      style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 96 }}
    >
      {/* ===== Header + Theme-Toggle ===== */}
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <h1 style={{ fontFamily: "var(--da-font-display)", fontSize: 28, fontWeight: 700, color: "var(--da-text)", margin: 0 }}>
            Tiptap Test-Sandbox · WYSIWYG-Editor
          </h1>
          <p style={{ color: "var(--da-muted)", fontSize: 14, margin: 0 }}>
            4 Zonen, voll-WYSIWYG (native Tiptap-Marks). Token (Bold, Highlight, …) erscheinen NUR im Serializer-Output —
            niemals im Editor. Vorschau via <code style={{ fontFamily: "var(--da-font-mono)" }}>BlockReader</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          style={{ flex: "0 0 auto", background: "var(--da-card)", border: "1px solid var(--da-border)", color: "var(--da-text)", borderRadius: 8, padding: "8px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}
        >
          {theme === "dark" ? <SunIcon style={{ width: 16, height: 16 }} /> : <MoonStarIcon style={{ width: 16, height: 16 }} />}
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </header>

      {/* ===== Tabs ===== */}
      <div role="tablist" style={{ display: "flex", borderBottom: "1px solid var(--da-border)", padding: "0 4px" }}>
        {([
          { id: "content", label: "Inhalt" },
          { id: "preview", label: "Vorschau" },
          { id: "seo", label: "SEO & Meta (Stub)" },
          { id: "revisions", label: "Revisionen (Stub)" },
        ] as const).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: "transparent",
              border: 0,
              padding: "10px 14px",
              cursor: "pointer",
              color: activeTab === t.id ? "var(--da-green, #32ff7e)" : "var(--da-muted)",
              fontWeight: 600,
              fontSize: 13,
              borderBottom: activeTab === t.id ? "2px solid var(--da-green, #32ff7e)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "content" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 28, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* ===== ZONE 1 — Titel ===== */}
            <div className="tiptap-test-editor-card" style={{ background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: 8, padding: 24 }}>
              <span style={{ display: "block", color: "var(--da-faint)", fontSize: 10, fontFamily: "var(--da-font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Zone 1 · Titel</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Artikel-Titel"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--da-text)",
                  fontSize: 32,
                  fontWeight: 700,
                  fontFamily: "var(--da-font-display)",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                  padding: 0,
                }}
              />
            </div>

            {/* ===== ZONE 2 — Abstract (Tiptap inline-only) ===== */}
            <div className="tiptap-test-editor-card" style={{ background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: 8 }}>
              <span style={{ display: "block", color: "var(--da-faint)", fontSize: 10, fontFamily: "var(--da-font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", padding: "12px 16px 0" }}>Zone 2 · Abstract</span>
              <EditorContext.Provider value={{ editor: abstractEditor }}>
                <Toolbar ref={abstractToolbarRef}>
                  <Spacer />
                  <ToolbarGroup>
                    <MarkButton type="bold" />
                    <MarkButton type="italic" />
                    <LinkPopover />
                    <ColorHighlightPopover colors={BRAND_HIGHLIGHT_COLORS} />
                  </ToolbarGroup>
                  <Spacer />
                </Toolbar>
                <div className="tiptap-test-editor-body" style={{ background: "var(--da-darker)", color: "var(--da-muted)", padding: 24, fontSize: 16, fontStyle: "italic", lineHeight: 1.6, minHeight: 120 }}>
                  <EditorContent editor={abstractEditor} role="presentation" />
                </div>
              </EditorContext.Provider>
            </div>

            {/* ===== Meta-Row ===== */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: "Kategorie", el: (
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={metaInputStyle()}>
                    <option value="ki-business">KI & Business</option>
                    <option value="future-tech">Future Tech</option>
                  </select>
                ) },
                { label: "Subkategorie", el: <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder='z.B. "AI in Banking"' style={metaInputStyle()} /> },
                { label: "Tags", el: <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma,separated" style={metaInputStyle()} /> },
                { label: "Sprache", el: (
                  <select value={locale} onChange={(e) => setLocale(e.target.value as "de-CH" | "en")} style={metaInputStyle()}>
                    <option value="de-CH">Deutsch (CH)</option>
                    <option value="en">Englisch</option>
                  </select>
                ) },
              ].map((f) => (
                <div key={f.label}>
                  <label style={{ display: "block", color: "var(--da-faint)", fontSize: 10, fontWeight: 700, fontFamily: "var(--da-font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 5 }}>{f.label}</label>
                  {f.el}
                </div>
              ))}
            </div>

            {/* ===== ZONE 3 — Body (voll-WYSIWYG Tiptap) ===== */}
            <div className="tiptap-test-editor-card" style={{ background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: 8 }}>
              <span style={{ display: "block", color: "var(--da-faint)", fontSize: 10, fontFamily: "var(--da-font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", padding: "12px 16px 0" }}>Zone 3 · Body</span>
              <EditorContext.Provider value={{ editor: bodyEditor }}>
                <Toolbar ref={bodyToolbarRef}>
                  <Spacer />
                  <ToolbarGroup>
                    <UndoRedoButton action="undo" />
                    <UndoRedoButton action="redo" />
                  </ToolbarGroup>
                  <ToolbarSeparator />
                  <ToolbarGroup>
                    <HeadingDropdownMenu modal={false} levels={[2, 3, 4]} />
                    <ListDropdownMenu modal={false} types={["bulletList", "orderedList"]} />
                    <BlockquoteButton />
                    <CodeBlockButton />
                  </ToolbarGroup>
                  <ToolbarSeparator />
                  <ToolbarGroup>
                    <MarkButton type="bold" />
                    <MarkButton type="italic" />
                    <MarkButton type="strike" />
                    <MarkButton type="code" />
                    <ColorHighlightPopover colors={BRAND_HIGHLIGHT_COLORS} />
                    <LinkPopover />
                  </ToolbarGroup>
                  <ToolbarSeparator />
                  <ToolbarGroup>
                    <MarkButton type="superscript" />
                    <MarkButton type="subscript" />
                  </ToolbarGroup>
                  <ToolbarSeparator />
                  <ToolbarGroup>
                    <TextAlignButton align="left" />
                    <TextAlignButton align="center" />
                    <TextAlignButton align="right" />
                    <TextAlignButton align="justify" />
                  </ToolbarGroup>
                  <ToolbarSeparator />
                  <ToolbarGroup>
                    <ImageUploadButton text="Bild" />
                    <button
                      type="button"
                      onClick={() => bodyEditor?.chain().focus().setStatBox().run()}
                      style={{
                        background: "transparent",
                        border: "1px solid var(--da-border, rgba(255,255,255,0.18))",
                        color: "var(--da-text, rgba(255,255,255,0.78))",
                        borderRadius: 4,
                        padding: "4px 10px",
                        fontSize: 12,
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                      title="Statistik-Box einfügen"
                    >
                      ▦ Statbox
                    </button>
                  </ToolbarGroup>
                  <Spacer />
                </Toolbar>
                <div className="tiptap-test-editor-body" style={{ background: "var(--da-darker)", color: "var(--da-text)", padding: 24 }}>
                  <EditorContent editor={bodyEditor} role="presentation" />
                  {bodyEditor && (
                    <BubbleMenu
                      editor={bodyEditor}
                      options={{ placement: "top" }}
                      shouldShow={({ editor: ed }) => ed.isActive("image")}
                    >
                      <ImageBubbleMenu editor={bodyEditor} />
                    </BubbleMenu>
                  )}
                </div>
              </EditorContext.Provider>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, padding: "8px 16px", borderTop: "1px solid var(--da-border)", fontFamily: "var(--da-font-mono)", fontSize: 12, color: "var(--da-muted)" }}>
                <span>Wörter: {bodyEditor?.storage.characterCount?.words?.() ?? 0}</span>
              </div>
            </div>

            {/* ===== ZONE 4 — Footer ===== */}
            <div style={{ background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: 8, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <span style={{ display: "block", color: "var(--da-faint)", fontSize: 10, fontFamily: "var(--da-font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Zone 4 · Footer-Elemente</span>
                <p style={{ color: "var(--da-muted)", fontSize: 12, margin: 0 }}>
                  Diese Blöcke werden am Artikel-Ende gerendert — Reihenfolge: Disclaimer, dann Verwandte Artikel.
                </p>
              </div>
              <DisclaimerEditor value={disclaimer} onChange={setDisclaimer} />
              <RelatedArticlesEditor
                items={relatedArticles}
                onChange={setRelatedArticles}
                onOpenPicker={() => {
                  requestArticlePick((r) => {
                    setRelatedArticles((prev) => [
                      ...prev,
                      {
                        articleSlug: r.slug,
                        cachedTitle: r.title,
                        cachedCoverUrl: r.cover_image_url ?? undefined,
                        cachedExcerpt: r.excerpt ?? undefined,
                      },
                    ]);
                  });
                }}
              />
            </div>
          </div>

          {/* ===== Sidebar ===== */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 24 }}>
            <div style={{ background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: 8, padding: 16 }}>
              <span style={{ display: "block", color: "var(--da-faint)", fontSize: 10, fontWeight: 700, fontFamily: "var(--da-font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Cover-Bild</span>
              <input
                type="text"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="URL einfügen (Stub)"
                style={metaInputStyle()}
              />
              {coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImageUrl} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 6, marginTop: 8 }} />
              )}
            </div>
            <div style={{ background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: 8, padding: 16 }}>
              <span style={{ display: "block", color: "var(--da-faint)", fontSize: 10, fontWeight: 700, fontFamily: "var(--da-font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Veröffentlichungsdatum</span>
              <input
                type="date"
                value={publishedAtDate}
                onChange={(e) => setPublishedAtDate(e.target.value)}
                style={{ ...metaInputStyle(), colorScheme: "dark" }}
              />
            </div>
            <div style={{ background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: 8, padding: 16 }}>
              <span style={{ display: "block", color: "var(--da-faint)", fontSize: 10, fontWeight: 700, fontFamily: "var(--da-font-mono)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Featured (Stub)</span>
              <p style={{ color: "var(--da-muted)", fontSize: 11, margin: "6px 0 0", lineHeight: 1.4 }}>
                Featured/Hero-Toggles werden in der Sandbox nicht emuliert.
              </p>
            </div>
          </aside>
        </div>
      )}

      {activeTab === "preview" && (
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
          <div style={{ color: "var(--da-faint)", fontFamily: "var(--da-font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
            Vorschau · So sieht der Artikel auf der Public-Page aus
          </div>
          {coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImageUrl} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 8, marginBottom: 24 }} />
          )}
          <h1 style={{ color: "var(--da-text)", fontFamily: "var(--da-font-display)", fontSize: 36, fontWeight: 800, lineHeight: 1.15, marginBottom: 12 }}>
            {title || "(Ohne Titel)"}
          </h1>
          {excerptSerialized && (
            <p style={{ color: "var(--da-muted)", fontSize: 18, lineHeight: 1.55, marginBottom: 28, fontStyle: "italic" }}>
              <InlineText content={excerptSerialized} sources={sources} />
            </p>
          )}
          <ArticleBody>
            <BlockReader doc={blockDocument} />
          </ArticleBody>
          {tags.trim() && (
            <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                <span key={tag} style={{ background: "var(--da-card)", border: "1px solid var(--da-border)", color: "var(--da-text-strong)", fontSize: 12, padding: "4px 10px", borderRadius: 999, fontFamily: "var(--da-font-mono)" }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "seo" && (
        <div style={{ maxWidth: 720, color: "var(--da-muted)", fontSize: 14 }}>
          SEO-Panel ist in der Sandbox nicht emuliert (Stub).
        </div>
      )}
      {activeTab === "revisions" && (
        <div style={{ maxWidth: 720, color: "var(--da-muted)", fontSize: 14 }}>
          Revisionen-Panel ist in der Sandbox nicht emuliert (Stub).
        </div>
      )}

      <InternalArticleAutocomplete
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPickerHandler(null);
        }}
        onPick={(r) => {
          pickerHandler?.(r);
          setPickerOpen(false);
          setPickerHandler(null);
        }}
      />
    </div>
  );
}

function metaInputStyle(): React.CSSProperties {
  return {
    width: "100%",
    background: "var(--da-card)",
    border: "1px solid var(--da-border)",
    borderRadius: 4,
    color: "var(--da-text)",
    padding: "8px 12px",
    fontSize: 13,
    fontFamily: "inherit",
  };
}

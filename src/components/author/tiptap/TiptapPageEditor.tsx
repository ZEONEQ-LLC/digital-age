"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import {
  EditorContent,
  EditorContext,
  useEditor,
  type Editor,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";

import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { CharacterCount } from "@tiptap/extension-character-count";

import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";

import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { ColorHighlightPopover } from "@/components/tiptap-ui/color-highlight-popover";
import type { HighlightColor } from "@/components/tiptap-ui/color-highlight-button/use-color-highlight";
import { LinkPopover } from "@/components/tiptap-ui/link-popover";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";

import { MAX_FILE_SIZE } from "@/lib/tiptap-utils";
import { uploadArticleImage } from "@/lib/storageActions";

// Bestand-Schutz: SourceRef + Internal-Link + FontSize-Marks werden im
// Toolbar nicht angeboten (Seiten haben kein Quellen-System und keine
// Internal-Links/Font-Size-Mark im Bestand), aber als Extensions
// registriert. Ohne Registrierung filtert Tiptap unbekannte Inline-
// Nodes/Marks beim setContent-Mount still raus — sollte je ein solches
// Token in eine Seite geraten, würde es lossy verschluckt. Pattern aus
// PR #100 (Abstract-Editor) übernommen.
import { SourceRefInline } from "./customBlocks";
import { InternalLinkMark, FontSizeMark } from "./passthroughMarks";

import type { TiptapDoc } from "@/lib/tiptap/types";

import "./tiptap-editor.css";

const HIGHLIGHT_GREEN_HEX = "#32ff7e";
const HIGHLIGHT_ORANGE_HEX = "#ff8c42";
const BRAND_HIGHLIGHT_COLORS: HighlightColor[] = [
  { label: "digital-age Green", value: HIGHLIGHT_GREEN_HEX, colorValue: HIGHLIGHT_GREEN_HEX, border: "#28cc66" },
  { label: "digital-age Orange", value: HIGHLIGHT_ORANGE_HEX, colorValue: HIGHLIGHT_ORANGE_HEX, border: "#cc7035" },
];

export type TiptapPageEditorHandle = {
  getJSON: () => TiptapDoc;
  isEmpty: () => boolean;
  setContent: (json: TiptapDoc) => void;
};

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

type Props = {
  // Wird vom uploadArticleImage-Adapter als Pfad-Präfix genutzt
  // ({article_id}/{filename} im Storage). pages.id ist UUID, deckt
  // dasselbe Format ab.
  pageId: string;
  initialContent: TiptapDoc;
  onEditorReady?: (editor: Editor) => void;
};

// Schlanke Tiptap-Variante für statische Seiten (Etappe A2):
// - Bestand nutzt nur heading/paragraph/list/image — Toolbar deckt
//   genau das + Inline-Marks (Bold/Italic/Strike/Code, Highlight,
//   Link, TextAlign) ab.
// - Kein Source-Picker, kein StatBox/Divider-Button — Seiten
//   verwenden diese Block-Typen nicht.
// - Kein Quote/Code-Block-Button (Bestand 0; bei Bedarf in einer
//   Folge-PR ergänzbar).
// - Pass-Through-Extensions SourceRefInline/InternalLinkMark/
//   FontSizeMark sind registriert, aber nicht im Toolbar — Bestand-
//   Schutz gegen lossy parse.
const TiptapPageEditor = forwardRef<TiptapPageEditorHandle, Props>(
  function TiptapPageEditor({ pageId, initialContent, onEditorReady }, ref) {
    const toolbarRef = useRef<HTMLDivElement>(null);

    const uploadAdapter = async (file: File, onProgress?: (e: { progress: number }) => void, abortSignal?: AbortSignal): Promise<string> => {
      onProgress?.({ progress: 0 });
      if (abortSignal?.aborted) throw new Error("Upload abgebrochen.");
      const formData = new FormData();
      formData.append("file", file);
      // uploadArticleImage erwartet eine articleId-Pfad-Komponente; pages.id
      // (UUID) ist formatgleich und kommt im Storage unter
      // articles/{pageId}/{filename} an. Bei Etappe C kann ein neutralerer
      // Storage-Wrapper folgen — out-of-scope für A2.
      const { url } = await uploadArticleImage(pageId, formData);
      onProgress?.({ progress: 100 });
      return url;
    };

    const editor = useEditor({
      immediatelyRender: false,
      editorProps: {
        attributes: {
          autocomplete: "off",
          autocorrect: "off",
          autocapitalize: "off",
          "aria-label": "Seiten-Editor",
          class: "simple-editor",
        },
      },
      extensions: [
        StarterKit.configure({
          horizontalRule: false,
          heading: { levels: [2, 3, 4] },
          link: { openOnClick: false, enableClickSelection: true },
        }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Highlight.configure({ multicolor: true }),
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
          upload: uploadAdapter,
          onError: (e) => console.error("Upload fehlgeschlagen:", e),
        }),
        // Pass-Through (Bestand-Schutz, kein Toolbar-Button)
        SourceRefInline,
        InternalLinkMark,
        FontSizeMark,
      ],
      content: initialContent,
      onCreate({ editor: ed }) {
        onEditorReady?.(ed);
      },
    });

    useImperativeHandle(ref, () => ({
      getJSON: () => (editor?.getJSON() ?? { type: "doc", content: [] }) as TiptapDoc,
      isEmpty: () => {
        if (!editor) return true;
        const j = editor.getJSON();
        if (!j.content || j.content.length === 0) return true;
        if (j.content.length === 1) {
          const c = j.content[0];
          if (c.type === "paragraph" && (!c.content || c.content.length === 0)) return true;
        }
        return false;
      },
      setContent: (json) => {
        editor?.commands.setContent(json as Parameters<typeof editor.commands.setContent>[0], { emitUpdate: true });
      },
    }), [editor]);

    return (
      <EditorContext.Provider value={{ editor }}>
        <div className="da-tiptap-editor">
          <Toolbar ref={toolbarRef}>
            <Spacer />
            <ToolbarGroup>
              <UndoRedoButton action="undo" />
              <UndoRedoButton action="redo" />
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <HeadingDropdownMenu modal={false} levels={[2, 3, 4]} />
              <ListDropdownMenu modal={false} types={["bulletList", "orderedList"]} />
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
              <TextAlignButton align="left" />
              <TextAlignButton align="center" />
              <TextAlignButton align="right" />
              <TextAlignButton align="justify" />
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <ImageUploadButton text="Bild" />
            </ToolbarGroup>
            <Spacer />
          </Toolbar>
          <div
            className="a-edit-tiptap-resizable"
            style={{ background: "var(--da-darker)", color: "var(--da-text)", padding: 24 }}
          >
            <EditorContent editor={editor} role="presentation" />
            {editor && (
              <BubbleMenu editor={editor} options={{ placement: "top" }} shouldShow={({ editor: ed }) => ed.isActive("image")}>
                <ImageBubbleMenu editor={editor} />
              </BubbleMenu>
            )}
          </div>
          <div className="a-edit-body-counter">
            <span>Wörter: {editor?.storage.characterCount?.words?.() ?? 0}</span>
          </div>
        </div>
      </EditorContext.Provider>
    );
  },
);

export default TiptapPageEditor;

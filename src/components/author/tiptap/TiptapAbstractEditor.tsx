"use client";

import { forwardRef, useImperativeHandle } from "react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Highlight } from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";

import { Toolbar, ToolbarGroup, ToolbarSeparator } from "@/components/tiptap-ui-primitive/toolbar";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { ColorHighlightPopover } from "@/components/tiptap-ui/color-highlight-popover";
import type { HighlightColor } from "@/components/tiptap-ui/color-highlight-button/use-color-highlight";
import { LinkPopover } from "@/components/tiptap-ui/link-popover";
import { MarkButton } from "@/components/tiptap-ui/mark-button";

import { SourceRefInline } from "./customBlocks";
import { InternalLinkMark, FontSizeMark } from "./passthroughMarks";
import type { TiptapDoc } from "@/lib/tiptap/types";

const HIGHLIGHT_GREEN_HEX = "#32ff7e";
const HIGHLIGHT_ORANGE_HEX = "#ff8c42";
const BRAND_HIGHLIGHT_COLORS: HighlightColor[] = [
  { label: "digital-age Green", value: HIGHLIGHT_GREEN_HEX, colorValue: HIGHLIGHT_GREEN_HEX, border: "#28cc66" },
  { label: "digital-age Orange", value: HIGHLIGHT_ORANGE_HEX, colorValue: HIGHLIGHT_ORANGE_HEX, border: "#cc7035" },
];

export type TiptapAbstractEditorHandle = {
  getJSON: () => TiptapDoc;
  // Vom AI-Abstract-Pfad genutzt: nach dem LLM-Call ersetzen wir den
  // Editor-Inhalt durch den frisch generierten Abstract.
  setContent: (json: TiptapDoc) => void;
};

type Props = {
  initialContent: TiptapDoc;
  // Toolbar-Button "AI-Abstract generieren". Logik (Body-Text holen,
  // callLLM, setContent) sitzt im EditorClient — der Button reicht den
  // Klick nur weiter. `aiBusy` + `aiDisabledReason` kommen vom Parent
  // damit der Loading-Spinner und der Tooltip pro Artikel-State stimmen.
  onGenerateAbstract?: () => void;
  aiBusy?: boolean;
  aiDisabledReason?: string | null;
};

// Inline-only Tiptap-Editor für den Lead-Absatz (`articles.excerpt`).
// Toolbar: Bold + externer Link + Highlight (3 Buttons). Italic bewusst
// nicht in der Toolbar, weil der Public-Render den Lead komplett in
// italic setzt — ein Toggle wäre nutzlos.
//
// Extensions registrieren zusätzlich (ohne Toolbar): SourceRefInline,
// InternalLinkMark, FontSizeMark — Bestand-Token-Schutz gegen lossy
// parse beim setContent-Mount.
const TiptapAbstractEditor = forwardRef<TiptapAbstractEditorHandle, Props>(
  function TiptapAbstractEditor(
    { initialContent, onGenerateAbstract, aiBusy, aiDisabledReason },
    ref,
  ) {
    const editor = useEditor({
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
          link: { openOnClick: false, enableClickSelection: true },
        }),
        Highlight.configure({ multicolor: true }),
        Placeholder.configure({ placeholder: "Abstract / Lead-Paragraph" }),
        SourceRefInline,
        InternalLinkMark,
        FontSizeMark,
      ],
      content: initialContent,
    });

    useImperativeHandle(
      ref,
      () => ({
        getJSON: () =>
          (editor?.getJSON() ?? { type: "doc", content: [] }) as TiptapDoc,
        setContent: (json) => {
          editor?.commands.setContent(
            json as Parameters<typeof editor.commands.setContent>[0],
            { emitUpdate: true },
          );
        },
      }),
      [editor],
    );

    return (
      <EditorContext.Provider value={{ editor }}>
        {/* `da-tiptap-editor` wrapper aktiviert die Dark-Theme-Overrides
            aus tiptap-editor.css (Toolbar-Hintergrund, Icon-Farben,
            Selection, Link-Farbe). Body-Editor benutzt denselben Wrapper.
            Heading-/Code-/Image-Selektoren sind im Abstract-Editor
            ungenutzt (keine entsprechenden Nodes) und damit unschädlich. */}
        <div className="da-tiptap-editor">
          <Toolbar>
            <Spacer />
            <ToolbarGroup>
              <MarkButton type="bold" />
              <LinkPopover />
              <ColorHighlightPopover colors={BRAND_HIGHLIGHT_COLORS} />
            </ToolbarGroup>
            {onGenerateAbstract && (
              <>
                <ToolbarSeparator />
                <ToolbarGroup>
                  <Button
                    type="button"
                    variant="ghost"
                    tooltip={aiDisabledReason ?? "AI-Abstract generieren"}
                    aria-label="AI-Abstract generieren"
                    onClick={onGenerateAbstract}
                    disabled={!!aiBusy || !!aiDisabledReason}
                  >
                    <span
                      className="tiptap-button-icon"
                      style={{
                        fontFamily: "var(--da-font-mono)",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 18,
                        height: 18,
                        letterSpacing: "-0.05em",
                      }}
                    >
                      {aiBusy ? "…" : "AI"}
                    </span>
                  </Button>
                </ToolbarGroup>
              </>
            )}
            <Spacer />
          </Toolbar>
          <div className="a-edit-abstract-body">
            <EditorContent editor={editor} role="presentation" />
          </div>
        </div>
      </EditorContext.Provider>
    );
  },
);

export default TiptapAbstractEditor;

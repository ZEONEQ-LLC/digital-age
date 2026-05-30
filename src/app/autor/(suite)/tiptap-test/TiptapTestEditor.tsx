"use client";

import { useRef, useState } from "react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { CharacterCount } from "@tiptap/extension-character-count";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Selection } from "@tiptap/extensions";

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover";
import type { HighlightColor } from "@/components/tiptap-ui/color-highlight-button/use-color-highlight";
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";
import { SunIcon } from "@/components/tiptap-icons/sun-icon";
import { MoonStarIcon } from "@/components/tiptap-icons/moon-star-icon";

// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint";

// --- Lib ---
import { MAX_FILE_SIZE } from "@/lib/tiptap-utils";
import { uploadTiptapTestImage } from "@/lib/tiptap-test-upload";

// --- Polish-Overrides (scoped via .tiptap-test-wrapper) ---
import "./tiptap-test.css";

// Brand-CI Highlight-Farben — überschreibt die Default-Pastell-Palette.
const BRAND_HIGHLIGHT_COLORS: HighlightColor[] = [
  {
    label: "digital-age Green",
    value: "#32ff7e",
    colorValue: "#32ff7e",
    border: "#28cc66",
  },
  {
    label: "digital-age Orange",
    value: "#ff8c42",
    colorValue: "#ff8c42",
    border: "#cc7035",
  },
];

// Upload-Adapter zwischen ImageUploadNode (erwartet (file, onProgress, abort)
// → Promise<string>) und der Server-Action uploadTiptapTestImage (erwartet
// FormData, returnt {url}). ImageUploadNode reicht onProgress + abortSignal
// durch — wir machen einen einzigen atomaren Upload-Call ohne Progress-
// Tracking (Server-Action ist nicht streamfähig), feuern aber 0/100 ab
// damit die UI nicht hängt.
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

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
}) => (
  <>
    <Spacer />

    <ToolbarGroup>
      <UndoRedoButton action="undo" />
      <UndoRedoButton action="redo" />
    </ToolbarGroup>

    <ToolbarSeparator />

    <ToolbarGroup>
      <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
      <ListDropdownMenu
        modal={false}
        types={["bulletList", "orderedList", "taskList"]}
      />
      <BlockquoteButton />
      <CodeBlockButton />
    </ToolbarGroup>

    <ToolbarSeparator />

    <ToolbarGroup>
      <MarkButton type="bold" />
      <MarkButton type="italic" />
      <MarkButton type="strike" />
      <MarkButton type="code" />
      <MarkButton type="underline" />
      {!isMobile ? (
        <ColorHighlightPopover colors={BRAND_HIGHLIGHT_COLORS} />
      ) : (
        <ColorHighlightPopoverButton onClick={onHighlighterClick} />
      )}
      {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
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
    </ToolbarGroup>

    <Spacer />
  </>
);

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent colors={BRAND_HIGHLIGHT_COLORS} />
    ) : (
      <LinkContent />
    )}
  </>
);

export default function TiptapTestEditor() {
  const isMobile = useIsBreakpoint();
  const [mobileViewRaw, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main",
  );
  // Desktop hat keinen Mobile-Sub-View → effective immer "main".
  const mobileView = isMobile ? mobileViewRaw : "main";
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string>("");
  const [stats, setStats] = useState({ characters: 0, words: 0 });
  // Theme-Toggle: rein lokal, kein globaler .dark-Klasse am <html>, kein
  // localStorage-Persist. Page-Reload startet immer in dark.
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Tiptap-Test-Sandbox-Editor",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      Placeholder.configure({
        placeholder: "Hier kannst du Tiptap testen...",
      }),
      CharacterCount,
      ImageUploadNode.configure({
        accept: "image/jpeg,image/png,image/webp,image/gif",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: tiptapImageUploadAdapter,
        onError: (error) => console.error("Upload fehlgeschlagen:", error),
      }),
    ],
    onUpdate({ editor }) {
      setHtml(editor.getHTML());
      setStats({
        characters: editor.storage.characterCount?.characters?.() ?? 0,
        words: editor.storage.characterCount?.words?.() ?? 0,
      });
    },
  });

  return (
    <div
      className={`tiptap-test-wrapper theme-${theme}`}
      style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 96 }}
    >
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <h1
            style={{
              fontFamily: "var(--da-font-display)",
              fontSize: 28,
              fontWeight: 700,
              color: "var(--da-text)",
              margin: 0,
            }}
          >
            Tiptap Test-Sandbox
          </h1>
          <p style={{ color: "var(--da-muted)", fontSize: 14, margin: 0 }}>
            Keine Persistenz. Inhalte gehen bei Page-Reload verloren. Bilder werden zu Supabase
            Storage hochgeladen (Pfad <code style={{ fontFamily: "var(--da-font-mono)" }}>tiptap-test/…</code>).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          aria-label={theme === "dark" ? "Auf Light-Mode wechseln" : "Auf Dark-Mode wechseln"}
          title={theme === "dark" ? "Auf Light-Mode wechseln" : "Auf Dark-Mode wechseln"}
          style={{
            flex: "0 0 auto",
            background: "var(--da-card)",
            border: "1px solid var(--da-border)",
            color: "var(--da-text)",
            borderRadius: 8,
            padding: "8px 10px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
          }}
        >
          {theme === "dark" ? (
            <SunIcon style={{ width: 16, height: 16 }} />
          ) : (
            <MoonStarIcon style={{ width: 16, height: 16 }} />
          )}
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </header>

      <div
        className="tiptap-test-editor-card"
        style={{
          backgroundColor: "var(--da-card)",
          border: "1px solid var(--da-border)",
          borderRadius: 8,
        }}
      >
        <EditorContext.Provider value={{ editor }}>
          {/* Toolbar ist im Upstream-CSS bereits position:sticky top:0
              z-index:50 (data-variant="fixed"). Wir überschreiben in
              tiptap-test.css nur den Top-Offset (Navbar-Höhe) und die
              Hintergrund-Farbe. Kein zusätzlicher sticky-Wrapper hier —
              ein eigener wäre redundant und würde mit dem inneren sticky
              kollidieren. */}
          <Toolbar ref={toolbarRef}>
            {mobileView === "main" ? (
              <MainToolbarContent
                onHighlighterClick={() => setMobileView("highlighter")}
                onLinkClick={() => setMobileView("link")}
                isMobile={isMobile}
              />
            ) : (
              <MobileToolbarContent
                type={mobileView === "highlighter" ? "highlighter" : "link"}
                onBack={() => setMobileView("main")}
              />
            )}
          </Toolbar>
          <div
            className="tiptap-test-editor-body"
            style={{ background: "var(--da-darker)", color: "var(--da-text)", padding: 24 }}
          >
            <EditorContent editor={editor} role="presentation" />
          </div>
        </EditorContext.Provider>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 16,
            padding: "8px 16px",
            borderTop: "1px solid var(--da-border)",
            fontFamily: "var(--da-font-mono)",
            fontSize: 12,
            color: "var(--da-muted)",
          }}
        >
          <span>Wörter: {stats.words}</span>
          <span>Zeichen: {stats.characters}</span>
        </div>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2
          style={{
            fontFamily: "var(--da-font-display)",
            fontSize: 18,
            fontWeight: 600,
            color: "var(--da-text)",
            margin: 0,
          }}
        >
          Live HTML Output
        </h2>
        <pre
          style={{
            backgroundColor: "var(--da-darker)",
            border: "1px solid var(--da-border)",
            borderRadius: 8,
            padding: 16,
            fontFamily: "var(--da-font-mono)",
            fontSize: 12,
            color: "var(--da-text-strong)",
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            margin: 0,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {html || "<p></p>"}
        </pre>
      </section>
    </div>
  );
}

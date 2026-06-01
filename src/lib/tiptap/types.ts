// Tiptap-Doc-JSON-Shapes für den Block[]-Tiptap-Konverter.
//
// Wir definieren hier eigene Typen statt @tiptap/core's `JSONContent`, weil
// (a) die Phase-1-Konverter raw JSON produzieren/lesen (kein Tiptap-Schema-
// Round-Trip durch echte Extensions), und (b) die Marks-Array-Reihenfolge
// für unseren Konverter semantisch ist (outermost-first), während Tiptap-
// Schema die Marks nach Schema-Rang normalisiert. Erst Phase 2 entscheidet,
// ob wir custom Tiptap-Extensions bauen, die diese Ordnung respektieren
// (z.B. via Wrap-Order-Attribute).

export type Mark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "link"; attrs: { href: string } }
  | { type: "internalLink"; attrs: { slug: string } }
  | { type: "highlight"; attrs: { color: "#32ff7e" | "#ff8c42" } }
  | { type: "fontSize"; attrs: { size: "lg" | "xl" } };

export type MarkType = Mark["type"];

export type TextNode = {
  type: "text";
  text: string;
  marks?: Mark[];
};

export type SourceRefNode = {
  type: "daSourceRef";
  attrs: { n: number };
  marks?: Mark[];
};

// HardBreak entspricht Shift+Enter im Tiptap-Editor (StarterKit aktiviert
// die Extension defaultmaessig). Im BlockDocument-Schema wird das als
// `\n` im content-String des paragraph/heading-Blocks gespeichert; der
// Konverter wandelt 1:1 hin und zurueck.
export type HardBreakNode = {
  type: "hardBreak";
  marks?: Mark[];
};

export type InlineNode = TextNode | SourceRefNode | HardBreakNode;

export type ParagraphNode = {
  type: "paragraph";
  attrs?: { textAlign?: "left" | "center" | "right" | "justify" };
  content?: InlineNode[];
};

export type HeadingNode = {
  type: "heading";
  attrs: { level: 2 | 3 | 4; textAlign?: "left" | "center" | "right" | "justify" };
  content?: InlineNode[];
};

export type BlockquoteNode = {
  type: "blockquote";
  attrs?: { textAlign?: "left" | "center" | "right" | "justify" };
  content?: ParagraphNode[];
};

export type ListItemNode = {
  type: "listItem";
  content?: ParagraphNode[];
};

export type BulletListNode = {
  type: "bulletList";
  attrs?: { textAlign?: "left" | "center" | "right" | "justify" };
  content?: ListItemNode[];
};

export type OrderedListNode = {
  type: "orderedList";
  attrs?: { textAlign?: "left" | "center" | "right" | "justify" };
  content?: ListItemNode[];
};

export type CodeBlockNode = {
  type: "codeBlock";
  attrs?: { language?: string };
  content?: TextNode[];
};

export type ImageNode = {
  type: "image";
  attrs: {
    src: string;
    filename?: string;
    alt: string;
    caption?: string;
    source?: string;
    size: "small" | "normal" | "full";
    alignment: "left" | "center" | "right";
  };
};

export type StatBoxNode = {
  type: "daStatBox";
  attrs: {
    items: [
      { value: string; label: string },
      { value: string; label: string },
      { value: string; label: string },
    ];
  };
};

export type DisclaimerNode = {
  type: "daDisclaimer";
  attrs: { text: string; linkText?: string; linkUrl?: string };
};

export type InternalArticleCardNode = {
  type: "daInternalArticleCard";
  attrs: {
    articleSlug: string;
    cachedTitle: string;
    cachedCoverUrl?: string;
    cachedExcerpt?: string;
  };
};

export type DaDividerNode = {
  type: "daDivider";
  attrs: { variant: "full" | "short" };
};

export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | BlockquoteNode
  | BulletListNode
  | OrderedListNode
  | CodeBlockNode
  | ImageNode
  | StatBoxNode
  | DisclaimerNode
  | InternalArticleCardNode
  | DaDividerNode;

export type TiptapDoc = {
  type: "doc";
  content: BlockNode[];
};

export const HIGHLIGHT_GREEN = "#32ff7e" as const;
export const HIGHLIGHT_ORANGE = "#ff8c42" as const;

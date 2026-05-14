// Block-Tree für den Article-Editor und -Renderer.
//
// Persistenz seit Phase 8b/c: BlockDocument-Objekte landen als JSON in
// articles.body_blocks. body_md wird beim Save aus body_blocks regeneriert
// und dient als simplifizierte, durchsuchbare/RSS-taugliche Darstellung.
//
// Inline-Formatting lebt INNERHALB von block.content (String) und folgt
// Markdown + Custom-Markern. KEINE strukturierte Inline-AST (würde
// contentEditable + Mini-Tiptap erzwingen — bewusst out-of-scope).
//
// Markdown:
//   **bold**, _italic_, [link](url)
//
// Custom-Marker (vom FloatingToolbar eingefügt, vom Inline-Renderer geparst):
//   [[slug]](Title)        Internal-Link auf /artikel/<slug>
//   {{g}}…{{/g}}           Highlight Grün
//   {{o}}…{{/o}}           Highlight Orange
//   {{lg}}…{{/lg}}         Font-Size Large
//   {{xl}}…{{/xl}}         Font-Size XL
//   [^N]                   Source-Reference (referenziert sources[].id)

export const BLOCK_SCHEMA_VERSION = 1 as const;

export type StatBoxItem = { value: string; label: string };

export type DividerVariant = "full" | "short";
export type ImageSize = "small" | "normal" | "full";
export type ImageAlignment = "left" | "center" | "right";

export type Block =
  | { id: string; type: "heading"; level: 2 | 3 | 4; content: string }
  | { id: string; type: "paragraph"; content: string }
  | { id: string; type: "quote"; content: string; attribution?: string }
  | { id: string; type: "list"; items: string[]; ordered: boolean }
  | { id: string; type: "code"; language?: string; content: string }
  | {
      id: string;
      type: "image";
      url: string;
      filename: string;
      alt: string;
      caption?: string;
      source?: string;
      size: ImageSize;
      alignment: ImageAlignment;
    }
  | {
      id: string;
      type: "statbox";
      items: [StatBoxItem, StatBoxItem, StatBoxItem];
    }
  | {
      id: string;
      type: "disclaimer";
      text: string;
      linkText?: string;
      linkUrl?: string;
    }
  | {
      id: string;
      type: "internalArticleCard";
      articleSlug: string;
      cachedTitle: string;
      cachedCoverUrl?: string;
      cachedExcerpt?: string;
    }
  | { id: string; type: "divider"; variant: DividerVariant };

export type BlockType = Block["type"];

export type Source = { id: string; text: string; url?: string };

export type BlockDocument = {
  version: typeof BLOCK_SCHEMA_VERSION;
  blocks: Block[];
  sources: Source[];
};

const SPECIAL_BLOCK_TYPES: ReadonlySet<BlockType> = new Set<BlockType>([
  "statbox",
  "disclaimer",
  "internalArticleCard",
]);

// Special-Blocks: Strukturen, die im body_md nur als Platzhalter abgebildet
// werden können — Markdown-Modus wird daher Read-Only sobald welche
// vorhanden sind. Sources zählen auch dazu, weil [^N]-Referenzen + die
// Liste am Ende ohne Visual-Editor nicht sinnvoll editierbar sind.
export function hasSpecialBlocks(doc: BlockDocument): boolean {
  if (doc.sources.length > 0) return true;
  return doc.blocks.some((b) => SPECIAL_BLOCK_TYPES.has(b.type));
}

export function emptyBlockDocument(): BlockDocument {
  return { version: BLOCK_SCHEMA_VERSION, blocks: [], sources: [] };
}

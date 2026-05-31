// Serializer: Tiptap-Doc-JSON → BlockDocument.
//
// Spiegelbild von blocksToTiptap.ts. Inline-Nodes (text + daSourceRef) mit
// Marks-Array OUTERMOST-FIRST werden zu Token-Strings zurückgeschrieben.
// Adjacent Nodes mit gemeinsamem äusserem Mark werden gruppiert, damit
// `[text("aa ", [bold]), text("bb", [bold, italic]), text(" cc", [bold])]`
// → `**aa _bb_ cc**` rauskommt (statt drei separater Bold-Wraps).
//
// Mark-Wrap-Reihenfolge: innermost-first → durch Reverse-Iteration des
// Marks-Arrays. Daher landet `[highlight, bold]` als `{{g}}**X**{{/g}}`
// und `[bold, highlight]` als `**{{g}}X{{/g}}**` — die Mark-Order ist die
// einzige semantische Quelle für die Schachtelungs-Richtung.

import type { Block, BlockDocument, Source, StatBoxItem } from "@/types/blocks";
import { BLOCK_SCHEMA_VERSION } from "@/types/blocks";
import type {
  BlockNode,
  InlineNode,
  Mark,
  TiptapDoc,
} from "./types";
import { HIGHLIGHT_GREEN, HIGHLIGHT_ORANGE } from "./types";

// ============================================================
// Inline-Serializer
// ============================================================

function marksEqual(a: Mark, b: Mark): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "bold":
    case "italic":
      return true;
    case "link":
      return (a.attrs as { href: string }).href === (b as { attrs: { href: string } }).attrs.href;
    case "internalLink":
      return (a.attrs as { slug: string }).slug === (b as { attrs: { slug: string } }).attrs.slug;
    case "highlight":
      return (a.attrs as { color: string }).color === (b as { attrs: { color: string } }).attrs.color;
    case "fontSize":
      return (a.attrs as { size: string }).size === (b as { attrs: { size: string } }).attrs.size;
  }
}

function getMarks(node: InlineNode): Mark[] {
  return node.marks ?? [];
}

function stripFirstMark(node: InlineNode): InlineNode {
  const m = node.marks;
  if (!m || m.length === 0) return { ...node, marks: undefined };
  const rest = m.slice(1);
  const next: InlineNode = rest.length > 0
    ? { ...node, marks: rest }
    : { ...node, marks: undefined };
  // Stelle sicher, dass marks: undefined nicht versehentlich JSON-leaked
  if (next.marks === undefined) delete (next as Partial<InlineNode>).marks;
  return next;
}

function wrapWithMark(text: string, mark: Mark): string {
  switch (mark.type) {
    case "bold":
      return `**${text}**`;
    case "italic":
      return `_${text}_`;
    case "link":
      return `[${text}](${mark.attrs.href})`;
    case "internalLink":
      return `[[${mark.attrs.slug}]](${text})`;
    case "highlight":
      if (mark.attrs.color === HIGHLIGHT_GREEN) return `{{g}}${text}{{/g}}`;
      if (mark.attrs.color === HIGHLIGHT_ORANGE) return `{{o}}${text}{{/o}}`;
      return text;
    case "fontSize":
      if (mark.attrs.size === "lg") return `{{lg}}${text}{{/lg}}`;
      if (mark.attrs.size === "xl") return `{{xl}}${text}{{/xl}}`;
      return text;
  }
}

function emitRaw(node: InlineNode): string {
  if (node.type === "daSourceRef") return `[^${node.attrs.n}]`;
  return node.text;
}

function serializeInline(nodes: InlineNode[]): string {
  let out = "";
  let i = 0;
  while (i < nodes.length) {
    const marks = getMarks(nodes[i]);
    if (marks.length === 0) {
      out += emitRaw(nodes[i]);
      i += 1;
      continue;
    }
    const outerMark = marks[0];
    // Run von Nodes finden, die outerMark als FIRST mark haben.
    let j = i;
    while (j < nodes.length) {
      const jm = getMarks(nodes[j]);
      if (jm.length === 0) break;
      if (!marksEqual(jm[0], outerMark)) break;
      j += 1;
    }
    const inner = nodes.slice(i, j).map(stripFirstMark);
    out += wrapWithMark(serializeInline(inner), outerMark);
    i = j;
  }
  return out;
}

// ============================================================
// Block-Konverter
// ============================================================

const newId = (() => {
  let i = 0;
  return () => `bl-${Date.now()}-${(i++).toString(36)}`;
})();

function nodeToBlock(node: BlockNode): Block | null {
  switch (node.type) {
    case "heading": {
      const level = node.attrs.level;
      const content = serializeInline(node.content ?? []);
      const block: Extract<Block, { type: "heading" }> = {
        id: newId(),
        type: "heading",
        level,
        content,
      };
      if (node.attrs.textAlign) block.alignment = node.attrs.textAlign;
      return block;
    }
    case "paragraph": {
      const content = serializeInline(node.content ?? []);
      const block: Extract<Block, { type: "paragraph" }> = {
        id: newId(),
        type: "paragraph",
        content,
      };
      if (node.attrs?.textAlign) block.alignment = node.attrs.textAlign;
      return block;
    }
    case "blockquote": {
      const paragraphs = node.content ?? [];
      // Letzten Paragraph als attribution erkennen wenn er mit `— ` startet
      // und nur Plain-Text enthält.
      let attribution: string | undefined;
      let bodyParas = paragraphs;
      const last = paragraphs[paragraphs.length - 1];
      if (last && last.content && last.content.length === 1) {
        const onlyChild = last.content[0];
        if (onlyChild.type === "text" && /^—\s+/.test(onlyChild.text) && (!onlyChild.marks || onlyChild.marks.length === 0)) {
          attribution = onlyChild.text.replace(/^—\s+/, "");
          bodyParas = paragraphs.slice(0, -1);
        }
      }
      const content = bodyParas.map((p) => serializeInline(p.content ?? [])).join("\n");
      const block: Extract<Block, { type: "quote" }> = {
        id: newId(),
        type: "quote",
        content,
      };
      if (attribution) block.attribution = attribution;
      return block;
    }
    case "bulletList":
    case "orderedList": {
      const items = (node.content ?? []).map((li) => {
        const paragraphs = li.content ?? [];
        return paragraphs.map((p) => serializeInline(p.content ?? [])).join("\n");
      });
      return {
        id: newId(),
        type: "list",
        ordered: node.type === "orderedList",
        items,
      };
    }
    case "codeBlock": {
      const content = (node.content ?? [])
        .map((t) => t.text)
        .join("");
      const block: Extract<Block, { type: "code" }> = {
        id: newId(),
        type: "code",
        content,
      };
      if (node.attrs?.language) block.language = node.attrs.language;
      return block;
    }
    case "image": {
      return {
        id: newId(),
        type: "image",
        url: node.attrs.src,
        filename: node.attrs.filename ?? (node.attrs.src.split("/").pop() ?? "image"),
        alt: node.attrs.alt,
        ...(node.attrs.caption ? { caption: node.attrs.caption } : {}),
        ...(node.attrs.source ? { source: node.attrs.source } : {}),
        size: node.attrs.size,
        alignment: node.attrs.alignment,
      };
    }
    case "daStatBox": {
      return {
        id: newId(),
        type: "statbox",
        items: node.attrs.items.map((it) => ({ value: it.value, label: it.label })) as [
          StatBoxItem,
          StatBoxItem,
          StatBoxItem,
        ],
      };
    }
    case "daDisclaimer": {
      const block: Extract<Block, { type: "disclaimer" }> = {
        id: newId(),
        type: "disclaimer",
        text: node.attrs.text,
      };
      if (node.attrs.linkText) block.linkText = node.attrs.linkText;
      if (node.attrs.linkUrl) block.linkUrl = node.attrs.linkUrl;
      return block;
    }
    case "daInternalArticleCard": {
      const block: Extract<Block, { type: "internalArticleCard" }> = {
        id: newId(),
        type: "internalArticleCard",
        articleSlug: node.attrs.articleSlug,
        cachedTitle: node.attrs.cachedTitle,
      };
      if (node.attrs.cachedCoverUrl) block.cachedCoverUrl = node.attrs.cachedCoverUrl;
      if (node.attrs.cachedExcerpt) block.cachedExcerpt = node.attrs.cachedExcerpt;
      return block;
    }
    case "daDivider": {
      return { id: newId(), type: "divider", variant: node.attrs.variant };
    }
  }
}

export function tiptapToBlocks(doc: TiptapDoc, sources: Source[] = []): BlockDocument {
  const blocks: Block[] = [];
  for (const node of doc.content) {
    const b = nodeToBlock(node);
    if (b) blocks.push(b);
  }
  return {
    version: BLOCK_SCHEMA_VERSION,
    blocks,
    sources,
  };
}

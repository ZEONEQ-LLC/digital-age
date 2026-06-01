// Deserializer: BlockDocument → Tiptap-Doc-JSON.
//
// Walks Block[] and translates per block-type. Inline content (string mit
// Markdown-/Custom-Token) wird rekursiv geparst → InlineNode[] mit Marks-
// Array OUTERMOST-FIRST. Source-Refs `[^N]` werden zu `daSourceRef`-Inline-
// Nodes (kein Mark).
//
// Mark-Schachtelung: das ÄUSSERSTE Wrap-Pattern landet als ERSTES Mark im
// Marks-Array. Damit ist Muster `{{g}}**X**{{/g}}` → marks=[highlight, bold]
// und Muster `**{{g}}X{{/g}}**` → marks=[bold, highlight] eindeutig
// unterscheidbar. Der Serializer (tiptapToBlocks) wraps in umgekehrter
// Reihenfolge zurück.

import type { Block, BlockDocument, StatBoxItem, TextAlignment } from "@/types/blocks";
import type {
  BlockNode,
  InlineNode,
  Mark,
  ParagraphNode,
  TiptapDoc,
} from "./types";
import { HIGHLIGHT_GREEN, HIGHLIGHT_ORANGE } from "./types";

// ============================================================
// Inline-Parser
// ============================================================

type WrapMatch = {
  kind: "wrap";
  start: number;
  end: number;
  innerStart: number;
  innerEnd: number;
  mark: Mark;
};

type SourceRefMatch = {
  kind: "sourceRef";
  start: number;
  end: number;
  n: number;
};

type Match = WrapMatch | SourceRefMatch;

// Pattern-Definitionen mit Priority-Order. Regexes spiegeln exakt die
// von BlockReader.buildPatterns() — so dass alles, was BlockReader heute
// auf der Public-Page parst, vom Deserializer identisch interpretiert
// wird. Lazy-Quantoren `+?` für Bold/Italic (nicht-leeres Inner) sind
// kritisch — sonst fressen `****X****`-Patterns sich selbst.
type Spec =
  | { kind: "sourceRef"; re: RegExp }
  | { kind: "internalLink"; re: RegExp }
  | { kind: "link"; re: RegExp }
  | { kind: "bold"; re: RegExp }
  | { kind: "italic"; re: RegExp }
  | { kind: "highlight"; re: RegExp }
  | { kind: "fontSize"; re: RegExp };

const SPECS: Spec[] = [
  { kind: "sourceRef", re: /\[\^(\d+)\]/ },
  { kind: "internalLink", re: /\[\[([^\]]+)\]\]\(([^)]+)\)/ },
  { kind: "link", re: /\[([^\]]+)\]\(([^)]+)\)/ },
  { kind: "highlight", re: /\{\{(g|o)\}\}([\s\S]*?)\{\{\/\1\}\}/ },
  { kind: "fontSize", re: /\{\{(lg|xl)\}\}([\s\S]*?)\{\{\/\1\}\}/ },
  { kind: "bold", re: /\*\*([\s\S]+?)\*\*/ },
  { kind: "italic", re: /_([^_\n]+)_/ },
];

function findEarliestMatch(text: string): Match | null {
  let best: Match | null = null;
  let bestStart = Number.MAX_SAFE_INTEGER;

  for (const spec of SPECS) {
    const r = spec.re.exec(text);
    if (!r) continue;
    const start = r.index;
    const fullLen = r[0].length;
    let m: Match | null = null;

    if (spec.kind === "sourceRef") {
      m = { kind: "sourceRef", start, end: start + fullLen, n: parseInt(r[1], 10) };
    } else if (spec.kind === "internalLink") {
      // `[[slug]](title)` — slug in mark, title als innerText
      const slug = r[1];
      const titleLen = r[2].length;
      const innerStart = start + fullLen - titleLen - 1; // vor ')'
      m = {
        kind: "wrap",
        start,
        end: start + fullLen,
        innerStart,
        innerEnd: innerStart + titleLen,
        mark: { type: "internalLink", attrs: { slug } },
      };
    } else if (spec.kind === "link") {
      // `[text](url)` — url in mark, text als innerText
      const url = r[2];
      const innerStart = start + 1; // nach '['
      m = {
        kind: "wrap",
        start,
        end: start + fullLen,
        innerStart,
        innerEnd: innerStart + r[1].length,
        mark: { type: "link", attrs: { href: url } },
      };
    } else if (spec.kind === "highlight") {
      const tag = r[1] as "g" | "o";
      const innerStart = start + 5; // '{{g}}' / '{{o}}' = 5 Zeichen
      m = {
        kind: "wrap",
        start,
        end: start + fullLen,
        innerStart,
        innerEnd: innerStart + r[2].length,
        mark: {
          type: "highlight",
          attrs: { color: tag === "g" ? HIGHLIGHT_GREEN : HIGHLIGHT_ORANGE },
        },
      };
    } else if (spec.kind === "fontSize") {
      const tag = r[1] as "lg" | "xl";
      const openLen = tag.length + 4; // '{{lg}}' = 6, '{{xl}}' = 6
      const innerStart = start + openLen;
      m = {
        kind: "wrap",
        start,
        end: start + fullLen,
        innerStart,
        innerEnd: innerStart + r[2].length,
        mark: { type: "fontSize", attrs: { size: tag } },
      };
    } else if (spec.kind === "bold") {
      const innerStart = start + 2;
      m = {
        kind: "wrap",
        start,
        end: start + fullLen,
        innerStart,
        innerEnd: innerStart + r[1].length,
        mark: { type: "bold" },
      };
    } else if (spec.kind === "italic") {
      const innerStart = start + 1;
      m = {
        kind: "wrap",
        start,
        end: start + fullLen,
        innerStart,
        innerEnd: innerStart + r[1].length,
        mark: { type: "italic" },
      };
    }

    if (m && m.start < bestStart) {
      best = m;
      bestStart = m.start;
    }
  }

  return best;
}

// Variante von parseInline fuer paragraph/heading: splittet vorher auf
// `\n` und setzt zwischen den Segmenten einen hardBreak-Inline-Node ein.
// Damit ist der Hin- und Rueckweg (\n ↔ hardBreak) explizit symmetrisch
// — der Editor sieht beim Mount sofort echte hardBreak-Nodes statt sich
// auf ProseMirror-Implizit-Normalisierung zu verlassen, die beim Save
// wieder hardBreak-Nodes produzieren wuerde, die tiptapToBlocks
// vor dem Fix als "undefined" konkateniert hat.
// quote/list-item nutzen weiterhin parseInline direkt — dort ist `\n`
// schon vor parseInline zu separaten Paragraphen gesplittet (etablierte
// Konvention, nicht anfassen).
function parseInlineWithBreaks(text: string, marks: Mark[]): InlineNode[] {
  if (text.length === 0) return [];
  const segments = text.split("\n");
  const out: InlineNode[] = [];
  for (let i = 0; i < segments.length; i++) {
    out.push(...parseInline(segments[i], marks));
    if (i < segments.length - 1) {
      const br: InlineNode = { type: "hardBreak" };
      if (marks.length > 0) br.marks = marks.slice();
      out.push(br);
    }
  }
  return out;
}

function parseInline(text: string, marks: Mark[]): InlineNode[] {
  if (text.length === 0) return [];
  const out: InlineNode[] = [];
  let pos = 0;

  while (pos < text.length) {
    const remaining = text.slice(pos);
    const m = findEarliestMatch(remaining);
    if (!m) {
      out.push(makeText(remaining, marks));
      break;
    }
    if (m.start > 0) {
      out.push(makeText(remaining.slice(0, m.start), marks));
    }
    if (m.kind === "sourceRef") {
      const node: InlineNode = { type: "daSourceRef", attrs: { n: m.n } };
      if (marks.length > 0) node.marks = marks.slice();
      out.push(node);
    } else {
      const inner = remaining.slice(m.innerStart, m.innerEnd);
      const childMarks = [...marks, m.mark];
      out.push(...parseInline(inner, childMarks));
    }
    pos += m.end;
  }

  return out;
}

function makeText(text: string, marks: Mark[]): InlineNode {
  if (marks.length === 0) return { type: "text", text };
  return { type: "text", text, marks: marks.slice() };
}

// ============================================================
// Block-Konverter
// ============================================================

function blockToNode(b: Block): BlockNode {
  switch (b.type) {
    case "heading": {
      const content = parseInlineWithBreaks(b.content, []);
      const node: BlockNode = {
        type: "heading",
        attrs: { level: b.level, ...(b.alignment ? { textAlign: b.alignment as TextAlignment } : {}) },
      };
      if (content.length > 0) node.content = content;
      return node;
    }
    case "paragraph": {
      const content = parseInlineWithBreaks(b.content, []);
      const node: ParagraphNode = { type: "paragraph" };
      if (b.alignment) node.attrs = { textAlign: b.alignment };
      if (content.length > 0) node.content = content;
      return node;
    }
    case "quote": {
      // Multi-line content → mehrere Paragraphen via \n-Split. Optionale
      // attribution wird als letzter Paragraph "— Name" angehängt.
      const lines = b.content.split("\n");
      const paragraphs: ParagraphNode[] = lines.map((line) => {
        const content = parseInline(line, []);
        const p: ParagraphNode = { type: "paragraph" };
        if (content.length > 0) p.content = content;
        return p;
      });
      if (b.attribution) {
        paragraphs.push({ type: "paragraph", content: [{ type: "text", text: `— ${b.attribution}` }] });
      }
      return { type: "blockquote", content: paragraphs };
    }
    case "list": {
      return {
        type: b.ordered ? "orderedList" : "bulletList",
        content: b.items.map((item) => {
          const lines = item.split("\n");
          const paragraphs: ParagraphNode[] = lines.map((line) => {
            const content = parseInline(line, []);
            const p: ParagraphNode = { type: "paragraph" };
            if (content.length > 0) p.content = content;
            return p;
          });
          return { type: "listItem", content: paragraphs };
        }),
      };
    }
    case "code": {
      const attrs = b.language ? { language: b.language } : undefined;
      const content = b.content ? [{ type: "text" as const, text: b.content }] : undefined;
      const node: BlockNode = { type: "codeBlock" };
      if (attrs) node.attrs = attrs;
      if (content) node.content = content;
      return node;
    }
    case "image": {
      return {
        type: "image",
        attrs: {
          src: b.url,
          filename: b.filename,
          alt: b.alt,
          ...(b.caption ? { caption: b.caption } : {}),
          ...(b.source ? { source: b.source } : {}),
          size: b.size,
          alignment: b.alignment,
        },
      };
    }
    case "statbox": {
      return {
        type: "daStatBox",
        attrs: {
          items: b.items.map((it: StatBoxItem) => ({ value: it.value, label: it.label })) as [
            { value: string; label: string },
            { value: string; label: string },
            { value: string; label: string },
          ],
        },
      };
    }
    case "disclaimer": {
      return {
        type: "daDisclaimer",
        attrs: {
          text: b.text,
          ...(b.linkText ? { linkText: b.linkText } : {}),
          ...(b.linkUrl ? { linkUrl: b.linkUrl } : {}),
        },
      };
    }
    case "internalArticleCard": {
      return {
        type: "daInternalArticleCard",
        attrs: {
          articleSlug: b.articleSlug,
          cachedTitle: b.cachedTitle,
          ...(b.cachedCoverUrl ? { cachedCoverUrl: b.cachedCoverUrl } : {}),
          ...(b.cachedExcerpt ? { cachedExcerpt: b.cachedExcerpt } : {}),
        },
      };
    }
    case "divider": {
      return { type: "daDivider", attrs: { variant: b.variant } };
    }
  }
}

export function blocksToTiptap(doc: BlockDocument): TiptapDoc {
  return {
    type: "doc",
    content: doc.blocks.map(blockToNode),
  };
}

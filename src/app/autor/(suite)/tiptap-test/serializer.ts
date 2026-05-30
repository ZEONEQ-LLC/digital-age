// Tiptap-Doc → Block[] Serializer (Weg B).
//
// Body- + Abstract-Editor nutzen NATIVE Tiptap-Marks (Bold, Italic, Link,
// Highlight multicolor, Subscript, Superscript). User sieht im Editor
// echtes WYSIWYG (Bold ist fett, Highlight ist farbig, …) — niemals rohe
// Token wie `**` oder `{{g}}`.
//
// Beim Serialisieren übersetzt dieser Modul Tiptap-Marks zurück in das
// Plain-Text-Token-Format, das `BlockReader.buildPatterns()` parst:
//   - bold mark         → **text**
//   - italic mark       → _text_
//   - highlight #32ff7e → {{g}}text{{/g}}
//   - highlight #ff8c42 → {{o}}text{{/o}}
//   - link mark         → [text](url)
//
// Verschachtelung: highlight innerst, dann italic, bold, link aussen.
// Damit z.B. Bold+Grün als `**{{g}}text{{/g}}**` rauskommt — was BlockReader
// korrekt parsed.

import type { Block, StatBoxItem, TextAlignment } from "@/types/blocks";

type PMMark = { type: string; attrs?: Record<string, unknown> };
type PMNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
  marks?: PMMark[];
};

let bidCounter = 0;
function blockId(): string {
  bidCounter += 1;
  return `bl-${Date.now()}-${bidCounter.toString(36)}`;
}

const HIGHLIGHT_GREEN = "#32ff7e";
const HIGHLIGHT_ORANGE = "#ff8c42";

// Innenliegend zuerst, aussenliegend zuletzt — bestimmt die Schachtelung
// im Output-Token-String.
const MARK_ORDER = ["highlight", "italic", "bold", "link"] as const;

function wrapMark(text: string, mark: PMMark): string {
  switch (mark.type) {
    case "bold":
      return `**${text}**`;
    case "italic":
      return `_${text}_`;
    case "highlight": {
      const color = mark.attrs?.color as string | undefined;
      if (color === HIGHLIGHT_GREEN) return `{{g}}${text}{{/g}}`;
      if (color === HIGHLIGHT_ORANGE) return `{{o}}${text}{{/o}}`;
      // Unbekannte Highlight-Farbe → ohne Wrap durchreichen
      return text;
    }
    case "link": {
      const href = (mark.attrs?.href as string) ?? "";
      if (!href) return text;
      return `[${text}](${href})`;
    }
    default:
      // sub/sup und andere unbekannte Marks: durchreichen
      return text;
  }
}

// Wandelt einen Inline-Subtree zu Token-String. Behandelt nur text +
// hardBreak; alle anderen Inline-Knoten werden übersprungen.
export function serializeInline(content: PMNode[] | undefined): string {
  if (!content) return "";
  let out = "";
  for (const node of content) {
    if (node.type === "hardBreak") {
      out += "\n";
      continue;
    }
    if (node.type !== "text") continue;
    let text = node.text ?? "";
    const marks = node.marks ?? [];
    // Eine Mark pro Typ; in der Order-Liste reihenfolgen.
    const sorted = [...marks].sort((a, b) => {
      const ai = MARK_ORDER.indexOf(a.type as (typeof MARK_ORDER)[number]);
      const bi = MARK_ORDER.indexOf(b.type as (typeof MARK_ORDER)[number]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    for (const m of sorted) {
      text = wrapMark(text, m);
    }
    out += text;
  }
  return out;
}

function blockquoteContent(node: PMNode): { content: string; attribution?: string } {
  const lines: string[] = [];
  for (const child of node.content ?? []) {
    if (child.type === "paragraph") lines.push(serializeInline(child.content));
  }
  const last = lines[lines.length - 1];
  if (last && /^—\s+/.test(last)) {
    return {
      content: lines.slice(0, -1).join("\n"),
      attribution: last.replace(/^—\s+/, ""),
    };
  }
  return { content: lines.join("\n") };
}

function listItems(node: PMNode): string[] {
  return (node.content ?? []).map((li) => {
    const paras = (li.content ?? []).filter((p) => p.type === "paragraph");
    return paras.map((p) => serializeInline(p.content)).join("\n");
  });
}

export function tiptapNodeToBlock(node: PMNode): Block | null {
  const id = blockId();
  switch (node.type) {
    case "heading": {
      const lvl = Number(node.attrs?.level ?? 2);
      const level: 2 | 3 | 4 = lvl === 3 || lvl === 4 ? lvl : 2;
      const alignment = node.attrs?.textAlign as TextAlignment | undefined;
      return {
        id,
        type: "heading",
        level,
        content: serializeInline(node.content),
        alignment,
      };
    }
    case "paragraph": {
      const alignment = node.attrs?.textAlign as TextAlignment | undefined;
      return { id, type: "paragraph", content: serializeInline(node.content), alignment };
    }
    case "blockquote": {
      const { content, attribution } = blockquoteContent(node);
      return { id, type: "quote", content, attribution };
    }
    case "bulletList":
    case "orderedList":
      return {
        id,
        type: "list",
        ordered: node.type === "orderedList",
        items: listItems(node),
      };
    case "codeBlock":
      return {
        id,
        type: "code",
        content: serializeInline(node.content),
        language: (node.attrs?.language as string) ?? undefined,
      };
    case "image": {
      const url = (node.attrs?.src as string) ?? "";
      const alt = (node.attrs?.alt as string) ?? "";
      const align = (node.attrs?.align as string) ?? "center";
      const width = (node.attrs?.width as string) ?? "medium";
      const size: "small" | "normal" | "full" =
        width === "small" ? "small" : width === "large" || width === "full" ? "full" : "normal";
      const alignment: "left" | "center" | "right" =
        align === "left" || align === "right" ? align : "center";
      return {
        id,
        type: "image",
        url,
        filename: url.split("/").pop() ?? "image",
        alt,
        size,
        alignment,
      };
    }
    case "daStatBox": {
      const itemsRaw = (node.attrs?.items as StatBoxItem[]) ?? [];
      const items: [StatBoxItem, StatBoxItem, StatBoxItem] = [
        itemsRaw[0] ?? { value: "", label: "" },
        itemsRaw[1] ?? { value: "", label: "" },
        itemsRaw[2] ?? { value: "", label: "" },
      ];
      return { id, type: "statbox", items };
    }
    case "horizontalRule":
    case "daDivider": {
      const variant = (node.attrs?.variant as "full" | "short") ?? "full";
      return { id, type: "divider", variant };
    }
    default:
      return null;
  }
}

export function tiptapDocToBlocks(doc: { content?: PMNode[] }): Block[] {
  const out: Block[] = [];
  for (const node of doc.content ?? []) {
    const b = tiptapNodeToBlock(node);
    if (b) out.push(b);
  }
  return out;
}

// Serialisiert den Abstract-Editor-Doc zu einem einzelnen Token-String.
// Joined Paragraphen mit \n falls der User mehrere erzeugt hat.
export function serializeAbstractDoc(doc: { content?: PMNode[] }): string {
  const lines: string[] = [];
  for (const node of doc.content ?? []) {
    if (node.type === "paragraph") lines.push(serializeInline(node.content));
  }
  return lines.join("\n");
}

// Tiptap-Doc → Block[] Serializer.
//
// Body-Editor-Output kommt als ProseMirror-JSON daher und wird in unser
// natives BlockDocument-Format übersetzt — damit landet die Vorschau
// im selben BlockReader/ArticleBody-Pfad wie die Public-Page und ist
// pixel-identisch.
//
// Inline-Marker (Bold/Italic/Highlight/Source-Ref/Internal-Link/…)
// bleiben als Plain-Text-Token im content-String erhalten (Weg A) —
// es gibt im Body-Editor KEINE nativen Tiptap-Marks, die Toolbar
// fügt die Token direkt in den Text ein.

import type { Block, StatBoxItem, TextAlignment } from "@/types/blocks";

type PMNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
};

let bidCounter = 0;
function blockId(): string {
  bidCounter += 1;
  return `bl-${Date.now()}-${bidCounter.toString(36)}`;
}

// Walks ein Inline-Subtree (text + hardBreak) zu Plain-Text. Tokens sind
// schon im Text drin, hardBreak wird zu \n.
function inlineToText(content: PMNode[] | undefined): string {
  if (!content) return "";
  return content
    .map((n) => {
      if (n.type === "text") return n.text ?? "";
      if (n.type === "hardBreak") return "\n";
      // Im body-Editor sind keine anderen Inline-Nodes erlaubt.
      return "";
    })
    .join("");
}

// blockquote in Tiptap = ein Wrapper mit paragraph-Children.
// Wir konkatenieren die Paragraphen mit \n.
function blockquoteContent(node: PMNode): { content: string; attribution?: string } {
  const lines: string[] = [];
  for (const child of node.content ?? []) {
    if (child.type === "paragraph") lines.push(inlineToText(child.content));
  }
  // Heuristik: letzte Zeile beginnt mit "— " → als attribution extrahieren.
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
    // listItem enthält paragraph(s) — wir nehmen den ersten paragraph als
    // Item-Text. Mehr-Absätze pro Item sind in unserem Block-Schema nicht
    // abbildbar (string[]), Folge-Absätze werden mit \n verbunden.
    const paras = (li.content ?? []).filter((p) => p.type === "paragraph");
    return paras.map((p) => inlineToText(p.content)).join("\n");
  });
}

// Top-Level-Node → Block. Returnt null für unbekannte Typen.
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
        content: inlineToText(node.content),
        alignment,
      };
    }
    case "paragraph": {
      const alignment = node.attrs?.textAlign as TextAlignment | undefined;
      return { id, type: "paragraph", content: inlineToText(node.content), alignment };
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
        content: inlineToText(node.content),
        language: (node.attrs?.language as string) ?? undefined,
      };
    case "image": {
      const url = (node.attrs?.src as string) ?? "";
      const alt = (node.attrs?.alt as string) ?? "";
      const align = (node.attrs?.align as string) ?? "center";
      const width = (node.attrs?.width as string) ?? "medium";
      // Mapping data-width → ImageSize (medium=normal, large/full=full,
      // small bleibt small).
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

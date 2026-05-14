// Markdown ↔ Block-Tree-Konverter für Legacy-Artikel und Mode-Switching.
//
// Phase 8b/c-Update: Image-Block-Shape ist erweitert (url+filename statt src,
// caption/source/size/alignment). Parser produziert die neue Shape mit
// sinnvollen Defaults; Renderer schreibt nur das, was im body_md
// abbildbar ist (alt + url + caption).
//
// Für strukturierte BlockDocument-Persistenz siehe @/lib/blockDocumentMarkdown.
// Dieses Modul deckt nur den simplen Round-Trip für Legacy-Artikel ohne
// Special-Blocks ab.

import type { Block } from "@/types/blocks";

function deriveFilename(url: string): string {
  const last = url.split("?")[0].split("/").pop() ?? "";
  return last || "image";
}

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
          return `${"#".repeat(b.level)} ${b.content}`;
        case "paragraph":
          return b.content;
        case "quote":
          return (
            b.content
              .split("\n")
              .map((l) => `> ${l}`)
              .join("\n") + (b.attribution ? `\n> — ${b.attribution}` : "")
          );
        case "list":
          return b.items.map((it) => `${b.ordered ? "1." : "-"} ${it}`).join("\n");
        case "code":
          return "```" + (b.language ?? "") + "\n" + b.content + "\n```";
        case "image":
          return `![${b.alt}](${b.url})${b.caption ? `\n*${b.caption}*` : ""}`;
        // Special-Blocks haben keine sinnvolle Markdown-Repräsentation —
        // im Roundtrip-Pfad werden sie nicht erwartet (Markdown-Modus ist
        // read-only sobald Special-Blocks vorkommen).
        case "statbox":
        case "disclaimer":
        case "internalArticleCard":
        case "divider":
          return "";
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

export function markdownToBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const out: Block[] = [];
  let bId = 0;
  const id = () => `mb${Date.now()}-${bId++}`;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      out.push({ id: id(), type: "heading", level: 4, content: trimmed.slice(5) });
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      out.push({ id: id(), type: "heading", level: 3, content: trimmed.slice(4) });
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      out.push({ id: id(), type: "heading", level: 2, content: trimmed.slice(3) });
      i++;
      continue;
    }
    if (trimmed === "---") {
      out.push({ id: id(), type: "divider", variant: "full" });
      i++;
      continue;
    }
    if (trimmed.startsWith("> ")) {
      const buf: string[] = [];
      let attribution: string | undefined;
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        const txt = lines[i].trim().slice(2);
        if (txt.startsWith("— ")) attribution = txt.slice(2);
        else buf.push(txt);
        i++;
      }
      out.push({ id: id(), type: "quote", content: buf.join("\n"), attribution });
      continue;
    }
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3) || undefined;
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push({ id: id(), type: "code", language: lang, content: buf.join("\n") });
      continue;
    }
    const ulMatch = /^[-*]\s+/.test(trimmed);
    const olMatch = /^\d+\.\s+/.test(trimmed);
    if (ulMatch || olMatch) {
      const items: string[] = [];
      const ordered = olMatch && !ulMatch;
      while (
        i < lines.length &&
        (ordered ? /^\d+\.\s+/ : /^[-*]\s+/).test(lines[i].trim())
      ) {
        items.push(
          lines[i].trim().replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ""),
        );
        i++;
      }
      out.push({ id: id(), type: "list", ordered, items });
      continue;
    }
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      const url = imgMatch[2];
      out.push({
        id: id(),
        type: "image",
        url,
        filename: deriveFilename(url),
        alt: imgMatch[1],
        size: "full",
        alignment: "center",
      });
      i++;
      // Optional caption auf nächster Zeile: *Caption-Text*
      if (i < lines.length) {
        const capMatch = lines[i].trim().match(/^\*(.+)\*$/);
        if (capMatch) {
          const last = out[out.length - 1];
          if (last.type === "image") {
            last.caption = capMatch[1];
          }
          i++;
        }
      }
      continue;
    }
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{2,4}\s|>\s|[-*]\s|\d+\.\s|```|!\[)/.test(lines[i].trim()) &&
      lines[i].trim() !== "---"
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push({ id: id(), type: "paragraph", content: buf.join("\n") });
  }

  return out.length ? out : [{ id: id(), type: "paragraph", content: "" }];
}

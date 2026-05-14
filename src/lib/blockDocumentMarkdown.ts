// BlockDocument → simplifizierter body_md-Renderer.
//
// body_md ist seit Phase 8b/c kein Round-Trip-Ziel mehr — body_blocks ist
// Source-of-Truth. Dieser Renderer erzeugt eine plain-text-/markdown-ähnliche
// Darstellung, die für Such-Index, RSS-Feeds und Plain-Reader-Fallbacks
// taugt. Inline-Custom-Marker (Highlight, FontSize, Internal-Link,
// Source-Refs) werden zu Plain-Text gestrippt.

import type { Block, BlockDocument, Source } from "@/types/blocks";

// Inline-Marker auf reinen Text zurückfalten. Lässt **bold**, _italic_,
// [text](url) bewusst stehen — das ist gültiges Markdown.
//
// Stripping-Reihenfolge:
//   [[slug]](Title) → Title          (Internal-Link wird zu Plain-Text)
//   {{g}}X{{/g}}    → X              (Highlight Grün)
//   {{o}}X{{/o}}    → X              (Highlight Orange)
//   {{lg}}X{{/lg}}  → X              (Font-Size Large)
//   {{xl}}X{{/xl}}  → X              (Font-Size XL)
//   [^N]           → [^N]           (bleibt erhalten — wird unten in der
//                                    Sources-Section aufgelöst)
function stripInlineMarkers(content: string): string {
  return content
    .replace(/\[\[([^\]]+)\]\]\(([^)]+)\)/g, "$2")
    .replace(/\{\{(?:g|o|lg|xl)\}\}([\s\S]*?)\{\{\/(?:g|o|lg|xl)\}\}/g, "$1");
}

function renderBlock(b: Block): string {
  switch (b.type) {
    case "heading":
      return `${"#".repeat(b.level)} ${stripInlineMarkers(b.content)}`;
    case "paragraph":
      return stripInlineMarkers(b.content);
    case "quote": {
      const body = stripInlineMarkers(b.content)
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n");
      return b.attribution ? `${body}\n> — ${b.attribution}` : body;
    }
    case "list":
      return b.items
        .map((it) => `${b.ordered ? "1." : "-"} ${stripInlineMarkers(it)}`)
        .join("\n");
    case "code":
      return "```" + (b.language ?? "") + "\n" + b.content + "\n```";
    case "image": {
      const lines = [`![${b.alt}](${b.url})`];
      if (b.caption) lines.push(`*${b.caption}*`);
      if (b.source) lines.push(`*${b.source}*`);
      return lines.join("\n");
    }
    case "divider":
      return b.variant === "short" ? "---" : "---";
    case "statbox": {
      const items = b.items
        .map((it) => `${it.value} – ${it.label}`)
        .join(" · ");
      return `> ${items}`;
    }
    case "disclaimer": {
      const link = b.linkText && b.linkUrl ? ` → ${b.linkText}` : "";
      return `> ⚠ ${b.text}${link}`;
    }
    case "internalArticleCard":
      return `→ Verwandter Artikel: ${b.cachedTitle} (/artikel/${b.articleSlug})`;
  }
}

function renderSources(sources: Source[]): string {
  if (sources.length === 0) return "";
  const lines = ["## Quellen"];
  sources.forEach((s, i) => {
    const ref = i + 1;
    const link = s.url ? ` — ${s.url}` : "";
    lines.push(`${ref}. ${s.text}${link}`);
  });
  return lines.join("\n");
}

export function renderBlockDocumentToMarkdown(doc: BlockDocument): string {
  const body = doc.blocks.map(renderBlock).filter(Boolean).join("\n\n");
  const sources = renderSources(doc.sources);
  return sources ? `${body}\n\n${sources}` : body;
}

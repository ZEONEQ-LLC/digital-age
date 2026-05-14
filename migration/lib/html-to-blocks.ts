import TurndownService from "turndown";
import { markdownToBlocks } from "../../src/lib/markdownBlocks";
import { BLOCK_SCHEMA_VERSION, type BlockDocument } from "../../src/types/blocks";

const td = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "_",
  strongDelimiter: "**",
});

// WP-Wrapper-Tags rauswerfen, die Turndown nicht braucht
td.remove(["script", "style"]);

// Image mit Caption: WP nutzt <figure><img><figcaption> oder das alte
// [caption]-Shortcode-Markup das zu <p class="wp-caption-text"> wird.
td.addRule("imageWithCaption", {
  filter: (node: HTMLElement) =>
    node.nodeName === "FIGURE" && !!node.querySelector?.("img"),
  replacement: (_, node) => {
    const el = node as HTMLElement;
    const img = el.querySelector?.("img");
    const cap = el.querySelector?.("figcaption");
    const alt = img?.getAttribute?.("alt") ?? "";
    const src = img?.getAttribute?.("src") ?? "";
    if (!src) return "";
    const capText = cap?.textContent?.trim();
    return capText
      ? `\n\n![${alt}](${src})\n*${capText}*\n\n`
      : `\n\n![${alt}](${src})\n\n`;
  },
});

// WP-Gutenberg-Block-Marker-Kommentare landen sonst als Plain-Text
td.addRule("stripWpCommentBlocks", {
  filter: (node) =>
    node.nodeType === 8 /* Node.COMMENT_NODE */ &&
    typeof node.nodeValue === "string" &&
    node.nodeValue.trim().startsWith("wp:"),
  replacement: () => "",
});

// Embeds (YouTube etc.) — als Link rendern, nicht als iFrame
td.addRule("iframeToLink", {
  filter: "iframe",
  replacement: (_, node) => {
    const el = node as HTMLElement;
    const src = el.getAttribute?.("src") ?? "";
    return src ? `\n\n[Embed: ${src}](${src})\n\n` : "";
  },
});

export type HtmlConversion = {
  doc: BlockDocument;
  markdown: string;
  warnings: string[];
};

export function htmlToBlockDocument(html: string): HtmlConversion {
  const warnings: string[] = [];

  // Shortcodes flag (Plain-Text-Fallback, aber loggen)
  const shortcodeRe = /\[([a-z][a-z0-9_-]*)\b[^\]]*\]/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = shortcodeRe.exec(html)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      warnings.push(`Shortcode [${m[1]}] gefunden — wird als Plain-Text gerendert`);
    }
  }

  const markdown = td.turndown(html);
  const blocks = markdownToBlocks(markdown);
  const doc: BlockDocument = {
    version: BLOCK_SCHEMA_VERSION,
    blocks,
    sources: [],
  };
  return { doc, markdown, warnings };
}

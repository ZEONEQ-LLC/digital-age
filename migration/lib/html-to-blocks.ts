import domino from "@mixmark-io/domino";
import TurndownService from "turndown";
import { markdownToBlocks } from "../../src/lib/markdownBlocks";
import {
  BLOCK_SCHEMA_VERSION,
  type Block,
  type BlockDocument,
} from "../../src/types/blocks";

type DocumentLike = ReturnType<typeof domino.createDocument>;
type ElementLike = ReturnType<DocumentLike["createElement"]>;

// ---------------------------------------------------------------------------
// Turndown-Setup
// ---------------------------------------------------------------------------

function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
    strongDelimiter: "**",
    hr: "---",
  });

  td.remove(["script", "style"]);

  // Image mit Caption: <figure><img><figcaption>
  td.addRule("imageWithCaption", {
    filter: (node) => node.nodeName === "FIGURE" && !!node.querySelector?.("img"),
    replacement: (_, node) => {
      const el = node as unknown as ElementLike;
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

  // WP-Block-Marker-Kommentare droppen
  td.addRule("stripWpCommentBlocks", {
    filter: (node) =>
      node.nodeType === 8 &&
      typeof node.nodeValue === "string" &&
      node.nodeValue.trim().startsWith("wp:"),
    replacement: () => "",
  });

  // <iframe> als Link
  td.addRule("iframeToLink", {
    filter: "iframe",
    replacement: (_, node) => {
      const el = node as unknown as ElementLike;
      const src = el.getAttribute?.("src") ?? "";
      return src ? `\n\n[Embed: ${src}](${src})\n\n` : "";
    },
  });

  // <mark> mit grünem Hintergrund → {{g}}…{{/g}}
  td.addRule("greenHighlight", {
    filter: (node) => {
      if (node.nodeName !== "MARK") return false;
      const el = node as unknown as ElementLike;
      const style = el.getAttribute?.("style") ?? "";
      const cls = el.getAttribute?.("class") ?? "";
      return /ast-global-color-2|#32ff7e|rgb\(50,\s*255,\s*126\)|highlight-green|has-green-background/i.test(
        style + " " + cls,
      );
    },
    replacement: (content) => `{{g}}${content}{{/g}}`,
  });

  // <mark> mit orangem Hintergrund → {{o}}…{{/o}}
  td.addRule("orangeHighlight", {
    filter: (node) => {
      if (node.nodeName !== "MARK") return false;
      const el = node as unknown as ElementLike;
      const style = el.getAttribute?.("style") ?? "";
      const cls = el.getAttribute?.("class") ?? "";
      return /#ff8c42|rgb\(255,\s*140,\s*66\)|highlight-orange|has-orange-background/i.test(
        style + " " + cls,
      );
    },
    replacement: (content) => `{{o}}${content}{{/o}}`,
  });

  // Generic <mark> Fallback: nur Content durchreichen
  td.addRule("genericMark", {
    filter: "mark",
    replacement: (content) => content,
  });

  return td;
}

// ---------------------------------------------------------------------------
// DOM-Pre-Processing
// ---------------------------------------------------------------------------

type SourceMap = Map<number, string>;

// Findet die Quellen-<ol> und extrahiert die externen URLs nach Index.
// Heuristik:
//   1. Bevorzugt: <h2|h3 id="sources"> oder id="quellen"> + folgende <ol>
//   2. Fallback: letzte <ol> im Body mit >= 3 <li>, jedes mit <a href>
//      und vorangehender Heading mit Text "Quellen"/"Sources" (case-i)
//   3. Sonst: leere Map
//
// Im Erfolgsfall wird das Heading + <ol> aus dem DOM entfernt, ein
// vorangehender <hr> auch.
function extractAndStripSourceList(doc: DocumentLike): {
  urls: SourceMap;
  removed: boolean;
} {
  const urls: SourceMap = new Map();

  const findSourceHeading = (): ElementLike | null => {
    const idHeading = doc.querySelector("h1#sources, h2#sources, h3#sources, h1#quellen, h2#quellen, h3#quellen");
    if (idHeading) return idHeading as ElementLike;
    // Text-basiert
    const headings = doc.querySelectorAll("h1, h2, h3, h4");
    for (let i = 0; i < headings.length; i++) {
      const text = (headings[i].textContent ?? "").trim().toLowerCase();
      if (text === "quellen" || text === "sources" || text === "sources and further reading" || text === "quellen und weiterführende links") {
        return headings[i] as ElementLike;
      }
    }
    return null;
  };

  let heading = findSourceHeading();
  let ol: ElementLike | null = null;

  if (heading) {
    // Erstes <ol> direkt nach dem Heading
    let next: ElementLike | null = heading.nextElementSibling as ElementLike | null;
    while (next && next.tagName !== "OL") {
      next = next.nextElementSibling as ElementLike | null;
    }
    ol = next;
  } else {
    // Fallback: letzte <ol> im Body mit >= 3 <li><a href>
    const ols = doc.querySelectorAll("ol");
    for (let i = ols.length - 1; i >= 0; i--) {
      const candidate = ols[i] as ElementLike;
      const lis = candidate.querySelectorAll("li");
      if (lis.length < 3) continue;
      let allHaveLink = true;
      for (let j = 0; j < lis.length; j++) {
        if (!(lis[j] as ElementLike).querySelector("a[href]")) {
          allHaveLink = false;
          break;
        }
      }
      if (allHaveLink) {
        ol = candidate;
        break;
      }
    }
  }

  // Alternative Source-List-Form: `<p>` mit `[N] <a>` Items, durch `<br>`
  // getrennt. Tritt z.B. in "reusable-ai-skills" auf — die <ol>-Heuristik
  // greift nicht.
  let listP: ElementLike | null = null;
  if (!ol && heading) {
    let next: ElementLike | null = heading.nextElementSibling as ElementLike | null;
    while (next && next.tagName !== "P") {
      next = next.nextElementSibling as ElementLike | null;
    }
    if (next) {
      const html = next.innerHTML ?? "";
      // Mindestens 3 Bracket-Marker [N] in dem <p>
      const bracketCount = (html.match(/\[\d+\]/g) ?? []).length;
      if (bracketCount >= 3) listP = next;
    }
  }

  if (!ol && !listP) return { urls, removed: false };

  if (ol) {
    const lis = ol.querySelectorAll("li");
    for (let i = 0; i < lis.length; i++) {
      const a = (lis[i] as ElementLike).querySelector("a[href]");
      const href = a?.getAttribute?.("href");
      if (href) urls.set(i + 1, href);
    }
  } else if (listP) {
    // `[N] <a href="...">...</a>` aus dem innerHTML extrahieren
    const innerHtml = listP.innerHTML ?? "";
    const re = /\[(\d+)\]\s*<a[^>]*\bhref="([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(innerHtml)) !== null) {
      const n = parseInt(m[1], 10);
      const url = m[2];
      if (!urls.has(n)) urls.set(n, url);
    }
  }

  // Vorangehender <hr> entfernen
  const removalAnchor = heading ?? ol ?? listP;
  const prevHr = removalAnchor?.previousElementSibling as ElementLike | null;
  if (prevHr && prevHr.tagName === "HR") prevHr.remove?.();

  heading?.remove?.();
  ol?.remove?.();
  listP?.remove?.();

  return { urls, removed: true };
}

// Erkennt die WP-Reusable-Block-Referenz auf den Disclaimer (ref=1915 ist in
// digital-age.ch der globale "AI war beteiligt"-Block — Vorgängerversionen
// hatten ihn als reusable Block, nicht inline). Falls die Ref auftaucht, wird
// sie aus dem HTML entfernt und ein default-Disclaimer-Block angefügt.
//
// HTML-Repräsentation: `<!-- wp:block {"ref":1915} /-->` (HTML-Kommentar).
// Eine kleine Heuristik prüft den Disclaimer auch direkt im Text (Plain-
// Inline-Variante), aber unsere Daten zeigen 0/51 Posts mit Plain-Inline.
function detectDisclaimer(rawHtml: string): {
  found: boolean;
  via: "wp-block-ref" | "inline-text" | null;
} {
  if (/wp:block\s*\{[^}]*"ref":\s*1915\b/.test(rawHtml)) {
    return { found: true, via: "wp-block-ref" };
  }
  if (/ai war beteiligt|ai contributed/i.test(rawHtml)) {
    return { found: true, via: "inline-text" };
  }
  return { found: false, via: null };
}

// Sehr grobes Language-Sniffing für den Disclaimer-Block-Template-Choice.
// Default = "de" (Site-Sprache ist primär Deutsch).
function detectLanguage(title: string, fallbackText: string): "de" | "en" {
  const t = (title + " " + fallbackText).toLowerCase();
  // Englische Marker-Wörter, die in deutschen Titeln selten vorkommen
  const enHits = (t.match(/\b(the|how|with|for|when|why|banking|customer|ai|agents)\b/g) ?? []).length;
  // Deutsche Marker
  const deHits = (t.match(/\b(und|die|der|das|wie|was|wir|für|über|mit|nicht|ist|ein|eine|im|aus)\b/g) ?? []).length;
  return enHits > deHits ? "en" : "de";
}

function buildDisclaimerBlock(language: "de" | "en"): Block {
  const id = `bl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  if (language === "de") {
    return {
      id,
      type: "disclaimer",
      text: "AI war beteiligt. Verantwortung übernehmen wir.",
      linkText: "So machen wir das",
      linkUrl: "/ki-transparenz",
    };
  }
  return {
    id,
    type: "disclaimer",
    text: "AI contributed. The responsibility stays with us.",
    linkText: "How we handle it",
    linkUrl: "/ki-transparenz",
  };
}

// ---------------------------------------------------------------------------
// Post-Turndown-Helfer (Markdown-Level)
// ---------------------------------------------------------------------------

const SOURCE_REF_GROUP = /\[((?:\\\[\d+\\\])+)\]\(#sources?\)/g;
const SINGLE_REF = /\\\[(\d+)\\\]/g;

function rewriteSourceRefs(
  md: string,
  urlMap: SourceMap,
  warnings: string[],
): string {
  if (urlMap.size === 0) return md;
  return md.replace(SOURCE_REF_GROUP, (_full, refsBlock: string) => {
    const refs: string[] = [];
    for (const m of refsBlock.matchAll(SINGLE_REF)) {
      const n = parseInt(m[1], 10);
      const url = urlMap.get(n);
      if (url) {
        refs.push(`[\\[${n}\\]](${url})`);
      } else {
        warnings.push(`Source ${n} hat keine URL im Mapping — Ref gedroppt`);
      }
    }
    return refs.join("");
  });
}

// Plain-Text-Divider: `* * *`, `***`, `- - -` auf eigener Zeile → `---`.
// Wird nach Turndown angewendet, damit auch Text-Patterns die nicht aus <hr>
// kamen erfasst werden.
function normalizeDividers(md: string): string {
  return md.replace(/^[ \t]*[*\-_]([ \t]*[*\-_]){2,}[ \t]*$/gm, "---");
}

// Wenn der erste Paragraph im Body sehr ähnlich zum Excerpt ist, droppen wir
// ihn — sonst doppelt im Hero + Body.
function stripDuplicateExcerpt(
  md: string,
  excerpt: string,
  warnings: string[],
): string {
  if (!excerpt || excerpt.length < 50) return md;
  const normalize = (s: string) =>
    s.toLowerCase().replace(/\s+/g, " ").replace(/\.+$/, "").trim();

  const lines = md.split("\n");
  let firstParaEnd = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === "" && firstParaEnd > 0) break;
    if (t !== "") firstParaEnd = i + 1;
    if (t.startsWith("#")) break;
  }

  const firstPara = lines.slice(0, firstParaEnd).join(" ").trim();
  if (!firstPara) return md;

  const e = normalize(excerpt);
  const p = normalize(firstPara);
  const minLen = Math.min(e.length, p.length);
  if (minLen < 50) return md;

  if (
    e.startsWith(p.slice(0, minLen)) ||
    p.startsWith(e.slice(0, minLen))
  ) {
    warnings.push("Excerpt-Duplikat erkannt — erster Paragraph gestrippt");
    return lines.slice(firstParaEnd).join("\n").trimStart();
  }
  return md;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type HtmlConversionOpts = {
  title: string;
  excerpt: string;
};

export type HtmlConversion = {
  doc: BlockDocument;
  markdown: string;
  warnings: string[];
  stats: {
    sourcesFound: number;
    sourcesMapped: number;
    highlightsGreen: number;
    highlightsOrange: number;
    disclaimerAttached: boolean;
    disclaimerLanguage: "de" | "en" | null;
    disclaimerVia: "wp-block-ref" | "inline-text" | null;
    excerptStripped: boolean;
    dividersNormalized: number;
  };
};

export function htmlToBlockDocument(
  rawHtml: string,
  opts: HtmlConversionOpts,
): HtmlConversion {
  const warnings: string[] = [];

  // Shortcodes loggen
  const shortcodeRe = /\[([a-z][a-z0-9_-]*)\b[^\]]*\]/g;
  const seenSc = new Set<string>();
  let scMatch: RegExpExecArray | null;
  while ((scMatch = shortcodeRe.exec(rawHtml)) !== null) {
    if (!seenSc.has(scMatch[1])) {
      seenSc.add(scMatch[1]);
      warnings.push(`Shortcode [${scMatch[1]}] gefunden — als Plain-Text gerendert`);
    }
  }

  // Disclaimer-Detection BEVOR Comment-Strip (sonst ist wp:block weg)
  const disclaimerDetection = detectDisclaimer(rawHtml);
  const disclaimerLanguage = disclaimerDetection.found
    ? detectLanguage(opts.title, opts.excerpt)
    : null;

  // Wenn Disclaimer via wp:block-ref erkannt: trailing <hr> vor dem Ref
  // entfernen, sonst bleibt eine verwaiste Trennlinie nach dem Body.
  let preprocessedHtml = rawHtml;
  if (disclaimerDetection.via === "wp-block-ref") {
    preprocessedHtml = preprocessedHtml.replace(
      /<!--\s*wp:separator[\s\S]*?<hr[^>]*\/?>[\s\S]*?<!--\s*\/wp:separator[\s\S]*?-->\s*(?=<!--\s*wp:block\s*\{[^}]*"ref":\s*1915)/g,
      "",
    );
    // Fallback: nackter <hr> vor dem ref (ohne separator-Wrapper)
    preprocessedHtml = preprocessedHtml.replace(
      /<hr[^>]*\/?>\s*(?=<!--\s*wp:block\s*\{[^}]*"ref":\s*1915)/g,
      "",
    );
  }

  // DOM aufbauen, Source-Liste extrahieren + entfernen
  const docDom = domino.createDocument(`<div id="__root">${preprocessedHtml}</div>`);
  const sourceExtraction = extractAndStripSourceList(docDom);

  // Highlight-Counts vor Turndown (wir prüfen erkannte Mark-Tags)
  const markCount = { green: 0, orange: 0 };
  const marks = docDom.querySelectorAll("mark");
  for (let i = 0; i < marks.length; i++) {
    const el = marks[i] as ElementLike;
    const style = el.getAttribute?.("style") ?? "";
    const cls = el.getAttribute?.("class") ?? "";
    if (/ast-global-color-2|#32ff7e|rgb\(50,\s*255,\s*126\)|highlight-green|has-green-background/i.test(style + " " + cls)) {
      markCount.green++;
    } else if (/#ff8c42|rgb\(255,\s*140,\s*66\)|highlight-orange|has-orange-background/i.test(style + " " + cls)) {
      markCount.orange++;
    }
  }

  // Turndown auf das Body-Root anwenden (cleaned DOM)
  const td = createTurndown();
  const root = docDom.getElementById("__root");
  const cleanedHtml = root?.innerHTML ?? "";
  let markdown = td.turndown(cleanedHtml);

  // Post-Process
  markdown = rewriteSourceRefs(markdown, sourceExtraction.urls, warnings);
  const beforeDividerLen = (markdown.match(/^---$/gm) ?? []).length;
  markdown = normalizeDividers(markdown);
  const afterDividerLen = (markdown.match(/^---$/gm) ?? []).length;
  const dividersNormalized = afterDividerLen - beforeDividerLen;

  const excerptBefore = markdown;
  markdown = stripDuplicateExcerpt(markdown, opts.excerpt, warnings);
  const excerptStripped = markdown !== excerptBefore;

  // BlockDocument bauen
  const blocks = markdownToBlocks(markdown);

  // Disclaimer-Block ans Ende anhängen
  if (disclaimerDetection.found && disclaimerLanguage) {
    blocks.push(buildDisclaimerBlock(disclaimerLanguage));
  }

  const doc: BlockDocument = {
    version: BLOCK_SCHEMA_VERSION,
    blocks,
    sources: [],
  };

  return {
    doc,
    markdown,
    warnings,
    stats: {
      sourcesFound: sourceExtraction.urls.size,
      sourcesMapped: sourceExtraction.urls.size,
      highlightsGreen: markCount.green,
      highlightsOrange: markCount.orange,
      disclaimerAttached: disclaimerDetection.found,
      disclaimerLanguage,
      disclaimerVia: disclaimerDetection.via,
      excerptStripped,
      dividersNormalized,
    },
  };
}

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

  // Turndown evaluiert Rules in UMGEKEHRTER Registrierungsreihenfolge.
  // Daher zuerst genericMark (Fallback) registrieren, dann grün/orange. Die
  // spezifischen Pattern werden zuerst geprüft und gewinnen wenn sie matchen.
  td.addRule("genericMark", {
    filter: "mark",
    replacement: (content) => content,
  });

  // Format-Konvention: `{{g}}**bold**{{/g}}` (Marker aussen, Bold innen).
  // WP nutzt zwei Nesting-Varianten:
  //   (A) `<strong><mark>X</mark></strong>` — strong aussen, mark innen
  //   (B) `<mark><strong>X</strong></mark>` — mark aussen, strong innen
  // Beide werden zum gleichen Output normalisiert.
  //
  // Für (A): die Mark-Rule erkennt parent=STRONG, zieht das `**` selbst rein
  // und die zugehörige Strong-Rule unten emittiert nur content (kein
  // zusätzliches `**`).
  td.addRule("greenHighlight", {
    filter: (node) => {
      if (node.nodeName !== "MARK") return false;
      const el = node as unknown as ElementLike;
      return matchesHighlightColor(el, "green");
    },
    replacement: (content, node) => {
      if (parentIsStrongAroundOnlyThisMark(node)) {
        return `{{g}}**${content}**{{/g}}`;
      }
      return `{{g}}${content}{{/g}}`;
    },
  });

  td.addRule("orangeHighlight", {
    filter: (node) => {
      if (node.nodeName !== "MARK") return false;
      const el = node as unknown as ElementLike;
      return matchesHighlightColor(el, "orange");
    },
    replacement: (content, node) => {
      if (parentIsStrongAroundOnlyThisMark(node)) {
        return `{{o}}**${content}**{{/g}}`.replace("{{/g}}", "{{/o}}");
      }
      return `{{o}}${content}{{/o}}`;
    },
  });

  // Wenn ein <strong> NUR ein farbiges <mark> als Kind hat, hat das Mark-
  // Replacement das `**` schon mitgenommen → wir geben nur den content zurück
  // ohne zusätzliches `**`-Wrapping. Bei normalem <strong> mit anderem
  // Inhalt greift Turndowns Default-Strong-Behaviour.
  td.addRule("strongAroundColoredMark", {
    filter: (node) => {
      if (node.nodeName !== "STRONG") return false;
      const el = node as unknown as ElementLike;
      const children = el.children ? Array.from(el.children) : [];
      if (children.length !== 1) return false;
      const only = children[0] as ElementLike;
      if (only.nodeName !== "MARK") return false;
      return (
        matchesHighlightColor(only, "green") ||
        matchesHighlightColor(only, "orange")
      );
    },
    replacement: (content) => content,
  });

  return td;
}

// Prüft ob das gegebene Mark-Node das einzige Kind eines <strong>-Parents
// ist — Standard-WP-Pattern (A).
function parentIsStrongAroundOnlyThisMark(node: unknown): boolean {
  const n = node as { parentNode?: { nodeName?: string; children?: ArrayLike<unknown> } };
  const parent = n.parentNode;
  if (!parent || parent.nodeName !== "STRONG") return false;
  const childCount = parent.children ? parent.children.length : 0;
  return childCount === 1;
}

// Prüft ob das style-Attribut tatsächlich einen non-transparenten
// background-color-Wert hat, der zur gefragten Farbe passt. Class-Namen
// alleine reichen NICHT — `has-ast-global-color-2-color` ist Foreground.
function matchesHighlightColor(el: ElementLike, target: "green" | "orange"): boolean {
  const style = el.getAttribute?.("style") ?? "";
  const bgMatch = style.match(/background-color\s*:\s*([^;"]+)/i);
  if (!bgMatch) return false;
  const bg = bgMatch[1].trim().toLowerCase();
  // Transparent → kein Highlight
  if (
    bg.startsWith("rgba(0,") ||
    bg === "transparent" ||
    bg === "initial" ||
    bg === "inherit" ||
    bg === "unset"
  ) {
    return false;
  }
  if (target === "green") {
    return /ast-global-color-2|#32ff7e|rgb\(50,\s*255,\s*126\)|highlight-green|has-green-background/i.test(
      bg,
    );
  }
  return /#ff8c42|rgb\(255,\s*140,\s*66\)|highlight-orange|has-orange-background/i.test(bg);
}

// ---------------------------------------------------------------------------
// DOM-Pre-Processing
// ---------------------------------------------------------------------------

type SourceEntry = { text: string; url: string };
type SourceMap = Map<number, SourceEntry>;

// Label aus dem ersten <a>-Element: bevorzugt Anchor-Text, sonst Domain.
function extractLabel(li: ElementLike): { text: string; url: string } | null {
  const a = li.querySelector?.("a[href]");
  const href = a?.getAttribute?.("href") ?? "";
  if (!href) return null;
  const anchorText = (a?.textContent ?? "").trim();
  if (anchorText.length > 0) return { text: anchorText, url: href };
  // Fallback: Domain-Name
  let host = "";
  try {
    host = new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return { text: "Quelle", url: href };
  }
  const niceHost = host.charAt(0).toUpperCase() + host.slice(1);
  return { text: niceHost, url: href };
}

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
      const entry = extractLabel(lis[i] as ElementLike);
      if (entry) urls.set(i + 1, entry);
    }
  } else if (listP) {
    // `[N] <a href="...">Label</a>` aus dem innerHTML extrahieren
    const innerHtml = listP.innerHTML ?? "";
    const re = /\[(\d+)\]\s*<a[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(innerHtml)) !== null) {
      const n = parseInt(m[1], 10);
      const url = m[2];
      const anchorText = m[3].replace(/<[^>]+>/g, "").trim();
      if (urls.has(n)) continue;
      if (anchorText.length > 0) {
        urls.set(n, { text: anchorText, url });
      } else {
        try {
          const host = new URL(url).hostname.replace(/^www\./, "");
          urls.set(n, { text: host.charAt(0).toUpperCase() + host.slice(1), url });
        } catch {
          urls.set(n, { text: "Quelle", url });
        }
      }
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

// Schreibt Inline-Source-Refs `[\[N\]\[M\]…](#sources)` zu `[^N][^M]…` um.
// Die `[^N]`-Marker werden vom `BlockReader` zu hochgestellten Source-Links
// gerendert (siehe BlockReader.tsx → buildSourceOrder).
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
      if (urlMap.has(n)) {
        refs.push(`[^${n}]`);
      } else {
        warnings.push(`Source ${n} hat keine URL im Mapping — Ref gedroppt`);
      }
    }
    return refs.join("");
  });
}

// BlockDocument.sources[] aus dem URL-Mapping bauen. ID-Format: stabile
// String-IDs `src-${N}` (kompatibel mit Source.id-Schema). Array wird in
// N-Reihenfolge sortiert — sources[N-1] entspricht `[^N]`.
function buildSourcesArray(urlMap: SourceMap): import("../../src/types/blocks").Source[] {
  if (urlMap.size === 0) return [];
  const max = Math.max(...urlMap.keys());
  const sources: import("../../src/types/blocks").Source[] = [];
  for (let n = 1; n <= max; n++) {
    const entry = urlMap.get(n);
    if (entry) {
      sources.push({ id: `src-${n}`, text: entry.text, url: entry.url });
    } else {
      // Lücke im Mapping (N fehlt in WP-Liste) → Platzhalter, sonst stimmt
      // die Index→N-Korrespondenz nicht mehr.
      sources.push({ id: `src-${n}`, text: `Quelle ${n}` });
    }
  }
  return sources;
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
    // ACHTUNG: enge Begrenzung der inneren Pattern-Strecke, sonst frisst die
    // Regex non-greedy von der ersten <wp:separator> im Body bis zum
    // disclaimer-Ref — und löscht den ganzen Body dazwischen (inkl. Sources).
    // Daher nur `[^<]*`/`\s*` statt `[\s\S]*?` für die Zwischenstücke.
    preprocessedHtml = preprocessedHtml.replace(
      /<!--\s*wp:separator[^>]*-->\s*<hr[^>]*\/?>\s*<!--\s*\/wp:separator\s*-->\s*(?=<!--\s*wp:block\s*\{[^}]*"ref":\s*1915)/g,
      "",
    );
    // Fallback: nackter <hr> direkt vor dem Ref (ohne Separator-Wrapper)
    preprocessedHtml = preprocessedHtml.replace(
      /<hr[^>]*\/?>\s*(?=<!--\s*wp:block\s*\{[^}]*"ref":\s*1915)/g,
      "",
    );
  }

  // DOM aufbauen, Source-Liste extrahieren + entfernen
  const docDom = domino.createDocument(`<div id="__root">${preprocessedHtml}</div>`);
  const sourceExtraction = extractAndStripSourceList(docDom);

  // Highlight-Counts vor Turndown — gleiche Logik wie die Turndown-Rules,
  // damit Stats und tatsächlicher Output übereinstimmen.
  const markCount = { green: 0, orange: 0 };
  const marks = docDom.querySelectorAll("mark");
  for (let i = 0; i < marks.length; i++) {
    const el = marks[i] as ElementLike;
    if (matchesHighlightColor(el, "green")) markCount.green++;
    else if (matchesHighlightColor(el, "orange")) markCount.orange++;
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
    sources: buildSourcesArray(sourceExtraction.urls),
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

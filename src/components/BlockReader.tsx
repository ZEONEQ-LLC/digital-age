import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Block, BlockDocument, Source } from "@/types/blocks";
import {
  buildSourceOrder,
  computeSourceListItems,
} from "./blockReader/sources";

type BlockReaderProps = {
  doc?: BlockDocument;
  blocks?: Block[];
};

// Inline-Marker-Renderer. Markdown-Subset + Custom-Marker werden zu React-
// Nodes umgesetzt. Kein dangerouslySetInnerHTML — alle Werte gehen durch
// React-Escaping. Nesting wird nicht unterstützt (Tiptap-Mark-Schema
// verhindert das im Editor).
//
// Source-Marker `[^N]` linkt direkt auf die externe URL der Quelle, falls
// vorhanden. Fallback: Anchor auf das Source-Liste-Item am Article-Ende
// (`#source-N`).
type RenderInner = (text: string) => ReactNode;

type Pattern = {
  re: RegExp;
  render: (m: RegExpExecArray, key: number, renderInner: RenderInner) => ReactNode;
};

function buildPatterns(): Pattern[] {
  return [
    {
      re: /\[\^(\d+)\]/,
      render: (m, key) => {
        // Source-Refs haben keinen Inhalt zum Rekursieren — nur die Zahl.
        // Anker auf den entsprechenden Eintrag in der Quellen-Liste am
        // Artikel-Ende. Externe URL ist NUR dort klickbar, damit Leser
        // den Kontext der Quelle sehen können bevor sie wegspringen.
        const n = m[1];
        return (
          <sup key={key}>
            <a href={`#source-${n}`} className="article-source-ref">
              {n}
            </a>
          </sup>
        );
      },
    },
    {
      re: /\[\[([^\]]+)\]\]\(([^)]+)\)/,
      render: (m, key, renderInner) => (
        <Link key={key} href={`/artikel/${m[1]}`} className="internal-link">
          {renderInner(m[2])}
        </Link>
      ),
    },
    {
      re: /\[([^\]]+)\]\(([^)]+)\)/,
      render: (m, key, renderInner) => (
        <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer">
          {renderInner(m[1])}
        </a>
      ),
    },
    {
      re: /\{\{(g|o)\}\}([\s\S]*?)\{\{\/\1\}\}/,
      render: (m, key, renderInner) => (
        <mark
          key={key}
          className={m[1] === "g" ? "hl-green" : "hl-orange"}
          style={{
            background: m[1] === "g" ? "var(--da-green)" : "var(--da-orange)",
            color: "var(--da-dark)",
            padding: "1px 6px",
            borderRadius: 3,
            fontWeight: 600,
          }}
        >
          {renderInner(m[2])}
        </mark>
      ),
    },
    {
      re: /\{\{(lg|xl)\}\}([\s\S]*?)\{\{\/\1\}\}/,
      render: (m, key, renderInner) => (
        <span
          key={key}
          className={`size-${m[1]}`}
          style={{ fontSize: m[1] === "xl" ? "1.5em" : "1.2em" }}
        >
          {renderInner(m[2])}
        </span>
      ),
    },
    {
      re: /\*\*([\s\S]+?)\*\*/,
      render: (m, key, renderInner) => <strong key={key}>{renderInner(m[1])}</strong>,
    },
    {
      re: /_([^_\n]+)_/,
      render: (m, key, renderInner) => <em key={key}>{renderInner(m[1])}</em>,
    },
  ];
}

// Mappt `[^N]`-Marker im Content auf ihre Display-Nummer aus dem
// Source-Mapping (1-indexed Reihenfolge erstes Vorkommen). Wird vor
// `renderInline` aufgerufen, damit der Source-Pattern-Renderer im
// PATTERNS-Array nichts vom Mapping wissen muss.
function applySourceMapping(
  content: string,
  mapping: Map<number, number>,
): string {
  if (mapping.size === 0) return content;
  return content.replace(/\[\^(\d+)\]/g, (_, n) => {
    const original = parseInt(n, 10);
    const display = mapping.get(original);
    if (!display) return ""; // Dangling reference — Marker still entfernen
    return `[^${display}]`;
  });
}

// Schreibt einen Plain-Text-String in die ReactNode-Liste, splittet dabei
// auf `\n` und setzt zwischen den Segmenten `<br/>`-Elemente ein. `\n` im
// content-String entspricht dem Shift+Enter im Editor (hardBreak-Inline-
// Node) bzw. Bestands-Multi-Line-Paragraphs aus der Alt-System-Zeit.
// Render via JSX-Element, kein dangerouslySetInnerHTML — XSS-sicher.
function pushTextWithBreaks(
  nodes: ReactNode[],
  text: string,
  keyPrefix: string,
): void {
  if (text.length === 0) return;
  if (!text.includes("\n")) {
    nodes.push(text);
    return;
  }
  const parts = text.split("\n");
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length > 0) nodes.push(parts[i]);
    if (i < parts.length - 1) nodes.push(<br key={`${keyPrefix}-br-${i}`} />);
  }
}

function renderInline(content: string, patterns: Pattern[]): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = content;
  let key = 0;
  // Rekursions-Callback: lässt jeden Pattern auf seine Capture-Gruppe
  // erneut den Parser laufen, damit verschachtelte Marker wie
  // `_**bold inside italic**_` korrekt gerendert werden.
  const renderInner: RenderInner = (text) => renderInline(text, patterns);

  while (rest.length > 0) {
    let bestIdx = -1;
    let bestMatch: RegExpExecArray | null = null;
    let bestPatternIdx = -1;

    for (let i = 0; i < patterns.length; i++) {
      const m = patterns[i].re.exec(rest);
      if (m && (bestIdx < 0 || m.index < bestIdx)) {
        bestIdx = m.index;
        bestMatch = m;
        bestPatternIdx = i;
      }
    }

    if (bestMatch === null) {
      pushTextWithBreaks(nodes, rest, `t${key++}`);
      break;
    }

    if (bestIdx > 0) {
      pushTextWithBreaks(nodes, rest.slice(0, bestIdx), `t${key++}`);
    }
    nodes.push(patterns[bestPatternIdx].render(bestMatch, key++, renderInner));
    rest = rest.slice(bestIdx + bestMatch[0].length);
  }

  return nodes;
}

const IMAGE_SIZE_PCT: Record<string, string> = {
  small: "50%",
  normal: "75%",
  full: "100%",
};

function imageMargin(size: string, alignment: string): string {
  if (size === "full") return "32px auto";
  if (alignment === "left") return "32px 0 32px 0";
  if (alignment === "right") return "32px 0 32px auto";
  return "32px auto";
}

// buildSourceOrder + computeSourceListItems leben in ./blockReader/sources.ts
// (oben importiert), damit sie ohne React-Renderer testbar sind.

function renderBlock(
  b: Block,
  sourceMapping: Map<number, number>,
  patterns: Pattern[],
): ReactNode {
  const inline = (text: string) =>
    renderInline(applySourceMapping(text, sourceMapping), patterns);
  switch (b.type) {
    case "heading": {
      const style = {
        scrollMarginTop: "calc(var(--nav-h) + 80px)",
        ...(b.alignment ? { textAlign: b.alignment } : {}),
      } as React.CSSProperties;
      if (b.level === 2) return <h2 id={b.id} style={style}>{inline(b.content)}</h2>;
      if (b.level === 3) return <h3 id={b.id} style={style}>{inline(b.content)}</h3>;
      return <h4 id={b.id} style={style}>{inline(b.content)}</h4>;
    }
    case "paragraph":
      return (
        <p style={b.alignment ? { textAlign: b.alignment } : undefined}>
          {inline(b.content)}
        </p>
      );
    case "quote":
      return (
        <blockquote
          style={b.alignment ? { textAlign: b.alignment } : undefined}
        >
          <span>{inline(b.content)}</span>
          {b.attribution && (
            <footer style={{ display: "block", marginTop: 12, color: "var(--da-muted)", fontStyle: "normal", fontSize: 14 }}>
              — {b.attribution}
            </footer>
          )}
        </blockquote>
      );
    case "list":
      return b.ordered ? (
        <ol style={b.alignment ? { textAlign: b.alignment } : undefined}>
          {b.items.map((it, i) => <li key={i}>{inline(it)}</li>)}
        </ol>
      ) : (
        <ul style={b.alignment ? { textAlign: b.alignment } : undefined}>
          {b.items.map((it, i) => <li key={i}>{inline(it)}</li>)}
        </ul>
      );
    case "code":
      return (
        <pre style={{ background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: 6, padding: "16px 18px", overflow: "auto" }}>
          <code style={{ fontFamily: "var(--da-font-mono)", fontSize: 14, color: "var(--da-green)", background: "transparent", padding: 0 }}>
            {b.content}
          </code>
        </pre>
      );
    case "image": {
      const widthPct = IMAGE_SIZE_PCT[b.size] ?? "100%";
      return (
        <figure
          style={{
            margin: imageMargin(b.size, b.alignment),
            width: widthPct,
            maxWidth: "100%",
          }}
        >
          <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 8, overflow: "hidden" }}>
            <Image
              src={b.url}
              alt={b.alt}
              fill
              sizes={`(max-width: 860px) 100vw, ${widthPct === "100%" ? "860px" : widthPct}`}
              style={{ objectFit: "cover" }}
              unoptimized
            />
          </div>
          {b.caption && (
            <figcaption style={{ marginTop: 10, color: "var(--da-text)", fontSize: 14, fontWeight: 600, textAlign: "center" }}>
              {b.caption}
            </figcaption>
          )}
          {b.source && (
            <small style={{ display: "block", marginTop: 4, color: "var(--da-muted-soft)", fontSize: 12, fontStyle: "italic", textAlign: "center" }}>
              {b.source}
            </small>
          )}
        </figure>
      );
    }
    case "statbox":
      return (
        <aside
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            margin: "32px 0",
          }}
        >
          {b.items.map((it, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,140,66,0.1)",
                border: "1px solid var(--da-orange)",
                borderRadius: 8,
                padding: "20px 18px",
              }}
            >
              <div style={{ color: "var(--da-orange)", fontSize: 28, fontWeight: 700, fontFamily: "var(--da-font-display)", lineHeight: 1.1, marginBottom: 8 }}>
                {it.value}
              </div>
              <div style={{ color: "var(--da-text)", fontSize: 14, lineHeight: 1.5 }}>
                {it.label}
              </div>
            </div>
          ))}
        </aside>
      );
    case "disclaimer":
      return (
        <aside
          style={{
            border: "1px solid var(--da-orange)",
            borderRadius: 8,
            padding: "18px 22px",
            margin: "28px 0",
            background: "rgba(255,140,66,0.04)",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--da-text)", fontSize: 14, lineHeight: 1.6, marginBottom: b.linkText && b.linkUrl ? 8 : 0 }}>
            {b.text}
            {b.linkText && b.linkUrl && (
              <>
                {" "}
                <a
                  href={b.linkUrl}
                  style={{
                    color: "var(--da-green)",
                    fontWeight: 600,
                    fontSize: "inherit",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  }}
                >
                  {b.linkText} →
                </a>
              </>
            )}
          </p>
        </aside>
      );
    case "internalArticleCard":
      return (
        <Link
          href={`/artikel/${b.articleSlug}`}
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            background: "var(--da-card)",
            border: "1px solid var(--da-border)",
            borderRadius: 8,
            padding: 16,
            margin: "28px 0",
            textDecoration: "none",
            color: "var(--da-text)",
          }}
        >
          {b.cachedCoverUrl && (
            <div style={{ position: "relative", flex: "0 0 120px", width: 120, height: 80, borderRadius: 4, overflow: "hidden" }}>
              <Image src={b.cachedCoverUrl} alt="" fill sizes="120px" style={{ objectFit: "cover" }} unoptimized />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "var(--da-green)", fontSize: 10, fontFamily: "var(--da-font-mono)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
              Verwandter Artikel
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "var(--da-font-display)", marginBottom: 4 }}>
              {b.cachedTitle}
            </div>
            {b.cachedExcerpt && (
              <div style={{ color: "var(--da-muted)", fontSize: 13, lineHeight: 1.5 }}>
                {b.cachedExcerpt}
              </div>
            )}
          </div>
        </Link>
      );
    case "divider":
      if (b.variant === "short") {
        return (
          <div style={{ textAlign: "center", margin: "40px 0" }}>
            <hr
              style={{
                display: "inline-block",
                width: 80,
                height: 1,
                border: 0,
                background: "var(--da-border)",
              }}
            />
          </div>
        );
      }
      return <hr style={{ margin: "32px 0", border: 0, borderTop: "1px solid var(--da-border)" }} />;
  }
}

// Renders the source list at the end of the article. Items werden von
// computeSourceListItems (in ./blockReader/sources.ts) bestimmt:
//   - Body MIT [^N]-Refs → in Auftrittsreihenfolge (Auto-Renumber-Spec)
//   - Body OHNE Refs aber sources vorhanden → alle in Array-Reihenfolge
// Visuelle Gestaltung unveraendert.
function renderSourceList(sources: Source[], order: number[]): ReactNode {
  const items = computeSourceListItems(sources, order);
  if (items.length === 0) return null;
  return (
    <section
      style={{
        marginTop: "var(--sp-12)",
        paddingTop: "var(--sp-6)",
        borderTop: "1px solid var(--da-border)",
      }}
    >
      <h2 style={{ fontFamily: "var(--da-font-display)", fontSize: 20, marginBottom: 12 }}>
        Quellen
      </h2>
      <ol style={{ paddingLeft: 22 }}>
        {items.map(({ display, source: s }) => (
          <li
            key={display}
            id={`source-${display}`}
            style={{ marginBottom: 8, color: "var(--da-muted)", fontSize: 14, scrollMarginTop: "calc(var(--nav-h) + 80px)" }}
          >
            {s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--da-green)" }}>
                {s.text}
              </a>
            ) : (
              s.text
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function BlockReader({ doc, blocks }: BlockReaderProps) {
  // Backward-compat: alte Aufrufe mit blocks={...} unterstützen.
  const effectiveBlocks: Block[] = doc?.blocks ?? blocks ?? [];
  const sources: Source[] = doc?.sources ?? [];
  const { mapping, order } = buildSourceOrder(effectiveBlocks);
  const patterns = buildPatterns();

  return (
    <>
      {effectiveBlocks.map((b) => (
        <span key={b.id} style={{ display: "contents" }}>
          {renderBlock(b, mapping, patterns)}
        </span>
      ))}
      {renderSourceList(sources, order)}
    </>
  );
}

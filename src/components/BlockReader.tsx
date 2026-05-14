import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Block, BlockDocument, Source } from "@/types/blocks";

type BlockReaderProps = {
  doc?: BlockDocument;
  blocks?: Block[];
};

// Inline-Marker-Renderer. Markdown-Subset + Custom-Marker werden zu React-
// Nodes umgesetzt. Kein dangerouslySetInnerHTML — alle Werte gehen durch
// React-Escaping. Nesting wird nicht unterstützt (FloatingToolbar verhindert
// das im Editor).
const PATTERNS: {
  re: RegExp;
  render: (m: RegExpExecArray, key: number) => ReactNode;
}[] = [
  {
    re: /\[\^(\d+)\]/,
    render: (m, key) => (
      <sup key={key}>
        <a href={`#source-${m[1]}`} className="article-source-ref">
          {m[1]}
        </a>
      </sup>
    ),
  },
  {
    re: /\[\[([^\]]+)\]\]\(([^)]+)\)/,
    render: (m, key) => (
      <Link key={key} href={`/artikel/${m[1]}`} className="internal-link">
        {m[2]}
      </Link>
    ),
  },
  {
    re: /\[([^\]]+)\]\(([^)]+)\)/,
    render: (m, key) => (
      <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer">
        {m[1]}
      </a>
    ),
  },
  {
    re: /\{\{(g|o)\}\}([\s\S]*?)\{\{\/\1\}\}/,
    render: (m, key) => (
      <mark
        key={key}
        className={m[1] === "g" ? "hl-green" : "hl-orange"}
        style={{
          background:
            m[1] === "g"
              ? "rgba(50,255,126,0.2)"
              : "rgba(255,140,66,0.2)",
          color: "inherit",
          padding: "1px 4px",
          borderRadius: 2,
        }}
      >
        {m[2]}
      </mark>
    ),
  },
  {
    re: /\{\{(lg|xl)\}\}([\s\S]*?)\{\{\/\1\}\}/,
    render: (m, key) => (
      <span
        key={key}
        className={`size-${m[1]}`}
        style={{ fontSize: m[1] === "xl" ? "1.5em" : "1.2em" }}
      >
        {m[2]}
      </span>
    ),
  },
  {
    re: /\*\*([\s\S]+?)\*\*/,
    render: (m, key) => <strong key={key}>{m[1]}</strong>,
  },
  {
    re: /_([^_\n]+)_/,
    render: (m, key) => <em key={key}>{m[1]}</em>,
  },
];

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

function renderInline(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = content;
  let key = 0;

  while (rest.length > 0) {
    let bestIdx = -1;
    let bestMatch: RegExpExecArray | null = null;
    let bestPatternIdx = -1;

    for (let i = 0; i < PATTERNS.length; i++) {
      const m = PATTERNS[i].re.exec(rest);
      if (m && (bestIdx < 0 || m.index < bestIdx)) {
        bestIdx = m.index;
        bestMatch = m;
        bestPatternIdx = i;
      }
    }

    if (bestMatch === null) {
      nodes.push(rest);
      break;
    }

    if (bestIdx > 0) {
      nodes.push(rest.slice(0, bestIdx));
    }
    nodes.push(PATTERNS[bestPatternIdx].render(bestMatch, key++));
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

// Walks blocks to find `[^N]` markers in appearance order. Returns:
//   - mapping: originalN → displayN (1-indexed, in order of first occurrence)
//   - order: sequence of originalN values (display position = index + 1)
function buildSourceOrder(blocks: Block[]): {
  mapping: Map<number, number>;
  order: number[];
} {
  const mapping = new Map<number, number>();
  const order: number[] = [];
  const re = /\[\^(\d+)\]/g;

  function scan(text: string) {
    for (const m of text.matchAll(re)) {
      const n = parseInt(m[1], 10);
      if (!mapping.has(n)) {
        mapping.set(n, order.length + 1);
        order.push(n);
      }
    }
  }

  for (const b of blocks) {
    if (b.type === "heading" || b.type === "paragraph" || b.type === "quote") {
      scan(b.content);
    } else if (b.type === "list") {
      for (const item of b.items) scan(item);
    }
  }

  return { mapping, order };
}

function renderBlock(
  b: Block,
  sourceMapping: Map<number, number>,
): ReactNode {
  const inline = (text: string) =>
    renderInline(applySourceMapping(text, sourceMapping));
  switch (b.type) {
    case "heading": {
      const style = { scrollMarginTop: "calc(var(--nav-h) + 80px)" } as const;
      if (b.level === 2) return <h2 id={b.id} style={style}>{inline(b.content)}</h2>;
      if (b.level === 3) return <h3 id={b.id} style={style}>{inline(b.content)}</h3>;
      return <h4 id={b.id} style={style}>{inline(b.content)}</h4>;
    }
    case "paragraph":
      return <p>{inline(b.content)}</p>;
    case "quote":
      return (
        <blockquote>
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
        <ol>
          {b.items.map((it, i) => <li key={i}>{inline(it)}</li>)}
        </ol>
      ) : (
        <ul>
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
          </p>
          {b.linkText && b.linkUrl && (
            <a
              href={b.linkUrl}
              style={{ color: "var(--da-green)", fontWeight: 600, textDecoration: "none" }}
            >
              {b.linkText} →
            </a>
          )}
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

// Renders the source list at the end of the article. Order is determined by
// `order` (first-appearance in body), not by sources[] index — implements
// the auto-renumbering spec. Dangling references (Marker auf nicht-
// existierende Quelle) werden übersprungen.
function renderSourceList(sources: Source[], order: number[]): ReactNode {
  if (order.length === 0) return null;
  const items: { display: number; source: Source }[] = [];
  order.forEach((originalN, i) => {
    const s = sources[originalN - 1];
    if (s) items.push({ display: i + 1, source: s });
  });
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

  return (
    <>
      {effectiveBlocks.map((b) => (
        <span key={b.id} style={{ display: "contents" }}>
          {renderBlock(b, mapping)}
        </span>
      ))}
      {renderSourceList(sources, order)}
    </>
  );
}

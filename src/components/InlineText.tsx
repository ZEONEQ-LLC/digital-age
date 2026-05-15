import Link from "next/link";
import type { ReactNode } from "react";
import type { Source } from "@/types/blocks";

// Standalone-Renderer für Inline-Marker (Markdown-Subset + Custom-Marker).
// Wird verwendet wo wir kurzen Text mit Formatting rendern wollen, ohne
// das volle BlockDocument-Setup zu brauchen (z.B. Abstract auf der Detail-
// Page, Excerpt in der Vorschau).
//
// Source-Markers `[^N]` verweisen direkt auf `sources[N-1]` (kein Auto-
// Renumbering, weil dieser Komponente das Block-Kontext fehlt). Externe URL
// wird genutzt falls vorhanden, sonst Anchor `#source-N`.

type RenderInner = (text: string) => ReactNode;

type Pattern = {
  re: RegExp;
  render: (m: RegExpExecArray, key: number, renderInner: RenderInner) => ReactNode;
};

function buildPatterns(sourceUrlByN: Map<number, string>): Pattern[] {
  return [
    {
      re: /\[\^(\d+)\]/,
      render: (m, key) => {
        // Source-Refs: keine Capture-Gruppe zum Rekursieren.
        const n = m[1];
        const url = sourceUrlByN.get(parseInt(n, 10));
        if (url) {
          return (
            <sup key={key}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="article-source-ref"
              >
                {n}
              </a>
            </sup>
          );
        }
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

function renderTokens(content: string, patterns: Pattern[]): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = content;
  let key = 0;
  // Rekursions-Callback für verschachtelte Marker (z.B. `_**text**_`).
  const renderInner: RenderInner = (text) => renderTokens(text, patterns);

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
      nodes.push(rest);
      break;
    }
    if (bestIdx > 0) {
      nodes.push(rest.slice(0, bestIdx));
    }
    nodes.push(patterns[bestPatternIdx].render(bestMatch, key++, renderInner));
    rest = rest.slice(bestIdx + bestMatch[0].length);
  }
  return nodes;
}

type Props = {
  content: string;
  sources?: Source[];
};

export default function InlineText({ content, sources = [] }: Props) {
  const sourceUrlByN = new Map<number, string>();
  sources.forEach((s, i) => {
    if (s.url) sourceUrlByN.set(i + 1, s.url);
  });
  const patterns = buildPatterns(sourceUrlByN);
  return <>{renderTokens(content, patterns)}</>;
}

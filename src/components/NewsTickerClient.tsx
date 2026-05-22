"use client";

import { useEffect, useState } from "react";

export type TickerItem = {
  id: string;
  title: string;
  teaser: string;
  summary: string;
  category: string | null;
  source_url: string;
  source_name: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  "ki-business": "KI & Business",
  "future-tech": "Future Tech",
  "swiss-ai": "Swiss AI",
  tools: "Tools",
};

function labelFor(cat: string | null): string {
  if (!cat) return "News";
  return CATEGORY_LABELS[cat] ?? cat;
}

type Props = {
  items: TickerItem[];
};

export default function NewsTickerClient({ items }: Props) {
  // Repeat 3x für nahtloses Loop-Scrolling (gleicher Trick wie vorher).
  const repeated = [...items, ...items, ...items];
  const [selected, setSelected] = useState<TickerItem | null>(null);

  // ESC schliesst Modal.
  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .ticker-scroll {
          animation: scroll 40s linear infinite;
          display: inline-flex;
          gap: 64px;
          white-space: nowrap;
          will-change: transform;
        }
        .ticker-scroll:hover { animation-play-state: paused; }
        .ticker-item {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 13px; cursor: pointer; color: var(--da-text-strong);
          background: transparent; border: none; padding: 0;
          font-family: inherit;
        }
        .ticker-item:hover .ticker-text { color: var(--da-green); }
      `}</style>

      <div
        style={{
          backgroundColor: "var(--da-card)",
          borderBottom: "1px solid var(--da-border)",
          display: "flex",
          alignItems: "center",
          height: "40px",
          overflow: "hidden",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            flexShrink: 0,
            backgroundColor: "var(--da-green)",
            color: "var(--da-dark)",
            fontWeight: 700,
            fontSize: "11px",
            letterSpacing: "0.1em",
            padding: "0 16px",
            height: "100%",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            textTransform: "uppercase",
            zIndex: 10,
          }}
        >
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "var(--da-dark)", display: "inline-block" }} />
          Live
        </div>
        <div style={{ overflow: "hidden", flex: 1, height: "100%", display: "flex", alignItems: "center" }}>
          <div className="ticker-scroll">
            {repeated.map((item, i) => (
              <button
                key={`${item.id}-${i}`}
                type="button"
                className="ticker-item"
                onClick={() => setSelected(item)}
                aria-label={`News-Item öffnen: ${item.title}`}
              >
                <span
                  style={{
                    color: "var(--da-purple)",
                    fontSize: 11,
                    lineHeight: 1,
                  }}
                  title="AI-generiert aus externer Quelle"
                  aria-hidden
                >
                  ✨
                </span>
                <span style={{ color: "var(--da-green)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {labelFor(item.category)}
                </span>
                <span style={{ color: "var(--da-faint)" }}>—</span>
                <span className="ticker-text">{item.teaser}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected && <NewsItemModal item={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function NewsItemModal({ item, onClose }: { item: TickerItem; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--da-card)",
          border: "1px solid var(--da-border)",
          borderRadius: 8,
          padding: "28px 28px 22px",
          maxWidth: 600,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ color: "var(--da-purple)", fontSize: 14, lineHeight: 1 }} aria-hidden>✨</span>
          <span
            style={{
              color: "var(--da-green)",
              fontFamily: "var(--da-font-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {labelFor(item.category)}
          </span>
          <span style={{ color: "var(--da-faint)", fontSize: 12 }}>·</span>
          <span style={{ color: "var(--da-muted)", fontFamily: "var(--da-font-mono)", fontSize: 11 }}>
            AI-kuratiert aus externer Quelle
          </span>
        </div>

        <h2
          style={{
            color: "var(--da-text)",
            fontFamily: "var(--da-font-display)",
            fontSize: "clamp(20px, 3vw, 26px)",
            fontWeight: 700,
            lineHeight: 1.25,
            margin: 0,
          }}
        >
          {item.title}
        </h2>

        <p style={{ color: "var(--da-text-strong)", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
          {item.summary}
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            paddingTop: 8,
            borderTop: "1px solid var(--da-border)",
          }}
        >
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--da-green)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Original lesen bei {item.source_name} ↗
          </a>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              color: "var(--da-muted)",
              border: "1px solid var(--da-border)",
              borderRadius: 4,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>
  );
}

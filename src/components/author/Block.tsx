"use client";

import { useState } from "react";
import type { Block as BlockT } from "@/types/blocks";

type BlockProps = {
  block: BlockT;
  onChange: (next: BlockT) => void;
  onAddBelow: (afterId: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
};

const baseInput: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  color: "var(--da-text)",
  fontFamily: "var(--da-font-body)",
  outline: "none",
  resize: "none",
  padding: 0,
  lineHeight: 1.6,
};

const handleBtn: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 4,
  background: "var(--da-dark)",
  border: "1px solid var(--da-border)",
  color: "var(--da-muted-soft)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
  padding: 0,
  fontFamily: "inherit",
};

export default function Block({
  block,
  onChange,
  onAddBelow,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: BlockProps) {
  const [hov, setHov] = useState(false);

  const renderBody = () => {
    if (block.type === "heading") {
      return (
        <input
          style={{
            ...baseInput,
            fontSize: block.level === 2 ? 26 : 20,
            fontWeight: 700,
            fontFamily: "var(--da-font-display)",
            letterSpacing: block.level === 2 ? "-0.01em" : 0,
          }}
          value={block.content}
          placeholder={`Heading ${block.level}`}
          onChange={(e) => onChange({ ...block, content: e.target.value })}
        />
      );
    }
    if (block.type === "paragraph") {
      return (
        <textarea
          rows={Math.max(2, block.content.split("\n").length)}
          style={{ ...baseInput, fontSize: 15, color: "var(--da-text-strong)" }}
          value={block.content}
          placeholder="Schreib hier… **bold**, _italic_, [link](url) supported"
          onChange={(e) => onChange({ ...block, content: e.target.value })}
        />
      );
    }
    if (block.type === "quote") {
      return (
        <div style={{ borderLeft: "3px solid var(--da-green)", paddingLeft: 16 }}>
          <textarea
            rows={2}
            style={{ ...baseInput, fontSize: 18, fontStyle: "italic", color: "var(--da-text)" }}
            value={block.content}
            placeholder="Zitat…"
            onChange={(e) => onChange({ ...block, content: e.target.value })}
          />
          <input
            style={{ ...baseInput, fontSize: 13, color: "var(--da-muted-soft)", marginTop: 6 }}
            value={block.attribution ?? ""}
            placeholder="— Wer hat es gesagt"
            onChange={(e) => onChange({ ...block, attribution: e.target.value })}
          />
        </div>
      );
    }
    if (block.type === "code") {
      return (
        <pre
          style={{
            background: "var(--da-dark)",
            border: "1px solid var(--da-border)",
            borderRadius: 4,
            padding: 14,
            margin: 0,
          }}
        >
          <textarea
            rows={4}
            style={{
              ...baseInput,
              fontFamily: "var(--da-font-mono)",
              fontSize: 13,
              color: "var(--da-purple)",
            }}
            value={block.content}
            placeholder="// Code…"
            onChange={(e) => onChange({ ...block, content: e.target.value })}
          />
        </pre>
      );
    }
    if (block.type === "list") {
      const items = block.items.length > 0 ? block.items : [""];
      return (
        <ul style={{ paddingLeft: 22, color: "var(--da-text-strong)", fontSize: 15, listStyleType: block.ordered ? "decimal" : "disc" }}>
          {items.map((it, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              <input
                style={{ ...baseInput, fontSize: 15 }}
                value={it}
                placeholder="Listenpunkt"
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  onChange({ ...block, items: next });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const next = [...items];
                    next.splice(i + 1, 0, "");
                    onChange({ ...block, items: next });
                  }
                  if (e.key === "Backspace" && it === "" && items.length > 1) {
                    e.preventDefault();
                    const next = items.filter((_, j) => j !== i);
                    onChange({ ...block, items: next });
                  }
                }}
              />
            </li>
          ))}
        </ul>
      );
    }
    if (block.type === "image") {
      return (
        <div>
          <div
            style={{
              background: "var(--da-dark)",
              border: "2px dashed var(--da-border)",
              borderRadius: 6,
              padding: 24,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            <p style={{ color: "var(--da-muted-soft)", fontSize: 13, marginBottom: 4 }}>
              📷 Bild-URL einfügen (Upload kommt mit Supabase)
            </p>
          </div>
          <input
            style={{
              ...baseInput,
              fontSize: 12,
              color: "var(--da-text-strong)",
              background: "var(--da-dark)",
              border: "1px solid var(--da-border)",
              borderRadius: 4,
              padding: "8px 10px",
              marginBottom: 6,
            }}
            value={block.src}
            placeholder="https://… (Bild-URL)"
            onChange={(e) => onChange({ ...block, src: e.target.value })}
          />
          <input
            style={{
              ...baseInput,
              fontSize: 12,
              color: "var(--da-text-strong)",
              background: "var(--da-dark)",
              border: "1px solid var(--da-border)",
              borderRadius: 4,
              padding: "8px 10px",
              marginBottom: 6,
            }}
            value={block.alt}
            placeholder="Alt-Text (Pflicht für Accessibility)"
            onChange={(e) => onChange({ ...block, alt: e.target.value })}
          />
          <input
            style={{ ...baseInput, fontSize: 12, color: "var(--da-muted)", textAlign: "center" }}
            value={block.caption ?? ""}
            placeholder="Bildunterschrift…"
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ position: "relative", padding: "12px 0" }}
    >
      <div
        style={{
          position: "absolute",
          left: -64,
          top: 12,
          display: hov ? "flex" : "none",
          gap: 4,
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={() => onMoveUp(block.id)}
          disabled={isFirst}
          title="Nach oben"
          style={{ ...handleBtn, opacity: isFirst ? 0.4 : 1, cursor: isFirst ? "not-allowed" : "pointer" }}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(block.id)}
          disabled={isLast}
          title="Nach unten"
          style={{ ...handleBtn, opacity: isLast ? 0.4 : 1, cursor: isLast ? "not-allowed" : "pointer" }}
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => onAddBelow(block.id)}
          title="Block darunter einfügen"
          style={handleBtn}
        >
          +
        </button>
        <button type="button" onClick={() => onDelete(block.id)} title="Löschen" style={handleBtn}>
          ×
        </button>
      </div>
      {renderBody()}
    </div>
  );
}

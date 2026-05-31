"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import type { StatBoxItem } from "@/types/blocks";

const EMPTY_ITEMS: [StatBoxItem, StatBoxItem, StatBoxItem] = [
  { value: "", label: "" },
  { value: "", label: "" },
  { value: "", label: "" },
];

// In-place Editor-View für StatBox (3-Spalten-Grid, value oben gross orange,
// label-Textarea darunter). 1:1 aus der Sandbox übernommen, nur Path-Update.
export default function StatBoxNodeView({ node, updateAttributes }: NodeViewProps) {
  const items = ((node.attrs.items as StatBoxItem[]) ?? EMPTY_ITEMS).slice(0, 3) as [
    StatBoxItem,
    StatBoxItem,
    StatBoxItem,
  ];
  while (items.length < 3) items.push({ value: "", label: "" });

  const setItem = (i: 0 | 1 | 2, patch: Partial<StatBoxItem>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    updateAttributes({ items: next });
  };

  const inputBase: React.CSSProperties = {
    width: "100%",
    background: "var(--da-darker)",
    color: "var(--da-text)",
    border: "1px solid var(--da-border)",
    borderRadius: 4,
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
  };

  return (
    <NodeViewWrapper as="div" contentEditable={false}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          background: "rgba(255,140,66,0.06)",
          border: "1px solid var(--da-orange)",
          borderRadius: 8,
          padding: 16,
          margin: "1rem 0",
        }}
      >
        {([0, 1, 2] as const).map((i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              style={{
                ...inputBase,
                fontSize: 22,
                fontWeight: 700,
                fontFamily: "var(--da-font-display)",
                color: "var(--da-orange)",
              }}
              value={items[i].value}
              placeholder="Zahl"
              onChange={(e) => setItem(i, { value: e.target.value })}
            />
            <textarea
              rows={2}
              style={{ ...inputBase, fontSize: 13, color: "var(--da-text)", resize: "vertical" }}
              value={items[i].label}
              placeholder="Beschreibung"
              onChange={(e) => setItem(i, { label: e.target.value })}
            />
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  );
}

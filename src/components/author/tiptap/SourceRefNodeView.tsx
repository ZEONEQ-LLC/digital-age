"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

// Read-only Inline-View für Source-Refs `[^N]`. Etappe A: Refs werden nur
// sichtbar gemacht, nicht editierbar (Picker / Neuanlage kommt in Etappe B).
// Visuell: hochgestellte grüne Zahl, identisch zur Public-Page (BlockReader
// rendert `<sup><a class="article-source-ref">{n}</a></sup>`). Kein Anker
// im Editor — wir verlinken nirgendwo hin, das Klick-Verhalten gehört auf
// die Public-Page.
export default function SourceRefNodeView({ node }: NodeViewProps) {
  const n = node.attrs.n as number;
  return (
    <NodeViewWrapper as="sup" data-source-ref={n} contentEditable={false} draggable={false} style={{ display: "inline" }}>
      <span
        style={{
          fontFamily: "var(--da-font-mono)",
          fontWeight: 600,
          color: "var(--da-green)",
          padding: "0 2px",
          userSelect: "none",
        }}
      >
        {n}
      </span>
    </NodeViewWrapper>
  );
}

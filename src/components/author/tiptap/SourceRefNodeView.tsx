"use client";

import { useContext } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { SourceRefDisplayContext } from "./sourceRefDisplay";

// Read-only Inline-View für Source-Refs `[^N]`. Etappe A: Refs werden nur
// sichtbar gemacht, nicht editierbar (Picker / Neuanlage kommt in Etappe B).
// Visuell: hochgestellte grüne Zahl, identisch zur Public-Page (BlockReader
// rendert `<sup><a class="article-source-ref">{n}</a></sup>`). Kein Anker
// im Editor — wir verlinken nirgendwo hin, das Klick-Verhalten gehört auf
// die Public-Page.
//
// ANZEIGE-Nummer: `node.attrs.n` ist die Storage-Position (sources[n-1]).
// Wenn ein Provider eine Live-Map liefert (Body-Editor), zeigen wir den
// Auftritts-Rang `map.get(n)` — exakt wie der Renderer. Fallback: rohes n
// (Abstract-/Page-Editor, wo der Renderer ebenfalls roh nummeriert).
// REINE ANZEIGE — attrs.n wird nie verändert.
export default function SourceRefNodeView({ node }: NodeViewProps) {
  const n = node.attrs.n as number;
  const displayMap = useContext(SourceRefDisplayContext);
  const display = displayMap?.get(n) ?? n;
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
        {display}
      </span>
    </NodeViewWrapper>
  );
}

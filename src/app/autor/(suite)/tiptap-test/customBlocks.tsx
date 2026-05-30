// Custom Tiptap-Nodes für den Body-Editor.
//
// Konventionen aus src/types/blocks.ts:
// - StatBox hat IMMER drei Items (Tuple). Items als JSON-Attribute.
// - Divider hat variant "full" | "short". Default "full".
//
// Disclaimer + RelatedArticle wurden bewusst NICHT als Tiptap-Nodes
// modelliert — die liegen in der Footer-Zone ausserhalb des Body-
// Editors (eigener React-State, beim Serialisieren ans Block[]-Ende
// gehängt).

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { StatBoxItem } from "@/types/blocks";
import StatBoxNodeView from "./StatBoxNodeView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    daStatBox: {
      setStatBox: () => ReturnType;
    };
    daDivider: {
      setDaDivider: (variant?: "full" | "short") => ReturnType;
    };
  }
}

const EMPTY_ITEMS: [StatBoxItem, StatBoxItem, StatBoxItem] = [
  { value: "", label: "" },
  { value: "", label: "" },
  { value: "", label: "" },
];

export const StatBoxBlock = Node.create({
  name: "daStatBox",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      items: {
        default: EMPTY_ITEMS,
        parseHTML: (el: HTMLElement) => {
          try {
            const raw = el.getAttribute("data-items");
            const parsed = raw ? JSON.parse(raw) : EMPTY_ITEMS;
            if (Array.isArray(parsed) && parsed.length === 3) return parsed;
          } catch {
            // ignore
          }
          return EMPTY_ITEMS;
        },
        renderHTML: (attrs: { items?: StatBoxItem[] }) => ({
          "data-items": JSON.stringify(attrs.items ?? EMPTY_ITEMS),
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="stat-box"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "stat-box", class: "da-stat-box" }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(StatBoxNodeView);
  },
  addCommands() {
    return {
      setStatBox:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { items: EMPTY_ITEMS } }),
    };
  },
});

export const DaDividerBlock = Node.create({
  name: "daDivider",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      variant: {
        default: "full" as const,
        parseHTML: (el: HTMLElement) =>
          (el.getAttribute("data-variant") as "full" | "short") ?? "full",
        renderHTML: (attrs: { variant?: "full" | "short" }) => ({
          "data-variant": attrs.variant ?? "full",
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'hr[data-type="da-divider"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["hr", mergeAttributes(HTMLAttributes, { "data-type": "da-divider" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(({ node }) => (
      <NodeViewWrapper>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "12px 0",
            opacity: 0.6,
          }}
          data-variant={node.attrs.variant}
        >
          <hr
            style={{
              width: node.attrs.variant === "short" ? 80 : "100%",
              border: 0,
              borderTop: "1px solid var(--da-border)",
              margin: 0,
            }}
          />
        </div>
      </NodeViewWrapper>
    ));
  },
  addCommands() {
    return {
      setDaDivider:
        (variant) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { variant: variant ?? "full" },
          }),
    };
  },
});

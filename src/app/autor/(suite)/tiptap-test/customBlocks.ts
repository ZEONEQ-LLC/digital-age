// Custom Tiptap-Blocks für die Test-Sandbox.
// POC für die geplante Migration: bewusst minimal — kein Markdown-
// Roundtrip, keine DB-Persistenz, keine Sanitisierung. Kommt mit der
// echten Migration.

import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    daDisclaimer: {
      setDisclaimer: () => ReturnType;
    };
    daStatBox: {
      setStatBox: (attrs?: { value?: string; label?: string }) => ReturnType;
    };
  }
}

export const StatBox = Node.create({
  name: "daStatBox",
  group: "block",
  content: "inline*",
  defining: true,
  addAttributes() {
    return {
      value: { default: "" },
      label: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="stat-box"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "stat-box", class: "da-stat-box" }),
      0,
    ];
  },
  addCommands() {
    return {
      setStatBox:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { value: attrs?.value ?? "42%", label: attrs?.label ?? "Label" },
            content: [
              { type: "text", text: `${attrs?.value ?? "42%"} — ${attrs?.label ?? "Label"}` },
            ],
          }),
    };
  },
});

export const Disclaimer = Node.create({
  name: "daDisclaimer",
  group: "block",
  content: "inline*",
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-type="disclaimer"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "disclaimer", class: "da-disclaimer" }),
      0,
    ];
  },
  addCommands() {
    return {
      setDisclaimer:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: [{ type: "text", text: "Disclaimer-Text hier…" }],
          }),
    };
  },
});

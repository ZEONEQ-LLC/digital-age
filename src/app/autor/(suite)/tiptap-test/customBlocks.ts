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
  }
}

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

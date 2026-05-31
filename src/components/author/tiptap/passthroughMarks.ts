// Pass-Through-Tiptap-Marks für Bestand-Schutz.
//
// Die Token `[[slug]](title)` und `{{lg|xl}}…{{/lg|xl}}` werden vom Block-
// Konverter (`blocksToTiptap` in src/lib/tiptap/blocksToTiptap.ts) zu Marks
// vom Typ `internalLink` bzw. `fontSize` übersetzt. Wenn ein Tiptap-Editor
// diese Mark-Typen NICHT als Extension registriert hat, filtert Tiptap die
// Marks beim setContent-Mount stillschweigend raus — der Token geht im
// Editor verloren und kommt beim Save nicht wieder zurück (lossy parse).
//
// Diese Marks reichen aus, damit der Editor die Mark-Information
// strukturell durchreicht: parseHTML/renderHTML/addAttributes, ABER
// bewusst KEIN addCommands — die Marks lassen sich nicht über die
// Toolbar erzeugen. Sie dienen ausschliesslich dem Bestand-Schutz im
// neuen Abstract-Editor (kann später auch im Body-Editor nachgerüstet
// werden).

import { Mark, mergeAttributes } from "@tiptap/core";

export const InternalLinkMark = Mark.create({
  name: "internalLink",
  inclusive: false,
  addAttributes() {
    return {
      slug: {
        default: "",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-slug") ?? "",
        renderHTML: (attrs: { slug?: string }) => ({
          "data-slug": attrs.slug ?? "",
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'a[data-type="internal-link"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-type": "internal-link",
        class: "da-internal-link",
      }),
      0,
    ];
  },
});

export const FontSizeMark = Mark.create({
  name: "fontSize",
  inclusive: true,
  addAttributes() {
    return {
      size: {
        default: "lg" as "lg" | "xl",
        parseHTML: (el: HTMLElement) =>
          (el.getAttribute("data-size") as "lg" | "xl") ?? "lg",
        renderHTML: (attrs: { size?: "lg" | "xl" }) => ({
          "data-size": attrs.size ?? "lg",
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-type="font-size"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "font-size",
        class: "da-font-size",
      }),
      0,
    ];
  },
});

// Manueller Test-Runner fuer runEditorRoundtripGuard (roundtripGuard.ts).
//   npx tsx src/lib/tiptap/__tests__/roundtripGuard.manual.ts
// Exit 0 = alles gruen, 1 = mind. ein Fail.
//
// Fokus: Fix A1 — blockToPlain verkettet Block-Kinder (Paragraphen in
// listItem/blockquote) mit "\n" statt "". Damit ergeben die Ein-Paragraph-
// mit-hardBreak-Form (Editor) und die Mehrere-Paragraphen-Form (Rebuild via
// blocksToTiptap) dieselbe Plain-Text-Projektion -> kein False-Positive.
//
// Die "rebuilt"-Seite wird fuer die realistischen Faelle GENAU wie im
// EditorClient abgeleitet: blocksToTiptap(tiptapToBlocks(editorDoc)). Damit
// spiegelt der Test den echten Save-Pfad statt ein kuenstliches Doc.

import { runEditorRoundtripGuard } from "../roundtripGuard";
import { tiptapToBlocks } from "../tiptapToBlocks";
import { blocksToTiptap } from "../blocksToTiptap";
import type { TiptapDoc, InlineNode, ParagraphNode } from "../types";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

// Editor-seitiges Doc -> Rebuild wie im echten Save-Pfad.
function rebuildLikeSave(editor: TiptapDoc): TiptapDoc {
  return blocksToTiptap(tiptapToBlocks(editor));
}
function guardAllows(editor: TiptapDoc): boolean {
  return runEditorRoundtripGuard(editor, rebuildLikeSave(editor)).allowed;
}

// --- Node-Helper ---
const t = (text: string): InlineNode => ({ type: "text", text });
const br = (): InlineNode => ({ type: "hardBreak" });
const para = (...content: InlineNode[]): ParagraphNode => ({ type: "paragraph", content });

section("Fixed: hardBreak in Container-Bloecken -> Guard laesst durch");
{
  // bulletList-Item: "Home" + Shift+Enter + "Rent..." (Reproduktionsfall).
  const doc: TiptapDoc = {
    type: "doc",
    content: [
      { type: "bulletList", content: [
        { type: "listItem", content: [ para(t("Home"), br(), t("Rent, mortgage interest.")) ] },
      ]},
    ],
  };
  ok("hardBreak im listItem -> allowed", guardAllows(doc));
}
{
  const doc: TiptapDoc = {
    type: "doc",
    content: [
      { type: "orderedList", content: [
        { type: "listItem", content: [ para(t("Schritt eins"), br(), t("Details dazu.")) ] },
      ]},
    ],
  };
  ok("hardBreak im orderedList-Item -> allowed", guardAllows(doc));
}
{
  const doc: TiptapDoc = {
    type: "doc",
    content: [
      { type: "blockquote", content: [ para(t("Zeile eins"), br(), t("Zeile zwei.")) ] },
    ],
  };
  ok("hardBreak im blockquote -> allowed", guardAllows(doc));
}

section("Regression: hardBreak in paragraph/heading -> weiterhin durch");
{
  const doc: TiptapDoc = {
    type: "doc",
    content: [ para(t("Absatz A"), br(), t("Absatz B.")) ],
  };
  ok("hardBreak im paragraph -> allowed", guardAllows(doc));
}
{
  const doc: TiptapDoc = {
    type: "doc",
    content: [ { type: "heading", attrs: { level: 2 }, content: [ t("Titel A"), br(), t("Titel B") ] } ],
  };
  ok("hardBreak im heading -> allowed", guardAllows(doc));
}

section("Regression: gemischte Marks im Paragraph -> kein spurioses \\n");
{
  // Drei Inline-Runs in einem Paragraphen. Der Fix darf HIER kein "\n"
  // einfuegen (Inline-Join bleibt ""), sonst zerrisse jeder Fett-/Link-Text.
  const doc: TiptapDoc = {
    type: "doc",
    content: [ { type: "paragraph", content: [
      t("Kostet "),
      { type: "text", text: "5 CHF", marks: [{ type: "bold" }] },
      t(" heute."),
    ] } ],
  };
  ok("gemischte Marks -> allowed (kein spurioses \\n)", guardAllows(doc));
}

section("Kern-Regression: ECHTER Verlust blockt weiterhin");
{
  // Linke (Editor-)Seite hat die Grenze als hardBreak: "A\nB".
  const editor: TiptapDoc = {
    type: "doc",
    content: [
      { type: "bulletList", content: [
        { type: "listItem", content: [ para(t("A"), br(), t("B")) ] },
      ]},
    ],
  };
  // Rechte Seite hat die Grenze VOLLSTAENDIG verloren: ein einzelner
  // Text-Node "AB" (kein Break, keine zweite Paragraph-Grenze).
  const rebuiltLossy: TiptapDoc = {
    type: "doc",
    content: [
      { type: "bulletList", content: [
        { type: "listItem", content: [ para(t("AB")) ] },
      ]},
    ],
  };
  const res = runEditorRoundtripGuard(editor, rebuiltLossy);
  ok("echter Grenzverlust (A\\nB vs AB) -> blockt", !res.allowed,
    `allowed=${res.allowed}, changed=${JSON.stringify(res.changedBlocks.map((c) => c.reason))}`);
}
{
  // Und ein reiner Inline-Textunterschied muss ebenfalls weiter blocken —
  // der Fix fuehrt nur Separator-Aequivalenz ein, keine Text-Toleranz.
  const editor: TiptapDoc = { type: "doc", content: [ para(t("Hello world")) ] };
  const rebuiltLossy: TiptapDoc = { type: "doc", content: [ para(t("Helloworld")) ] };
  const res = runEditorRoundtripGuard(editor, rebuiltLossy);
  ok("Inline-Textverlust (Hello world vs Helloworld) -> blockt", !res.allowed);
}

section("Dokumentiert: mehrere ECHTE Paragraphen im Container (kein hardBreak)");
{
  // Editor hat bereits zwei separate Paragraphen im listItem (harter Enter,
  // nicht Shift+Enter). Rebuild via Konverter erzeugt dieselbe Zwei-
  // Paragraphen-Form -> beide Seiten "\n"-gejoined -> allowed. Das ist das
  // gewuenschte, symmetrische Verhalten (keine Rate-Annahme).
  const doc: TiptapDoc = {
    type: "doc",
    content: [
      { type: "bulletList", content: [
        { type: "listItem", content: [ para(t("Erster Absatz")), para(t("Zweiter Absatz")) ] },
      ]},
    ],
  };
  ok("zwei echte Paragraphen im listItem -> allowed (symmetrisch)", guardAllows(doc));
}

process.stdout.write(`\n${fails === 0 ? "ALL GREEN" : "HAS FAILURES"} — ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);

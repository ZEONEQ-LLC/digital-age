// Manueller Test-Runner fuer src/lib/listen/speechText.ts.
//   npx tsx src/lib/listen/__tests__/speechText.manual.ts

import { buildSpeechChunks, resolveSpeechLang } from "../speechText";
import { BLOCK_SCHEMA_VERSION, type BlockDocument } from "@/types/blocks";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) {
    passes++;
    process.stdout.write(`  PASS  ${label}\n`);
  } else {
    fails++;
    process.stdout.write(
      `  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`,
    );
  }
}
function section(l: string): void {
  process.stdout.write(`\n=== ${l} ===\n`);
}

function doc(blocks: BlockDocument["blocks"]): BlockDocument {
  return { version: BLOCK_SCHEMA_VERSION, blocks, sources: [] };
}

function main() {
  section("resolveSpeechLang — lang-Mapping");
  ok('en -> "en-US"', resolveSpeechLang("en") === "en-US");
  ok('de -> "de-CH"', resolveSpeechLang("de") === "de-CH");
  ok('de-CH -> "de-CH"', resolveSpeechLang("de-CH") === "de-CH");
  ok('null -> "de-CH"', resolveSpeechLang(null) === "de-CH");
  ok('undefined -> "de-CH"', resolveSpeechLang(undefined) === "de-CH");

  section("buildSpeechChunks — Titel + Abstract voran");
  {
    const chunks = buildSpeechChunks({
      title: "Der Titel",
      excerpt: "Der Abstract.",
      doc: doc([
        { id: "p1", type: "paragraph", content: "Erster Absatz." },
      ]),
    });
    ok("Reihenfolge Titel -> Abstract -> Body",
      chunks[0] === "Der Titel" &&
      chunks[1] === "Der Abstract." &&
      chunks[2] === "Erster Absatz.");
    ok("genau 3 Chunks", chunks.length === 3, JSON.stringify(chunks));
  }

  section("buildSpeechChunks — leerer/fehlender Abstract");
  {
    const noExcerpt = buildSpeechChunks({
      title: "T",
      excerpt: null,
      doc: doc([{ id: "p1", type: "paragraph", content: "A." }]),
    });
    ok("null-Abstract erzeugt keinen Chunk", noExcerpt.length === 2);
    const blankExcerpt = buildSpeechChunks({
      title: "T",
      excerpt: "   ",
      doc: doc([{ id: "p1", type: "paragraph", content: "A." }]),
    });
    ok("Whitespace-Abstract erzeugt keinen Chunk", blankExcerpt.length === 2);
  }

  section("buildSpeechChunks — Marker/Refs werden entfernt");
  {
    const chunks = buildSpeechChunks({
      title: "T",
      excerpt: null,
      doc: doc([
        {
          id: "p1",
          type: "paragraph",
          content:
            "Ein {{g}}**wichtiger**{{/g}} Satz mit _Kursiv_ und Quelle[^1] sowie [Link](https://x.io).",
        },
      ]),
    });
    const body = chunks[1];
    ok("kein {{g}} / {{/g}}", !body.includes("{{"));
    ok("kein **", !body.includes("**"));
    ok("kein Source-Ref [^1]", !body.includes("[^") && !body.includes("[1]"));
    ok("Link-Text bleibt, URL weg",
      body.includes("Link") && !body.includes("https://x.io"));
    ok("Plain-Text korrekt",
      body === "Ein wichtiger Satz mit Kursiv und Quelle sowie Link.",
      body);
  }

  section("buildSpeechChunks — Internal-Link behaelt Titel");
  {
    const chunks = buildSpeechChunks({
      title: "T",
      excerpt: null,
      doc: doc([
        {
          id: "p1",
          type: "paragraph",
          content: "Siehe [[mein-slug]](Mein Artikel) dazu.",
        },
      ]),
    });
    ok("Internal-Link-Titel bleibt lesbar",
      chunks[1] === "Siehe Mein Artikel dazu.", chunks[1]);
  }

  section("buildSpeechChunks — Code-Bloecke werden uebersprungen");
  {
    const chunks = buildSpeechChunks({
      title: "T",
      excerpt: null,
      doc: doc([
        { id: "h1", type: "heading", level: 2, content: "Überschrift" },
        { id: "c1", type: "code", language: "ts", content: "const x = 1;" },
        { id: "p1", type: "paragraph", content: "Danach." },
      ]),
    });
    ok("Code-Inhalt nicht enthalten",
      !chunks.some((c) => c.includes("const x")));
    ok("Heading + Paragraph in Reihenfolge",
      chunks[0] === "T" &&
      chunks[1] === "Überschrift" &&
      chunks[2] === "Danach.",
      JSON.stringify(chunks));
    ok("kein leerer Chunk", chunks.every((c) => c.trim().length > 0));
  }

  section("buildSpeechChunks — Footer/Special-Bloecke nicht vorgelesen");
  {
    const chunks = buildSpeechChunks({
      title: "T",
      excerpt: null,
      doc: doc([
        { id: "p1", type: "paragraph", content: "Body." },
        {
          id: "img",
          type: "image",
          url: "x",
          filename: "x.jpg",
          alt: "ALT-Text der nicht vorgelesen wird",
          caption: "Bildunterschrift",
          size: "normal",
          alignment: "center",
        },
        {
          id: "sb",
          type: "statbox",
          items: [
            { value: "42%", label: "Anteil" },
            { value: "3x", label: "schneller" },
            { value: "12", label: "Laender" },
          ],
        },
        {
          id: "dis",
          type: "disclaimer",
          text: "KI-Transparenz-Hinweis im Footer",
        },
        {
          id: "iac",
          type: "internalArticleCard",
          articleSlug: "verwandt",
          cachedTitle: "Verwandter Artikel",
        },
        { id: "div", type: "divider", variant: "full" },
      ]),
    });
    ok("nur Titel + Body-Absatz", chunks.length === 2, JSON.stringify(chunks));
    ok("kein ALT-Text", !chunks.some((c) => c.includes("ALT-Text")));
    ok("keine Bildunterschrift",
      !chunks.some((c) => c.includes("Bildunterschrift")));
    ok("kein Statbox-Wert", !chunks.some((c) => c.includes("42%")));
    ok("kein Disclaimer", !chunks.some((c) => c.includes("KI-Transparenz")));
    ok("kein verwandter Artikel",
      !chunks.some((c) => c.includes("Verwandter Artikel")));
  }

  section("buildSpeechChunks — Liste: ein Chunk pro Item, keine leeren");
  {
    const chunks = buildSpeechChunks({
      title: "T",
      excerpt: null,
      doc: doc([
        {
          id: "l1",
          type: "list",
          ordered: false,
          items: ["Erstens **fett**", "  ", "Drittens[^2]"],
        },
      ]),
    });
    ok("leeres Item herausgefiltert", chunks.length === 3, JSON.stringify(chunks));
    ok("Item-Reihenfolge + Strip stabil",
      chunks[1] === "Erstens fett" && chunks[2] === "Drittens",
      JSON.stringify(chunks));
  }

  section("buildSpeechChunks — Quote wird gelesen");
  {
    const chunks = buildSpeechChunks({
      title: "T",
      excerpt: null,
      doc: doc([
        { id: "q1", type: "quote", content: "Ein {{o}}Zitat{{/o}}." },
      ]),
    });
    ok("Quote-Content als Chunk, Marker weg",
      chunks[1] === "Ein Zitat.", chunks[1]);
  }

  process.stdout.write(`\n${passes} passed, ${fails} failed\n`);
  if (fails > 0) process.exit(1);
}

main();

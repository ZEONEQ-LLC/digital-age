// Reiner Text-Builder fuer die "Anhoeren"-Funktion (Web Speech API).
// Nebenwirkungsfrei und framework-frei — importierbar von Server-Komponente
// (Chunk-Bau in artikel/[slug]/page.tsx) UND vom Test-Runner. Kein "use
// client"/"server-only".
//
// Wiederverwendung: `stripAllMarkup` (roundtripGuard) entfernt die Inline-
// Marker eines Block-Content-Strings ([^N], {{g}}..{{/g}}, {{lg}}/{{xl}},
// [[slug]](Title), [text](url), **, _). Das ist genau die Plain-Text-Ebene,
// die vorgelesen werden soll. Der Builder darueber entscheidet nur, WELCHE
// Bloecke in welcher Reihenfolge als Chunks emittiert werden.

import { stripAllMarkup } from "@/lib/tiptap/roundtripGuard";
import type { Block, BlockDocument } from "@/types/blocks";

// Sprache fuer utterance.lang aus der Artikel-Locale.
//   en            -> "en-US"  (breiteste englische Stimmen-Abdeckung ueber
//                              Chrome/Safari; en-GB waere die Alternative)
//   de | de-CH | ? -> "de-CH" (Schweizer Inhalt; Browser ohne dedizierte
//                              de-CH-Stimme fallen automatisch auf die
//                              naechste deutsche Stimme zurueck)
export function resolveSpeechLang(locale: string | null | undefined): string {
  return locale === "en" ? "en-US" : "de-CH";
}

// Ein Content-String -> vorlesbarer Plain-Text (Marker weg, Whitespace
// normalisiert). Leerstring, wenn nach dem Strippen nichts uebrig bleibt.
function toSpokenText(content: string): string {
  return stripAllMarkup(content).replace(/\s+/g, " ").trim();
}

// Nur diese Block-Typen werden vorgelesen: Ueberschriften, Absaetze, Zitate
// und Listen-Items — in Dokument-Reihenfolge. Bewusst NICHT vorgelesen:
//   - code           (Quelltext ergibt gesprochen keinen Sinn)
//   - image          (ALT-Text + Caption stoeren den Lesefluss)
//   - statbox        (Value/Label-Paare klingen ohne Layout wirr)
//   - disclaimer     (Footer-Element)
//   - internalArticleCard (verwandte Artikel = Footer-Element)
//   - divider
// Quellen-Liste (doc.sources) wird nie erreicht, da nur ueber doc.blocks
// iteriert wird; Source-Refs [^N] im Content strippt stripAllMarkup weg.
function blockToChunks(block: Block): string[] {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "quote": {
      const t = toSpokenText(block.content);
      return t ? [t] : [];
    }
    case "list": {
      const out: string[] = [];
      for (const item of block.items) {
        const t = toSpokenText(item);
        if (t) out.push(t);
      }
      return out;
    }
    default:
      return [];
  }
}

export type SpeechChunkInput = {
  title: string;
  excerpt: string | null | undefined;
  doc: BlockDocument;
};

// Baut die geordnete Chunk-Liste: Titel -> Abstract -> Body-Bloecke.
// Eine utterance pro Chunk (siehe ListenButton) — vermeidet den Chrome-Bug
// mit abbrechenden sehr langen utterances und macht Pause/Fortschritt robust.
// Garantiert: keine leeren/Whitespace-Chunks, stabile Reihenfolge.
export function buildSpeechChunks(input: SpeechChunkInput): string[] {
  const chunks: string[] = [];

  const title = toSpokenText(input.title);
  if (title) chunks.push(title);

  const excerpt = input.excerpt ? toSpokenText(input.excerpt) : "";
  if (excerpt) chunks.push(excerpt);

  for (const block of input.doc.blocks) {
    for (const c of blockToChunks(block)) chunks.push(c);
  }

  return chunks;
}

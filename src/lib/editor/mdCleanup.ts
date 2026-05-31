// Markdown-Cleanup für eingefügten Roh-Markdown im Body-Editor.
//
// User-Flow: Autor klebt einen Markdown-Artikel-Text in den Body, klickt
// "MD-Cleanup". Diese Pipeline strukturiert ihn um:
//   - ## / ### / #### Header → BlockReader-kompatible Heading-Blocks via
//     bestehendes markdownToBlocks (wiederverwendet, kein eigener Parser).
//   - Eine Heading-Sektion `## Quellen` am Ende wird abgetrennt und
//     zeilenweise als `[N] Titel URL` geparst → BlockDocument.sources[].
//   - Inline-Refs `[N]` (auch in Clustern `[1][2][3]` oder ungeordnet
//     `[2][3][4][6][7][8][1]`) werden in `[^N]` umgeschrieben — der
//     Token-Form, die blocksToTiptap als daSourceRef-Node erkennt.
//
// Positionsbasiertes Source-Mapping (Variante A): `[^N]` zeigt auf
// `sources[N-1]`. Lücken in der Numerierung werden mit Placeholder
// `{ text: "⚠ Quelle ergänzen" }` aufgefüllt, damit die N-Werte stabil
// bleiben und der Autor die Lücken sieht.
//
// Idempotenz-Schutz: Wenn keine `## Quellen`-Sektion gefunden wurde,
// signalisiert das Top-Level-Result `foundSourcesSection: false` — der
// EditorClient lässt in dem Fall das bestehende doc.sources unangetastet,
// statt es mit einem leeren Array zu überschreiben (sonst gingen die beim
// ersten Cleanup angelegten Quellen beim zweiten Klick verloren).

import { markdownToBlocks } from "@/lib/markdownBlocks";
import type { Block, Source } from "@/types/blocks";

// ============================================================
// Public API
// ============================================================

export type CleanupResult = {
  blocks: Block[];
  sources: Source[];
  foundSourcesSection: boolean;
};

export function cleanupMarkdown(md: string): CleanupResult {
  const { body, sourcesLines, foundSourcesSection } = splitSourcesSection(md);
  const sourcesMap = parseSourcesLines(sourcesLines);
  const knownNs = new Set(sourcesMap.keys());
  const rewrittenBody = rewriteInlineRefs(body, knownNs);
  const blocks = markdownToBlocks(rewrittenBody);
  const sources = buildSourcesArray(sourcesMap);
  return { blocks, sources, foundSourcesSection };
}

// ============================================================
// Internals — getrennt + exportiert für Tests
// ============================================================

export type SplitResult = {
  body: string;
  sourcesLines: string[];
  foundSourcesSection: boolean;
};

// Trennt einen Markdown-String am ersten Quellen-Marker. Vorher = Body,
// Nachher = Quellen-Zeilen (raw). Erlaubte Marker (case-sensitive):
//   `## Quellen`, `Quellen`, `Quellen:` (mit oder ohne `:` und ohne `##`).
// Plain-Text-Form ist häufig, weil Autoren oft kein Heading-Markup
// setzen — Regex absichtlich permissiv. Wenn kein Marker → foundSources-
// Section: false, Body bleibt unverändert.
const SOURCES_HEADER_RE = /^#{0,3}\s*Quellen\s*:?\s*$/;

export function splitSourcesSection(md: string): SplitResult {
  const lines = md.split("\n");
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (SOURCES_HEADER_RE.test(lines[i].trim())) {
      idx = i;
      break;
    }
  }
  if (idx < 0) {
    return { body: md, sourcesLines: [], foundSourcesSection: false };
  }
  const body = lines.slice(0, idx).join("\n").replace(/\s+$/, "");
  const sourcesLines = lines.slice(idx + 1);
  return { body, sourcesLines, foundSourcesSection: true };
}

// Strenger Regex: `[N] Titel https://url` mit URL-Verankerung am
// Zeilenende. Erlaubt Doppelpunkt/Apostroph im Titel via lazy `.*?`.
const SRC_LINE_STRICT = /^\s*\[(\d+)\]\s+(.*?)\s+(https?:\/\/\S+)\s*$/;
// Fallback ohne URL — Quelle mit nur Titel, url bleibt undefined.
const SRC_LINE_FALLBACK = /^\s*\[(\d+)\]\s+(.+?)\s*$/;

// Parst die Zeilen unterhalb des `## Quellen`-Headings. Returnt
// Map<N, {text, url?}>. Bei doppelten N gewinnt der letzte Eintrag.
// Zeilen, die weder strict noch fallback matchen, werden verworfen.
export function parseSourcesLines(
  lines: string[],
): Map<number, { text: string; url?: string }> {
  const out = new Map<number, { text: string; url?: string }>();
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const strict = SRC_LINE_STRICT.exec(line);
    if (strict) {
      const n = parseInt(strict[1], 10);
      out.set(n, { text: strict[2].trim(), url: strict[3] });
      continue;
    }
    const fallback = SRC_LINE_FALLBACK.exec(line);
    if (fallback) {
      const n = parseInt(fallback[1], 10);
      out.set(n, { text: fallback[2].trim() });
      continue;
    }
    // Nicht parsbare Zeile (z.B. Sub-Heading "## Notes" weiter unten,
    // Leerzeichen-Reste, freier Text) — verwerfen.
  }
  return out;
}

// Ersetzt `[N]`-Inline-Refs durch `[^N]`, NUR wenn N in knownNs steht.
// Unbekannte N bleiben als roher `[N]`-Text erhalten (kein stiller
// Verlust). Cluster `[1][2][3]` zerfallen automatisch — der Regex ist
// pro-Match strikt.
export function rewriteInlineRefs(body: string, knownNs: Set<number>): string {
  return body.replace(/\[(\d+)\]/g, (m, digits) => {
    const n = parseInt(digits, 10);
    return knownNs.has(n) ? `[^${n}]` : m;
  });
}

// Variante A: sources[]-Länge = max(N), Lücken bekommen den Placeholder
// "⚠ Quelle ergänzen" (sichtbarer Handlungs-Hinweis im UI). Wenn die Map
// leer ist, kommt ein leeres Array raus.
export function buildSourcesArray(
  sourcesMap: Map<number, { text: string; url?: string }>,
): Source[] {
  if (sourcesMap.size === 0) return [];
  const maxN = Math.max(...sourcesMap.keys());
  const out: Source[] = [];
  for (let n = 1; n <= maxN; n++) {
    const hit = sourcesMap.get(n);
    if (hit) {
      out.push({ id: newId(n), text: hit.text, ...(hit.url ? { url: hit.url } : {}) });
    } else {
      out.push({ id: newId(n), text: "⚠ Quelle ergänzen" });
    }
  }
  return out;
}

// Eigener ID-Generator (vermeidet Coupling auf SourcePicker.tsx). Identisches
// Schema wie newSourceId dort: `src-<unique>`.
let idCounter = 0;
function newId(seed: number): string {
  idCounter += 1;
  return `src-cl-${Date.now().toString(36)}-${seed}-${idCounter}`;
}

// Markdown-Cleanup für eingefügten Roh-Markdown im Body-Editor.
//
// User-Flow: Autor klebt einen Markdown-Artikel-Text in den Body, klickt
// "MD-Cleanup". Diese Pipeline strukturiert ihn um:
//   - ## / ### / #### Header → BlockReader-kompatible Heading-Blocks via
//     bestehendes markdownToBlocks (wiederverwendet, kein eigener Parser).
//   - Eine Heading-Sektion `## Quellen` am Ende wird abgetrennt und
//     zeilenweise als Source-Eintrag geparst → BlockDocument.sources[].
//     Akzeptierte Quellen-Formate siehe parseSourceLine() unten.
//   - Inline-Refs `[N]` (auch in Clustern `[1][2][3]` oder ungeordnet
//     `[2][3][4][6][7][8][1]`) werden in `[^N]` umgeschrieben — der
//     Token-Form, die blocksToTiptap als daSourceRef-Node erkennt.
//
// Positionsbasiertes Source-Mapping (Variante A): `[^N]` zeigt auf
// `sources[N-1]`. Lücken in der Numerierung werden mit Placeholder
// `{ text: "⚠ Quelle ergänzen" }` aufgefüllt, damit die N-Werte stabil
// bleiben und der Autor die Lücken sieht.
//
// Idempotenz-Schutz: Wenn keine Sources-Sektion gefunden wurde,
// signalisiert das Top-Level-Result `foundSourcesSection: false` — der
// EditorClient lässt in dem Fall das bestehende doc.sources unangetastet,
// statt es mit einem leeren Array zu überschreiben (sonst gingen die beim
// ersten Cleanup angelegten Quellen beim zweiten Klick verloren).
//
// SICHERHEITSNETZ (Lehre aus Andreas-Kamm-Vorfall, Phase 11):
// Quellen-Zeilen, die der Parser nicht greifen kann, werden NICHT mehr
// still verworfen. Sie wandern unter einem neuen `## Sources`-Heading-
// Block an das Body-Ende, plus die UI bekommt eine Warnung. Damit ist
// stiller Datenverlust unter keinen Umstaenden moeglich.

import { markdownToBlocks } from "@/lib/markdownBlocks";
import { mdHttpLinkRe } from "@/lib/markdownLinkUrl";
import type { Block, Source } from "@/types/blocks";

// ============================================================
// Public API
// ============================================================

export type CleanupResult = {
  blocks: Block[];
  sources: Source[];
  foundSourcesSection: boolean;
  // Zeilen aus der Sources-Sektion, die der Parser nicht zu einem
  // strukturierten Source-Eintrag bringen konnte. Werden bereits ans
  // Body-Ende angehaengt (Sicherheitsnetz) — die UI nutzt nur die Anzahl
  // fuer den Warn-Banner.
  unparseableSourceLines: string[];
  // True wenn die Sources-Sektion einen Mix aus Zeilen mit explizitem
  // [N]-Index UND ohne Index enthielt. Dann werden ALLE positionsbasiert
  // neu nummeriert, etwaige Autor-Indizes werden ueberschrieben — UI
  // warnt darueber.
  renumberedDueToMix: boolean;
};

export function cleanupMarkdown(md: string): CleanupResult {
  const { body, sourcesLines, foundSourcesSection } = splitSourcesSection(md);
  const { map: sourcesMap, unparseableLines, renumberedDueToMix } =
    parseSourcesLines(sourcesLines);
  const knownNs = new Set(sourcesMap.keys());
  const refBody = rewriteInlineRefs(body, knownNs);
  const normalizedBody = normalizeStarItalics(refBody);

  // Sicherheitsnetz: unparseable Quellen-Zeilen ans Body-Ende anhaengen,
  // damit nichts verloren geht. Heading davor, damit der Autor sieht,
  // wo die unverarbeiteten Zeilen sind.
  let bodyAugmented = normalizedBody;
  if (unparseableLines.length > 0) {
    bodyAugmented = bodyAugmented.replace(/\s+$/, "");
    if (bodyAugmented.length > 0) bodyAugmented += "\n\n";
    bodyAugmented += "## Sources\n\n";
    bodyAugmented += unparseableLines
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join("\n\n");
  }

  const blocks = markdownToBlocks(bodyAugmented);
  const sources = buildSourcesArray(sourcesMap);
  return {
    blocks,
    sources,
    foundSourcesSection,
    unparseableSourceLines: unparseableLines,
    renumberedDueToMix,
  };
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
// Nachher = Quellen-Zeilen (raw). Erlaubte Marker (case-sensitive,
// kapitalisierte Wortform): Quellen | Sources | References, jeweils
// mit optionalem `##`/`###`-Heading-Präfix und optionalem Doppelpunkt-
// Suffix. Plain-Text-Form ist häufig, weil Autoren oft kein Heading-
// Markup setzen — Regex absichtlich permissiv. Wenn kein Marker →
// foundSourcesSection: false, Body bleibt unverändert.
const SOURCES_HEADER_RE = /^#{0,3}\s*(Quellen|Sources|References)\s*:?\s*$/;

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

// ============================================================
// Source-Zeilen-Parser (Phase 11 — erweitert)
// ============================================================
//
// Akzeptierte Formate (INNERHALB der Sources-Sektion):
//   - `[1] Titel https://url`   ← Strict (vorher)
//   - `[1] Titel`               ← Fallback (vorher)
//   - `• Titel: [text](url)`    ← Bullet + Markdown-Link (Andreas' Fall)
//   - `• Titel – Autor: https://url`   ← Bullet + Plain-URL
//   - `- Titel https://url`     ← MD-Liste
//   - `1. Titel https://url`    ← Numerische Liste
//   - `(1) Titel https://url`   ← Klammer-Index
//   - `[Titel](https://url)`    ← MD-Link ohne Index
//
// Bewusst NICHT akzeptiert:
//   - `[1]: https://url "Titel"`  ← MD-reference-link-Definition
//   - `**[1]** Titel https://url` ← Bold-Index
//   - Reine `Titel URL`-Zeilen ohne Bullet/Index/Link  ← landen im
//     unparseableSourceLines-Sicherheitsnetz (Scope-Praezisierung Ali:
//     kein voraussetzungsloses "Plain"-Format, sonst werden normale
//     Absaetze mit URLs faelschlich als Quellen gelesen)

// Bullet-/List-Marker am Zeilenanfang (Pflicht ist mind. einer der
// expliziten Marker — Plain-Text ohne Marker faellt durch).
// Wichtig: ASCII-Dash `-` zaehlt nur dann als Bullet, wenn er von
// Whitespace gefolgt wird; sonst koennte ein Titel wie "ai-agents"
// als Bullet plus "agents" missinterpretiert werden.
const BULLET_RE = /^[•\*\+–—](?:\s|\t)*|^-\s+/;

// Leading-Index-Patterns
const INDEX_BRACKET_RE = /^\[(\d+)\]\s*[:.\-–—]?\s*/;
const INDEX_PAREN_RE = /^\((\d+)\)\s*[:.\-–—]?\s*/;
const INDEX_PAREN_CLOSE_RE = /^(\d+)\)\s+/;
const INDEX_DOT_RE = /^(\d+)\.\s+/;

// URL-Extraction — Markdown-Link bevorzugt (URL ist explizit), sonst
// Plain-URL am Zeilenende.
// URL-Capture erlaubt balancierte innere Klammern (siehe
// @/lib/markdownLinkUrl) — sonst bricht z.B. eine FINMA-URL mit "(amla)" ab.
const MD_LINK_RE = mdHttpLinkRe();
const TRAILING_URL_RE = /(https?:\/\/\S+)\s*$/;

export type ParsedSourceEntry = {
  explicitN: number | null;
  text: string;
  url?: string;
};

export type ParseSourcesResult = {
  map: Map<number, { text: string; url?: string }>;
  unparseableLines: string[];
  renumberedDueToMix: boolean;
};

// Parst eine einzelne Zeile. Return null = nicht parsbar (landet im
// Sicherheitsnetz). Pipeline:
//   1. Trim
//   2. Bullet-Marker am Anfang abstreifen (optional)
//   3. Leading-Index extrahieren (optional, [N] / (N) / N) / N.)
//   4. URL extrahieren: erst MD-Link, dann Plain-URL am Ende
//   5. Titel = Rest, getrimmt, mit trailing `:`/`-`/Dash entfernt
//   6. Wenn Titel UND URL leer → null
export function parseSourceLine(raw: string): ParsedSourceEntry | null {
  let line = raw.trim();
  if (!line) return null;

  // Merken, ob Zeile irgendeinen "Quellen-Marker" hatte (Bullet, Index
  // oder MD-Link). Ohne JEDEN Marker faellt die Zeile durch — Plain
  // "Titel URL"-Zeilen sind bewusst kein gueltiges Quellen-Format.
  let hadMarker = false;

  const bulletMatch = BULLET_RE.exec(line);
  if (bulletMatch) {
    hadMarker = true;
    line = line.slice(bulletMatch[0].length).trim();
  }

  let explicitN: number | null = null;
  let m: RegExpExecArray | null = null;
  if ((m = INDEX_BRACKET_RE.exec(line)) !== null) {
    explicitN = parseInt(m[1], 10);
    line = line.slice(m[0].length).trim();
    hadMarker = true;
  } else if ((m = INDEX_PAREN_RE.exec(line)) !== null) {
    explicitN = parseInt(m[1], 10);
    line = line.slice(m[0].length).trim();
    hadMarker = true;
  } else if ((m = INDEX_PAREN_CLOSE_RE.exec(line)) !== null) {
    explicitN = parseInt(m[1], 10);
    line = line.slice(m[0].length).trim();
    hadMarker = true;
  } else if ((m = INDEX_DOT_RE.exec(line)) !== null) {
    explicitN = parseInt(m[1], 10);
    line = line.slice(m[0].length).trim();
    hadMarker = true;
  }

  let url: string | undefined;
  let text: string;

  const mdLink = MD_LINK_RE.exec(line);
  if (mdLink) {
    hadMarker = true;
    url = mdLink[2];
    const before = line.slice(0, mdLink.index).trim();
    const linkText = mdLink[1].trim();
    if (before) {
      text = before;
    } else {
      // Titel-Text aus dem Link nur uebernehmen, wenn er nicht selbst die URL ist.
      text = linkText && linkText !== url ? linkText : "";
    }
  } else {
    const trailingUrl = TRAILING_URL_RE.exec(line);
    if (trailingUrl) {
      url = trailingUrl[1];
      text = line.slice(0, trailingUrl.index).trim();
    } else {
      text = line;
    }
  }

  text = text.replace(/[:\-–—]\s*$/, "").trim();

  // Plain-Text ohne JEDEN Marker (kein Bullet, kein Index, kein MD-Link)
  // ist kein gueltiger Quellen-Eintrag.
  if (!hadMarker) return null;

  if (!text && !url) return null;
  // Fallback: nur URL, kein Titel → URL ist auch der Titel-Text.
  if (!text && url) text = url;

  return { explicitN, text, url };
}

// Parst die Zeilen unterhalb des Sources-Headings.
//
// Nummerierungs-Strategie (Konsequenz der Ali-Vorgabe "konservativ + warnen"):
//   - Alle parsbaren Zeilen haben explizite N → Map(explicitN → entry).
//     Inline-Refs `[N]` im Body bleiben gueltig.
//   - Keine Zeile hat explizite N → positionsbasiert auto-nummerieren.
//   - MIX (manche mit, manche ohne) → ALLE positionsbasiert
//     auto-nummerieren, etwaige Autor-Indizes werden ueberschrieben,
//     `renumberedDueToMix: true` signalisiert das an die UI fuer den
//     Warn-Banner. Bewusst NICHT still: das ist die Sicherheits-
//     entscheidung — lieber sichtbar umnummerieren als heimlich
//     vermischen und gegen die Autor-Erwartung arbeiten.
export function parseSourcesLines(lines: string[]): ParseSourcesResult {
  const parsed: ParsedSourceEntry[] = [];
  const unparseable: string[] = [];

  for (const raw of lines) {
    if (!raw.trim()) continue;
    const entry = parseSourceLine(raw);
    if (entry) {
      parsed.push(entry);
    } else {
      unparseable.push(raw);
    }
  }

  const hasExplicit = parsed.some((e) => e.explicitN !== null);
  const allExplicit = parsed.every((e) => e.explicitN !== null);

  const map = new Map<number, { text: string; url?: string }>();
  let renumberedDueToMix = false;

  if (parsed.length > 0 && allExplicit) {
    for (const e of parsed) {
      map.set(e.explicitN as number, {
        text: e.text,
        ...(e.url ? { url: e.url } : {}),
      });
    }
  } else {
    for (let i = 0; i < parsed.length; i++) {
      const e = parsed[i];
      const n = i + 1;
      map.set(n, { text: e.text, ...(e.url ? { url: e.url } : {}) });
    }
    if (hasExplicit) renumberedDueToMix = true;
  }

  return { map, unparseableLines: unparseable, renumberedDueToMix };
}

// Ersetzt `[N]`-Inline-Refs durch `[^N]`, NUR wenn N in knownNs steht.
// Unbekannte N bleiben als roher `[N]`-Text erhalten (kein stiller
// Verlust). Cluster `[1][2][3]` zerfallen automatisch — der Regex ist
// pro-Match strikt.
//
// Negative Lookahead `(?!\()` schützt Markdown-Links mit Zahlen als
// Linktext: `[2024](https://example.com)` darf NICHT zu
// `[^2024](https://example.com)` werden — der Link wäre zerstört.
export function rewriteInlineRefs(body: string, knownNs: Set<number>): string {
  return body.replace(/\[(\d+)\](?!\()/g, (m, digits) => {
    const n = parseInt(digits, 10);
    return knownNs.has(n) ? `[^${n}]` : m;
  });
}

// Wandelt Stern-Italic-Notation (`*x*`, `***x***`) in die vom Konverter
// blocksToTiptap unterstützte Underscore-Notation um. **Bold** (Stern-
// Doppel) bleibt unangetastet — der Konverter erkennt es nativ.
//
// Reihenfolge zwingend, sonst frisst der Einzel-Stern-Regex die Bold-
// Sterne:
//   1. `***x***` → `**_x_**` (Bold-Mark behält Stern, Innen-Italic wird _)
//   2. `**x**` via Platzhalter schützen
//   3. einzelne `*x*` → `_x_`, aber NUR wenn der Stern nicht von Wort-
//      zeichen umgeben ist (`a*b*c` bleibt: konservativ, Markdown-
//      ambivalent) UND der Inhalt kein führendes/abschliessendes
//      Whitespace hat (`3 * 4` bleibt: Stern als Operator)
//   4. Platzhalter zurück
export function normalizeStarItalics(md: string): string {
  // 1.
  let out = md.replace(/\*\*\*([^*\n]+?)\*\*\*/g, "**_$1_**");
  // 2.
  const bolds: string[] = [];
  out = out.replace(/\*\*([^*\n]+?)\*\*/g, (m) => {
    bolds.push(m);
    return `${bolds.length - 1}`;
  });
  // 3.
  out = out.replace(
    /(?<![A-Za-z0-9_])\*([^\s*][^*\n]*?[^\s*]|[^\s*])\*(?![A-Za-z0-9_])/g,
    "_$1_",
  );
  // 4.
  out = out.replace(/(\d+)/g, (_m, idx) => bolds[parseInt(idx, 10)]);
  return out;
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

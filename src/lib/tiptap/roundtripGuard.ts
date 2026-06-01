// Roundtrip-Guard für Phase 3 Etappe A.
//
// Vergleicht das ORIGINAL Block[] gegen das aus dem Tiptap-Editor
// serialisierte CANDIDATE Block[] und entscheidet:
//   - allowed = true  → Save darf durchgehen
//   - allowed = false → Save blocken, dem Autor klar zeigen, was sich
//                       ändern würde
//
// Fehler-Asymmetrie: ein falsch-positiver Block (Save verweigert obwohl
// ok) ist harmlos. Ein falsch-negatives Durchwinken (stiller Datenverlust)
// ist das einzige echte Schadensszenario. Der Guard ist daher in Richtung
// Blocken fehlertolerant.
//
// Whitelist (akzeptiert ohne Block):
//   1. Identische Blocks nach Normalisierung (IDs raus, leere optionale
//      Felder = fehlende Felder).
//   2. Inhalts-String-Diffs, deren Plain-Text identisch ist UND deren
//      semantische Marker (highlight, size, source-ref, internal-link)
//      unverändert geblieben sind UND deren URL-Set identisch ist.
//      → Fängt: Asterisk-Kollaps, Doppellink-Fusion, Mark-Order-Drift
//        durch Tiptap-Schema-Normalisierung.
//
// Alles andere blockt.

import type { Block, BlockDocument } from "@/types/blocks";

export type GuardResult = {
  allowed: boolean;
  changedBlocks: Array<{
    index: number;
    type: string;
    reason: string;
    origPreview: string;
    candPreview: string;
  }>;
};

// ============================================================
// Token-Pattern-Counts
// ============================================================

const TOKEN_RE = {
  bold: /\*\*([\s\S]+?)\*\*/g,
  italic: /_([^_\n]+)_/g,
  externalLink: /\[([^\]]+)\]\(([^)]+)\)/g,
  internalLink: /\[\[([^\]]+)\]\]\(([^)]+)\)/g,
  hlGreen: /\{\{g\}\}([\s\S]*?)\{\{\/g\}\}/g,
  hlOrange: /\{\{o\}\}([\s\S]*?)\{\{\/o\}\}/g,
  sizeLg: /\{\{lg\}\}([\s\S]*?)\{\{\/lg\}\}/g,
  sizeXl: /\{\{xl\}\}([\s\S]*?)\{\{\/xl\}\}/g,
  sourceRef: /\[\^(\d+)\]/g,
};

function countMatches(text: string, re: RegExp): number {
  let n = 0;
  for (const _m of text.matchAll(re)) {
    void _m;
    n += 1;
  }
  return n;
}

function extractAll(text: string, re: RegExp, group: number): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(re)) out.push(m[group]);
  return out;
}

// Strippt sämtliche Token aus dem Content-String und liefert nur den
// sichtbaren Plain-Text. Reihenfolge der Stripping-Schritte ist wichtig:
// erst die Mehrzeichen-Token (Source-Refs, Internal-Links, Highlight-Wraps),
// dann External-Links, zuletzt Bold/Italic — sonst frisst der External-
// Link-Strip die Source-Ref-Klammern.
export function stripAllMarkup(text: string): string {
  let out = text;
  out = out.replace(TOKEN_RE.sourceRef, "");
  out = out.replace(/\[\[([^\]]+)\]\]\(([^)]+)\)/g, "$2"); // internal: keep title
  out = out.replace(/\{\{[a-z]+\}\}/g, "");
  out = out.replace(/\{\{\/[a-z]+\}\}/g, "");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1"); // external link: keep text
  out = out.replace(/\*\*/g, "");
  out = out.replace(/_/g, "");
  return out;
}

// ============================================================
// Block-Vergleich
// ============================================================

function normalize(b: Block): Record<string, unknown> {
  const x = { ...(b as unknown as Record<string, unknown>) };
  delete x.id;
  const optionalKeys = [
    "linkText",
    "linkUrl",
    "caption",
    "source",
    "language",
    "attribution",
    "cachedCoverUrl",
    "cachedExcerpt",
    "alignment",
  ];
  for (const k of optionalKeys) {
    if (x[k] === "" || x[k] === undefined) delete x[k];
  }
  return x;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
    for (const k of keys) {
      if (!deepEqual(ao[k], bo[k])) return false;
    }
    return true;
  }
  return false;
}

// Vergleicht zwei content-Strings auf semantische Äquivalenz nach
// Whitelist-Regeln (siehe Modul-Doc oben).
export function contentWhitelistMatch(orig: string, cand: string): boolean {
  if (orig === cand) return true;

  // Token-Counts für die "seltenen" Marker müssen IDENTISCH sein —
  // Highlight, Size, Source-Ref, Internal-Link.
  for (const key of ["hlGreen", "hlOrange", "sizeLg", "sizeXl", "sourceRef", "internalLink"] as const) {
    if (countMatches(orig, TOKEN_RE[key]) !== countMatches(cand, TOKEN_RE[key])) {
      return false;
    }
  }

  // Source-Ref-N-Werte müssen identisch (Reihenfolge + Werte) bleiben.
  const refsOrig = extractAll(orig, /\[\^(\d+)\]/g, 1).join(",");
  const refsCand = extractAll(cand, /\[\^(\d+)\]/g, 1).join(",");
  if (refsOrig !== refsCand) return false;

  // URL-Set für externe Links muss identisch sein (Fusion durch
  // adjacent-link-collapse ist erlaubt, neue/fehlende URLs sind ein
  // Show-Stopper).
  const urlsOrig = new Set(extractAll(orig, /\[[^\]]+\]\(([^)]+)\)/g, 1));
  const urlsCand = new Set(extractAll(cand, /\[[^\]]+\]\(([^)]+)\)/g, 1));
  if (urlsOrig.size !== urlsCand.size) return false;
  for (const u of urlsOrig) if (!urlsCand.has(u)) return false;

  // Bold/Italic dürfen kollabieren, müssen aber existieren wenn original
  // welche hatte.
  const boldOrig = countMatches(orig, TOKEN_RE.bold) > 0;
  const boldCand = countMatches(cand, TOKEN_RE.bold) > 0;
  if (boldOrig !== boldCand) return false;
  const italOrig = countMatches(orig, TOKEN_RE.italic) > 0;
  const italCand = countMatches(cand, TOKEN_RE.italic) > 0;
  if (italOrig !== italCand) return false;

  // Sichtbarer Plain-Text muss identisch sein.
  if (stripAllMarkup(orig) !== stripAllMarkup(cand)) return false;

  return true;
}

function compareBlock(a: Block, b: Block): { ok: boolean; reason?: string } {
  // Block-Type-Wechsel ist immer blockierend.
  if (a.type !== b.type) return { ok: false, reason: `block-type ${a.type} → ${b.type}` };

  // Content-String-Vergleich: bei text-tragenden Blocks erlauben wir
  // Whitelist-Normalisierung.
  if (a.type === "paragraph" || a.type === "heading" || a.type === "quote" || a.type === "code") {
    const ac = (a as { content?: string }).content ?? "";
    const bc = (b as { content?: string }).content ?? "";
    if (ac !== bc) {
      if (a.type === "code") {
        // Code-Block: keine Token-Normalisierung. content muss bytegenau.
        return { ok: false, reason: "code content modified" };
      }
      if (!contentWhitelistMatch(ac, bc)) {
        return { ok: false, reason: "content outside whitelist" };
      }
    }
    // Heading-level + alignment, Quote-attribution etc. müssen weiterhin
    // strikt matchen.
    const an = normalize(a);
    const bn = normalize(b);
    // Wir entfernen content aus dem Strict-Vergleich (haben wir oben
    // whitelist-geprüft).
    delete an.content;
    delete bn.content;
    if (!deepEqual(an, bn)) {
      return { ok: false, reason: "non-content fields differ" };
    }
    return { ok: true };
  }

  if (a.type === "list") {
    const ai = (a as { items: string[] }).items;
    const bi = (b as { items: string[] }).items;
    if (ai.length !== bi.length) return { ok: false, reason: `list length ${ai.length} → ${bi.length}` };
    for (let i = 0; i < ai.length; i++) {
      if (ai[i] !== bi[i] && !contentWhitelistMatch(ai[i], bi[i])) {
        return { ok: false, reason: `list item[${i}] outside whitelist` };
      }
    }
    if ((a as { ordered: boolean }).ordered !== (b as { ordered: boolean }).ordered) {
      return { ok: false, reason: "list ordered changed" };
    }
    return { ok: true };
  }

  // Alle anderen Block-Types (image, statbox, disclaimer,
  // internalArticleCard, divider): Strict-Vergleich nach Normalisierung.
  if (!deepEqual(normalize(a), normalize(b))) {
    return { ok: false, reason: `${a.type} attrs differ` };
  }
  return { ok: true };
}

// ============================================================
// Public API
// ============================================================

function preview(text: string, n: number = 100): string {
  if (text.length <= n) return text;
  return text.slice(0, n) + "…";
}

function blockContentText(b: Block): string {
  if ("content" in b && typeof b.content === "string") return b.content;
  if (b.type === "list") return b.items.join(" / ");
  return `[${b.type}]`;
}

// ============================================================
// Editor-vs-Roundtrip-Guard (Editor→Block-Asymmetrie fangen)
// ============================================================
//
// Der Self-Fixpoint-Guard prueft blocks→tiptap→blocks. Verluste, die
// VORHER passieren — also im editor.getJSON() → tiptapToBlocks-Schritt
// (unbekannte Inline-Nodes wie hardBreak, unbekannte Marks) — sind im
// `finalDoc` schon korrumpiert und damit fuer den Self-Fixpoint nicht
// mehr sichtbar.
//
// Dieser Guard vergleicht den echten Editor-Output (post-Mount, post-
// ProseMirror-Normalisierung) gegen den ProseMirror-Doc, der sich aus
// dem `finalDoc` per blocksToTiptap rekonstruieren lassen wuerde.
// Differenz = Editor→Block-Verlust.
//
// Pragma: wir vergleichen pro Block den Plain-Text (Strip aller Marks,
// hardBreak→"\n", daSourceRef→"[^N]", unbekannte Inline-Nodes als
// Sentinel "<unknown:TYPE>"). Stimmt der Plain-Text Block-fuer-Block
// nicht ueberein, blockt der Guard. Zusaetzlich werden unbekannte
// Inline-Node-Types und Mark-Types als eigene Fehler-Klasse aufgelistet,
// auch wenn der Plain-Text trotzdem matchen sollte — damit faengt das
// kuenftige Klasse-Asymmetrien sofort beim ersten Auftreten.

const KNOWN_INLINE_TYPES: ReadonlySet<string> = new Set([
  "text",
  "hardBreak",
  "daSourceRef",
]);

const KNOWN_MARK_TYPES: ReadonlySet<string> = new Set([
  "bold",
  "italic",
  "link",
  "internalLink",
  "highlight",
  "fontSize",
]);

type AnyInline = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string }[];
};

type AnyBlock = {
  type: string;
  content?: (AnyInline | AnyBlock)[];
  attrs?: Record<string, unknown>;
};

type AnyDoc = {
  type: "doc";
  content?: AnyBlock[];
};

function inlineToPlain(node: AnyInline): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "daSourceRef") return `[^${(node.attrs?.n as number) ?? "?"}]`;
  return `<unknown-inline:${node.type}>`;
}

function blockToPlain(block: AnyBlock): string {
  // Block-Typen mit nested Paragraphen (blockquote, bulletList,
  // orderedList, listItem): rekursiv abflachen. Damit landet pro Block
  // ein einziger Plain-String — ausreichend zum Vergleich von Editor-
  // Output vs Roundtrip-Output.
  const parts: string[] = [];
  for (const child of block.content ?? []) {
    if (typeof (child as AnyInline).text !== "undefined" || ["hardBreak", "daSourceRef"].includes((child as AnyInline).type) || !("content" in child)) {
      parts.push(inlineToPlain(child as AnyInline));
    } else {
      parts.push(blockToPlain(child as AnyBlock));
    }
  }
  return parts.join("");
}

// Inline-Container: Block-Typen, deren content[] direkt Inline-Nodes
// (text/hardBreak/daSourceRef/...) enthaelt. Heading/Paragraph sind die
// einzigen im aktuellen Schema.
const INLINE_CONTAINER_TYPES: ReadonlySet<string> = new Set(["paragraph", "heading"]);
// Block-Typen mit Paragraph-Kindern (deren content[] enthaelt
// paragraph-Nodes, deren Inline wir dann pruefen).
const PARA_CONTAINER_TYPES: ReadonlySet<string> = new Set(["blockquote", "listItem"]);
// Block-Typen mit Block-Kindern (list → listItem → paragraph → inline).
const BLOCK_CONTAINER_TYPES: ReadonlySet<string> = new Set(["bulletList", "orderedList"]);

function collectUnknowns(doc: AnyDoc): { unknownInline: Set<string>; unknownMark: Set<string> } {
  const unknownInline = new Set<string>();
  const unknownMark = new Set<string>();
  function walkInline(node: AnyInline): void {
    if (!KNOWN_INLINE_TYPES.has(node.type)) unknownInline.add(node.type);
    for (const m of node.marks ?? []) {
      if (!KNOWN_MARK_TYPES.has(m.type)) unknownMark.add(m.type);
    }
  }
  function walkBlock(node: AnyBlock): void {
    if (INLINE_CONTAINER_TYPES.has(node.type)) {
      for (const c of node.content ?? []) walkInline(c as AnyInline);
      return;
    }
    if (PARA_CONTAINER_TYPES.has(node.type) || BLOCK_CONTAINER_TYPES.has(node.type)) {
      for (const c of node.content ?? []) walkBlock(c as AnyBlock);
      return;
    }
    // Leaf-Blocks (image, daStatBox, daDisclaimer, codeBlock, divider,
    // daInternalArticleCard) — kein Inline-Recursion noetig.
  }
  for (const b of doc.content ?? []) walkBlock(b);
  return { unknownInline, unknownMark };
}

export function runEditorRoundtripGuard(
  editorDoc: unknown,
  rebuiltDoc: unknown,
): GuardResult {
  const ed = editorDoc as AnyDoc;
  const rt = rebuiltDoc as AnyDoc;
  const changed: GuardResult["changedBlocks"] = [];

  // 1. Block-Count vergleichen.
  const edBlocks = ed.content ?? [];
  const rtBlocks = rt.content ?? [];
  if (edBlocks.length !== rtBlocks.length) {
    changed.push({
      index: -1,
      type: "(structure)",
      reason: `editor block-count ${edBlocks.length} → roundtrip ${rtBlocks.length}`,
      origPreview: `${edBlocks.length} blocks`,
      candPreview: `${rtBlocks.length} blocks`,
    });
    return { allowed: false, changedBlocks: changed };
  }

  // 2. Plain-Text Block-fuer-Block vergleichen.
  for (let i = 0; i < edBlocks.length; i++) {
    const edPlain = blockToPlain(edBlocks[i]);
    const rtPlain = blockToPlain(rtBlocks[i]);
    if (edPlain !== rtPlain) {
      changed.push({
        index: i,
        type: edBlocks[i].type ?? "(unknown)",
        reason: "editor plain-text differs from roundtrip",
        origPreview: preview(edPlain, 120),
        candPreview: preview(rtPlain, 120),
      });
    }
  }

  // 3. Unknown-Inline-Types / Unknown-Mark-Types im Editor-Doc.
  const { unknownInline, unknownMark } = collectUnknowns(ed);
  for (const t of unknownInline) {
    changed.push({
      index: -1,
      type: "(unknown-inline)",
      reason: `editor enthaelt unbekannten Inline-Node "${t}" — tiptapToBlocks kennt ihn nicht`,
      origPreview: t,
      candPreview: "(verloren bei Save)",
    });
  }
  for (const t of unknownMark) {
    changed.push({
      index: -1,
      type: "(unknown-mark)",
      reason: `editor enthaelt unbekannten Mark "${t}" — tiptapToBlocks kennt ihn nicht`,
      origPreview: t,
      candPreview: "(verloren bei Save)",
    });
  }

  return { allowed: changed.length === 0, changedBlocks: changed };
}

// ============================================================
// Self-Fixpoint-Guard (bestehend, unveraendert)
// ============================================================

export function runRoundtripGuard(
  orig: BlockDocument,
  candidate: BlockDocument,
): GuardResult {
  const a = orig.blocks;
  const b = candidate.blocks;
  const changed: GuardResult["changedBlocks"] = [];

  if (a.length !== b.length) {
    changed.push({
      index: -1,
      type: "(structure)",
      reason: `block-count ${a.length} → ${b.length}`,
      origPreview: `${a.length} blocks`,
      candPreview: `${b.length} blocks`,
    });
    return { allowed: false, changedBlocks: changed };
  }

  for (let i = 0; i < a.length; i++) {
    const r = compareBlock(a[i], b[i]);
    if (!r.ok) {
      changed.push({
        index: i,
        type: a[i].type,
        reason: r.reason ?? "unknown",
        origPreview: preview(blockContentText(a[i])),
        candPreview: preview(blockContentText(b[i])),
      });
    }
  }

  return { allowed: changed.length === 0, changedBlocks: changed };
}

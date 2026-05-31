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
function stripAllMarkup(text: string): string {
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

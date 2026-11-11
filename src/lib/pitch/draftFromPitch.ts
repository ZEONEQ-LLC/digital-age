// Reine Helfer fuer «Pitch -> Artikel-Entwurf» (kein Server-Import, testbar
// ueber __tests__/draftFromPitch.manual.ts). Die Server Action liegt in
// adminActions.ts.

import { cleanupMarkdown } from "@/lib/editor/mdCleanup";
import { BLOCK_SCHEMA_VERSION, type BlockDocument } from "@/types/blocks";

const DEFAULT_CATEGORY = "ki-business"; // wie createDraft

// Formularwert «andere» oder leer: Standard-Kategorie, der Editor korrigiert.
export function pitchCategorySlug(category: string | null, known: readonly string[]): string {
  return category && known.includes(category) ? category : DEFAULT_CATEGORY;
}

// Eine Website aus dem oeffentlichen Formular landet als Link auf dem Autoren-
// Profil: nur http(s).
export function pitchWebsite(url: string | null): string | null {
  const t = (url ?? "").trim();
  return /^https?:\/\/\S+$/i.test(t) ? t : null;
}

function comparable(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

// Der Editor kennt keine H1 (der Titel ist Zone 1) und markdownToBlocks auch
// nicht: `# Text` bliebe als Absatz mit Raute stehen. Eine erste H1, die den
// Titel wiederholt, entfaellt, alle uebrigen werden zu H2. Code-Bloecke bleiben.
export function normalizePitchMarkdown(md: string, title: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let inFence = false;
  let seenContent = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) inFence = !inFence;
    if (!inFence && trimmed.startsWith("# ")) {
      const text = trimmed.slice(2).trim();
      if (!seenContent && comparable(text) === comparable(title)) {
        seenContent = true;
        continue;
      }
      out.push(`## ${text}`);
      seenContent = true;
      continue;
    }
    if (trimmed) seenContent = true;
    out.push(line);
  }
  return out.join("\n").replace(/^\n+/, "");
}

export type PitchDocument = { doc: BlockDocument; warnings: string[] };

// Volltext des Pitches in ein BlockDocument, dieselbe Pipeline wie der Knopf
// «MD-Cleanup» im Editor (Quellen-Sektion, Inline-Refs).
export function pitchToDocument(bodyMd: string, title: string): PitchDocument {
  const r = cleanupMarkdown(normalizePitchMarkdown(bodyMd, title));
  const warnings: string[] = [];
  const n = r.unparseableSourceLines.length;
  if (n > 0) {
    warnings.push(`${n} Quellenzeile${n === 1 ? "" : "n"} nicht erkannt, sie steh${n === 1 ? "t" : "en"} am Textende unter «Sources».`);
  }
  if (r.renumberedDueToMix) warnings.push("Quellen wurden neu nummeriert.");
  return { doc: { version: BLOCK_SCHEMA_VERSION, blocks: r.blocks, sources: r.sources }, warnings };
}

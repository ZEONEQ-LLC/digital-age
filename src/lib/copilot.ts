// Reine Helper fuer den Co-Pilot-Modus (Phase 1). Kein "use server" —
// nebenwirkungsfrei, damit EditorClient, saveArticle-Patch-Typ und Test
// importieren koennen.

export type CopilotStepKey = "seo" | "analyze" | "highlights" | "image_alt";
export type CopilotStepStatus = "ok" | "skipped" | "failed";

export type CopilotStep = {
  step: CopilotStepKey;
  status: CopilotStepStatus;
  detail: string;
};

// Persistiert in articles.copilot_last_run (jsonb). started_at/finished_at
// als ISO-Strings (vom Client gesetzt).
export type CopilotReport = {
  started_at: string;
  finished_at: string;
  steps: CopilotStep[];
};

// ALT-Ueberschreib-Schutz: nur generieren, wenn noch KEIN ALT gesetzt ist.
// Leer/whitespace/null/undefined → true (generieren), sonst false (behalten).
export function shouldGenerateAlt(
  currentAlt: string | null | undefined,
): boolean {
  return typeof currentAlt !== "string" || currentAlt.trim() === "";
}

// Slug-Regel: der Co-Pilot setzt den vorgeschlagenen Slug NUR, wenn der
// Artikel nie publiziert war (published_at IS NULL). Sonst bleibt die URL.
export function shouldApplyCopilotSlug(publishedAt: string | null): boolean {
  return publishedAt == null;
}

// Deutsche Kurz-Zusammenfassung fuer die Panel-Anzeige, z.B.
// "3 ok, 1 übersprungen" oder "2 ok, 1 übersprungen, 1 fehlgeschlagen".
export function summarizeCopilotReport(report: CopilotReport): string {
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  for (const s of report.steps) {
    if (s.status === "ok") ok += 1;
    else if (s.status === "skipped") skipped += 1;
    else failed += 1;
  }
  const parts: string[] = [`${ok} ok`];
  if (skipped > 0) parts.push(`${skipped} übersprungen`);
  if (failed > 0) parts.push(`${failed} fehlgeschlagen`);
  return parts.join(", ");
}

// Obergrenze fuer Bild-ALT-Generierungen pro Lauf. Bildlastige Artikel wuerden
// sonst einen sehr langen Lauf + Rate-Limit-Kaskade ausloesen. Bewusst
// generisch benannt — genutzt vom Co-Pilot-Lauf UND vom manuellen ALT-Button.
export const MAX_IMAGE_ALTS_PER_RUN = 6;

export type ImageAltTarget = { kind: "hero" | "inline"; url: string };

export type ImageAltBatchResult = {
  done: number;
  failed: number;
  rateLimited: boolean;
  // Anzahl targets, die wegen MAX_IMAGE_ALTS_PER_RUN NICHT verarbeitet wurden.
  capped: number;
  // ALT fuers Hero-Bild, falls ein hero-target dabei war und generiert wurde.
  heroAlt: string | null;
  // src → ALT fuer die Inline-Bilder.
  inlineAlts: Record<string, string>;
};

// Sequenzieller ALT-Batch, geteilt von Co-Pilot-Lauf und manuellem Button.
// `gen` ist die injizierte Generator-Funktion (im Prod an generateImageAlt
// gebunden, im Test mockbar). Cappt auf MAX_IMAGE_ALTS_PER_RUN; ein
// rate_limit-Fehler bricht den Rest ab. Reine Ablauf-Logik — das SETZEN der
// ALTs (Editor/State) macht der Aufrufer aus dem Ergebnis.
export async function runImageAltBatch(
  targets: ImageAltTarget[],
  gen: (
    url: string,
  ) => Promise<{ ok: true; alt: string } | { ok: false; error: string }>,
): Promise<ImageAltBatchResult> {
  const limited = targets.slice(0, MAX_IMAGE_ALTS_PER_RUN);
  const capped = targets.length - limited.length;
  let done = 0;
  let failed = 0;
  let rateLimited = false;
  let heroAlt: string | null = null;
  const inlineAlts: Record<string, string> = {};

  for (const t of limited) {
    const r = await gen(t.url);
    if (!r.ok) {
      if (r.error === "rate_limit") {
        rateLimited = true;
        break;
      }
      failed += 1;
      continue;
    }
    if (t.kind === "hero") heroAlt = r.alt;
    else inlineAlts[t.url] = r.alt;
    done += 1;
  }

  return { done, failed, rateLimited, capped, heroAlt, inlineAlts };
}

// Deutsche Zusammenfassung eines ALT-Batch-Ergebnisses fuer Panel/Banner,
// z.B. "3 gesetzt, 1 fehlgeschlagen, 2 weitere übersprungen (Limit)".
export function summarizeImageAltBatch(r: ImageAltBatchResult): string {
  return [
    `${r.done} gesetzt`,
    r.failed > 0 ? `${r.failed} fehlgeschlagen` : "",
    r.capped > 0 ? `${r.capped} weitere übersprungen (Limit)` : "",
    r.rateLimited ? "Rest Rate-Limit" : "",
  ]
    .filter(Boolean)
    .join(", ");
}

// Deutsches Label pro Schritt (fuer Panel-Zeilen).
export function copilotStepLabel(step: CopilotStepKey): string {
  switch (step) {
    case "seo":
      return "SEO generieren";
    case "analyze":
      return "SEO-Analyse";
    case "highlights":
      return "Highlights";
    case "image_alt":
      return "Bild-ALT-Texte";
  }
}

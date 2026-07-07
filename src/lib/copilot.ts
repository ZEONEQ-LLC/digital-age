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

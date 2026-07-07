// Pure Prompt-Bau + Parser fuer den Vision-Task image_alt. Kein "use server"
// — nebenwirkungsfrei, damit Server Action (imageActions.ts), Registry
// (promptRegistry.ts) und Test importieren koennen. Drei-Teiler wie die
// anderen editierbaren Tasks: localeLine [Code] + Strategie [editierbar] +
// Schema [Code]. Das Bild selbst wird als Content-Block uebergeben (nicht im
// Prompt-Text) — hier steht nur der Textkontext (Artikel-Titel).

type Locale = "de-CH" | "en";

function localeLine(locale: Locale): string {
  return `SPRACHE des ALT-Texts: ${
    locale === "en" ? "Englisch" : "Deutsch (Schweizer Rechtschreibung)"
  }.`;
}

// Editierbarer Strategie-Default (sprachneutral).
export const IMAGE_ALT_STRATEGY = [
  "Beschreibe das gezeigte Bild als ALT-Text fuer Screenreader und SEO.",
  "",
  "REGELN:",
  "- Praezise und sachlich, nur was tatsaechlich zu sehen ist.",
  "- 5-15 Woerter, ein knapper beschreibender Satzteil (kein Punkt noetig).",
  "- KEINE Einleitungsphrasen wie \"Bild von\", \"Foto zeigt\", \"Grafik mit\".",
  "- Kein Marketing, keine Interpretation ueber das Sichtbare hinaus.",
  "- Der Artikel-Titel dient nur als Kontext, NICHT abschreiben.",
].join("\n");

// JSON-Schema/Output-Format (Vertragsgrundlage fuers Parsing).
export const IMAGE_ALT_SCHEMA = [
  "OUTPUT: NUR ein JSON-Objekt, Schema:",
  "{",
  '  "alt": string   // der ALT-Text (5-15 Woerter, ohne Einleitungsphrase)',
  "}",
].join("\n");

export function buildImageAltSystem(
  locale: Locale,
  strategyOverride?: string,
): string {
  const strategy = strategyOverride?.trim() || IMAGE_ALT_STRATEGY;
  return [localeLine(locale), strategy, IMAGE_ALT_SCHEMA].join("\n\n");
}

export function buildImageAltPrompt(args: { articleTitle: string }): string {
  const title = args.articleTitle.trim();
  return title
    ? `Kontext — Artikel-Titel: ${title}\n\nBeschreibe das gezeigte Bild als ALT-Text.`
    : "Beschreibe das gezeigte Bild als ALT-Text.";
}

// ─────────────────────────────────────────────────────────────────────────
// Parser (pur, testbar).
// ─────────────────────────────────────────────────────────────────────────

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

// Gibt { alt } zurueck oder null, wenn nichts Brauchbares geparst werden
// konnte (kein JSON, kein/leerer alt-String).
export function parseImageAlt(raw: string): { alt: string } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const alt = (parsed as Record<string, unknown>).alt;
  if (typeof alt !== "string") return null;
  const trimmed = alt.trim();
  if (trimmed === "") return null;
  return { alt: trimmed };
}

// Pure Prompt-Bau-Helper fuer Abstract/Excerpt-Generierung. Bewusst KEIN
// "use server" — Module ist nebenwirkungsfrei und wird sowohl von der
// Server Action (src/lib/ai/abstractActions.ts) als auch vom einmaligen
// Excerpt-Backfill-Skript (migration/backfill-excerpts.ts) genutzt. Damit
// hat die Prompt-Logik genau eine Source-of-Truth.

export const MAX_BODY_CHARS = 4000;

type Locale = "de-CH" | "en";

// Drei-Teiler wie die anderen editierbaren Tasks (seit PR 190):
//   Sprache [Code] + Strategie [editierbar, Admin «Task-Prompts»] +
//   Focus-Keyword-Block [Code, nur mit Keyword] + Ausgabeformat [Code].
// Sprache ist harte Vorgabe — die AI soll NICHT raten oder umschalten, das
// `locale`-State im EditorClient ist die Quelle der Wahrheit. Die Strategie
// ist sprachneutral formuliert und gilt fuer beide Sprachen.
function abstractLocaleLine(locale: Locale): string {
  return locale === "en"
    ? "SPRACHE: Englisch (en). Schreibe den Abstract auf Englisch."
    : "SPRACHE: Deutsch mit Schweizer Rechtschreibung (de-CH). IMMER 'ss' statt Eszett (Beispiele: 'massgeblich', 'Strasse', 'gross'). NIEMALS Eszett verwenden.";
}

// Editierbarer Strategie-Default (Admin: «Abstract generieren»).
export const ABSTRACT_STRATEGY = [
  "Du schreibst einen Abstract (Lead-Paragraph) für einen Magazin-Artikel.",
  "",
  "STIL:",
  "  - 2–4 Sätze, präzise zusammenfassend.",
  "  - Magazin-Tonalität: aktiv, konkret, ohne Floskeln.",
  "  - Kein Cliffhanger, kein Clickbait. Keine rhetorischen Fragen an die Leserin (direkte Anrede in Aussagesätzen ist erlaubt, siehe Regel zur Anredeform unten).",
  "  - Kein Markdown, keine Anführungszeichen drumherum, keine Aufzählungen.",
  "",
  "STILANPASSUNG AN DEN BODY (der Abstract soll wie vom Autor geschrieben klingen, nicht wie AI):",
  "  - Vermeide Gedankenstriche (– und —) zwischen Satzteilen. Wo ein Gedankenstrich durch Punkt, Komma oder Doppelpunkt ersetzbar ist, nutze diese. Gedankenstriche sind ein typisches KI-Stilmerkmal — setze sie nur, wenn der Body-Text sie selbst als bewusstes Stilmittel verwendet. WICHTIG: Diese Regel betrifft NUR Gedankenstriche zwischen Satzteilen, NICHT Bindestriche in zusammengesetzten Wörtern (z.B. 'KI-Outputs', 'Human-in-the-Loop' bleiben korrekt).",
  "  - Erkenne aus dem Body-Text, ob der Autor die Leser siezt oder duzt (im Englischen: formell oder informell anspricht), und verwende im Abstract dieselbe Anredeform. Wenn der Body keine direkte Anrede enthält, verwende auch im Abstract keine.",
  "  - Der Abstract soll sich in den Schreibstil des Body-Texts einfügen: Tonfall, Satzlänge, Förmlichkeit und Wortwahl spiegeln, statt einen generischen Magazin-Ton überzustülpen. Schreibe, wie der Autor schreibt.",
].join("\n");

// Optionales `focusKeyword`: wenn gesetzt, wird ein SEO-Block in den
// Prompt eingefügt — Keyword natürlich im Lead-Satz, exakte Schreibweise,
// nicht erzwungen am Anfang. Begründung: seit PR #119 zählt der Abstract
// als "Lead" für seo_review; wenn dort das Keyword fehlt, produziert die
// Folge-Analyse einen Fehl-Befund. Wenn kein Keyword gesetzt ist, läuft
// die Generierung wie bisher (kein zusätzlicher Block).
function abstractKeywordBlock(focusKeyword: string | null): string | null {
  if (!focusKeyword) return null;
  return [
    "SEO — FOCUS-KEYWORD:",
    `  - Das Focus-Keyword ist: "${focusKeyword}".`,
    "  - Baue das Keyword NATÜRLICH in den Abstract ein, idealerweise im",
    "    ersten Satz, in der ersten Hälfte. KEINE Erzwingung, dass der",
    "    Abstract mit dem Keyword BEGINNEN MUSS — das führt zu",
    "    unnatürlichen Anfängen. Das Keyword soll wie selbstverständlich",
    "    im Lead-Satz auftauchen.",
    "  - Verwende exakt diese Schreibweise des Keywords; keine Synonyme,",
    "    keine Umstellungen, keine Übersetzung.",
    "  - Der Abstract ist der sichtbare Lead der Public-Page und zählt",
    "    für die SEO-Bewertung — das Keyword muss drin sein.",
  ].join("\n");
}

const ABSTRACT_OUTPUT =
  "OUTPUT: NUR der Abstract-Text, keine Vor- oder Nachrede, kein Markdown-Codeblock.";

export function buildAbstractSystem(
  locale: Locale,
  focusKeyword: string | null,
  strategyOverride?: string,
): string {
  const strategy = strategyOverride?.trim() || ABSTRACT_STRATEGY;
  return [
    abstractLocaleLine(locale),
    strategy,
    abstractKeywordBlock(focusKeyword),
    ABSTRACT_OUTPUT,
  ]
    .filter((part): part is string => !!part)
    .join("\n\n");
}

export function buildAbstractPrompt(args: { title: string; bodyText: string }): string {
  const title = args.title.trim();
  const body = args.bodyText.trim().slice(0, MAX_BODY_CHARS);
  const parts: string[] = [];
  if (title) parts.push(`Artikel-Titel: ${title}`);
  if (body) parts.push(`Artikel-Inhalt:\n${body}`);
  return parts.join("\n\n");
}

// Strippt optionalen Markdown-Codefence falls die AI doch wrappt — analog
// SEO-Pipeline. Plus Anführungszeichen-Wrap, der bei Single-String-Outputs
// häufiger vorkommt.
export function cleanAbstractText(raw: string): string {
  let out = raw.trim();
  if (out.startsWith("```")) {
    out = out.replace(/^```(?:[a-z]+)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  if (
    (out.startsWith('"') && out.endsWith('"')) ||
    (out.startsWith("„") && out.endsWith("“")) ||
    (out.startsWith("«") && out.endsWith("»"))
  ) {
    out = out.slice(1, -1).trim();
  }
  return out;
}

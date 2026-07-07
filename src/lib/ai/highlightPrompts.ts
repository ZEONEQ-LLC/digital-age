// Pure Prompt-Bau + Parser fuer den AI-Task highlight_suggestions. Bewusst
// KEIN "use server" — nebenwirkungsfrei, damit die Server Action
// (highlightActions.ts), die Registry (promptRegistry.ts) und der Test
// importieren koennen. Gleiche Drei-Teiler-Struktur wie die SEO-Prompts:
//   localeLine [Code] + Strategie [editierbar] + Schema [Code].
//
// Die AI liefert NUR woertliche Zitate + eine kurze Begruendung. Sie
// schreibt NIE Text um und fuegt NIE Text ein — das Setzen der Marks
// (Bold + Green-Highlight) macht ausschliesslich der Editor-Code.

import { MAX_BODY_CHARS } from "@/lib/ai/seoPrompts";

type Locale = "de-CH" | "en";

function localeLine(locale: Locale): string {
  return `SPRACHE des Outputs (reason): ${
    locale === "en" ? "Englisch" : "Deutsch (Schweizer Rechtschreibung)"
  }.`;
}

// Editierbarer Strategie-Default (sprachneutral).
export const HIGHLIGHT_SUGGESTIONS_STRATEGY = [
  "Aufgabe: Identifiziere die 3-6 wichtigsten Aussagen des Artikels —",
  "Kernthesen, zentrale Schlussfolgerungen, praegnante Zuspitzungen.",
  "",
  "REGELN:",
  "- Ueber den Text VERTEILT auswaehlen (nicht mehrere Highlights im selben",
  "  Absatz).",
  "- Vollstaendige Saetze oder markante Teilsaetze — keine Ein-Wort-Fragmente.",
  "- KEINE Ueberschriften markieren.",
  "- Bevorzuge Aussagen mit eigenstaendigem Erkenntniswert (der Satz sagt auch",
  "  aus dem Kontext gerissen etwas).",
].join("\n");

// JSON-Schema/Output-Format (bleibt in Code — Vertragsgrundlage fuers Parsing).
export const HIGHLIGHT_SUGGESTIONS_SCHEMA = [
  "OUTPUT: NUR ein JSON-Objekt, Schema:",
  "{",
  '  "highlights": [        // 3-6 Eintraege',
  "    {",
  '      "quote": string,   // EXAKTES woertliches Zitat aus dem Body (Zeichen fuer Zeichen, kein Paraphrasieren, keine Auslassungen)',
  '      "reason": string   // 1 kurzer Satz, warum markierenswert',
  "    }",
  "  ]",
  "}",
].join("\n");

export function buildHighlightSuggestionsSystem(
  locale: Locale,
  strategyOverride?: string,
): string {
  const strategy = strategyOverride?.trim() || HIGHLIGHT_SUGGESTIONS_STRATEGY;
  return [localeLine(locale), strategy, HIGHLIGHT_SUGGESTIONS_SCHEMA].join(
    "\n\n",
  );
}

export function buildHighlightSuggestionsPrompt(args: {
  bodyText: string;
}): string {
  const body = args.bodyText.trim().slice(0, MAX_BODY_CHARS);
  if (body === "") {
    return "Es liegt noch kein Inhalt vor. Gib eine leere highlights-Liste zurueck.";
  }
  return `Artikel-Inhalt:\n${body}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Parser (pur, testbar).
// ─────────────────────────────────────────────────────────────────────────

export type HighlightSuggestion = { quote: string; reason: string };

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

// Validiert quotes (String, nicht leer), filtert Duplikate case-insensitive,
// begrenzt auf max 6. Bestehende Markierungen im Text werden NICHT beachtet
// (kein Kontext-Passing) — Duplikate waehlt der Editor im Modal ab. Gibt
// null zurueck, wenn nichts Brauchbares geparst werden konnte.
export function parseHighlights(raw: string): HighlightSuggestion[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const arr = (parsed as Record<string, unknown>).highlights;
  if (!Array.isArray(arr)) return null;

  const out: HighlightSuggestion[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    if (typeof it.quote !== "string") continue;
    const quote = it.quote.trim();
    if (quote === "") continue;
    const key = quote.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const reason = typeof it.reason === "string" ? it.reason.trim() : "";
    out.push({ quote, reason });
    if (out.length >= 6) break;
  }

  if (out.length === 0) return null;
  return out;
}

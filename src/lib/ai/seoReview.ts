// Pure Helper rund um das persistierte SEO-Review. Bewusst KEIN "use server"
// — nebenwirkungsfrei, damit Client-Komponenten (EditorClient/EditorSeoPanel)
// UND der manuelle Test importieren koennen. Types kommen type-only aus
// seoActions (zur Laufzeit erased → kein next/headers-Import).

import type {
  SeoReview,
  SeoReviewSuggestion,
  SeoReviewSeverity,
  SeoReviewCategory,
} from "@/lib/ai/seoActions";

const SEVERITIES: ReadonlySet<string> = new Set([
  "critical",
  "important",
  "nice_to_have",
]);
const CATEGORIES: ReadonlySet<string> = new Set([
  "keyword",
  "length",
  "numbers",
  "powerwords",
  "hook",
  "readability",
]);

// Staleness: der Artikel wurde nach der Analyse geaendert. Strikt groesser —
// nach dem Speichern gilt seo_review_at == updated_at (RPC, gleiche Txn), also
// erst eine SPAETERE Artikel-Aenderung macht das Review stale. Fehlt einer der
// Werte oder ist er ungueltig → nicht stale (kein falscher Alarm).
export function isReviewStale(
  updatedAt: string | null | undefined,
  reviewAt: string | null | undefined,
): boolean {
  if (!updatedAt || !reviewAt) return false;
  const u = Date.parse(updatedAt);
  const r = Date.parse(reviewAt);
  if (Number.isNaN(u) || Number.isNaN(r)) return false;
  return u > r;
}

// Kuerzt ein targetQuote fuer die Anzeige ("Betrifft: '…'"). Whitespace wird
// zu einfachen Spaces normalisiert, dann auf max Zeichen mit Ellipsis gekappt.
export function truncateQuote(quote: string, max = 120): string {
  const norm = quote.replace(/\s+/g, " ").trim();
  if (norm.length <= max) return norm;
  return norm.slice(0, max - 1).trimEnd() + "…";
}

// Tolerant-Parser fuer ein GESPEICHERTES Review (article.seo_review jsonb).
// Rettet, was valide ist: fehlendes targetQuote → "", unbekannte severity/
// category oder fehlende Pflichtfelder → Eintrag verworfen (kein Hard-Fail
// des ganzen Reviews). Nicht unser Shape (kein Objekt / suggestions kein
// Array) → null. Abwaertskompat zu Alt-Reviews ohne targetQuote.
export function normalizeStoredReview(raw: unknown): SeoReview | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.overallAssessment !== "string") return null;
  if (!Array.isArray(p.suggestions)) return null;

  const suggestions: SeoReviewSuggestion[] = [];
  for (const item of p.suggestions) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    if (
      typeof s.severity !== "string" ||
      typeof s.category !== "string" ||
      typeof s.finding !== "string" ||
      typeof s.recommendation !== "string"
    ) {
      continue;
    }
    if (!SEVERITIES.has(s.severity) || !CATEGORIES.has(s.category)) continue;
    suggestions.push({
      severity: s.severity as SeoReviewSeverity,
      category: s.category as SeoReviewCategory,
      finding: s.finding,
      targetQuote: typeof s.targetQuote === "string" ? s.targetQuote : "",
      recommendation: s.recommendation,
    });
  }

  if (suggestions.length === 0) return null;
  return { overallAssessment: p.overallAssessment, suggestions };
}

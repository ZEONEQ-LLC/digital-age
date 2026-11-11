// Slug-Normalisierung für Article-Slugs (articles.slug).
//
// Wird auf zwei Pfaden verwendet:
//   1. "SEO generieren"-Master-Pfad: nimmt fields.slugSuggestion vom LLM
//      entgegen und garantiert das Format (Modell ist nicht 100%
//      zuverlässig bei der Slug-Konvention).
//   2. Slug-AI-Button: nutzt dieselbe Pipeline + Normalisierung — beide
//      Pfade liefern damit identisch normalisierte Slugs.
//
// Konvention für diese beiden AI-Pfade: nur a-z0-9 und Bindestriche, Umlaute
// zu einfacher Kleinschreibung (ä→a, ö→o, ü→u, ß→ss). Der Slug aus dem Titel
// (slugFromTitle unten) transliteriert dagegen ae/oe/ue wie die meisten
// bestehenden Slugs (Backlog 04.06.2026).

export function normalizeArticleSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Platzhalter aus createDraft, solange der Artikel keinen echten Slug hat.
const DRAFT_SLUG_RE = /^draft-\d+-[a-z0-9]+$/;

export function isDraftSlug(slug: string): boolean {
  return DRAFT_SLUG_RE.test(slug);
}

const TITLE_SLUG_MAX = 60; // Obergrenze der Slug-Pruefung im SEO-Tab

// Slug aus dem Artikel-Titel. Deterministisch: slugFollowsTitle vergleicht das
// Ergebnis mit dem aktuellen Slug. Lange Titel enden an einer Wortgrenze.
export function slugFromTitle(title: string): string {
  const s = title
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length <= TITLE_SLUG_MAX) return s;
  const head = s.slice(0, TITLE_SLUG_MAX + 1);
  const boundary = head.lastIndexOf("-");
  return (boundary > 0 ? head.slice(0, boundary) : s.slice(0, TITLE_SLUG_MAX)).replace(/-+$/, "");
}

// Laeuft der Slug noch dem Titel nach? Ja, solange er leer oder Platzhalter
// ist oder dem Titel entspricht (auch mit dem Kollisions-Suffix aus
// saveArticle). Ein von Hand oder per SEO-Button gesetzter Slug weicht ab und
// bleibt. Kein eigenes Feld noetig, die Regel gilt auch nach dem Neuladen.
export function slugFollowsTitle(slug: string, title: string): boolean {
  if (!slug || isDraftSlug(slug)) return true;
  const base = slugFromTitle(title);
  if (!base) return false;
  if (slug === base) return true;
  return slug.startsWith(`${base}-`) && /^\d+$/.test(slug.slice(base.length + 1));
}

// Postgres-Fehler: Slug ist bereits vergeben.
export function isArticleSlugConflict(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "23505" && !!error.message?.includes("articles_slug_key");
}

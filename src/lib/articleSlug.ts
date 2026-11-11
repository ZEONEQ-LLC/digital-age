// Slug-Normalisierung für Article-Slugs (articles.slug).
//
// Eine Transliteration fuer alle Wege (PR 188): ä→ae, ö→oe, ü→ue, ß→ss,
// andere Akzente fallen weg, sonst nur a-z0-9 und Bindestriche. So sind auch
// die meisten bestehenden Slugs geschrieben. Bestehende Slugs bleiben, wie
// sie sind; die Regel gilt nur fuer neu gebildete.

function transliterateSlug(input: string): string {
  return input
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
}

// KI-Pfade: Slug-Vorschlag aus «SEO generieren» und dem Slug-Knopf. Das Modell
// haelt die Konvention nicht immer ein, deshalb wird hier normalisiert.
export function normalizeArticleSlug(input: string): string {
  return transliterateSlug(input);
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
  const s = transliterateSlug(title);
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

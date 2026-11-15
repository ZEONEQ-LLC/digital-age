// Single Source of Truth fuer Pfad-Gates des Site-Chromes (Navbar, Ticker,
// Rails, CMP, GA4, Footer-Cookie-Button) und fuer reservierte Autoren-Handles.
// Client-sicher (keine Server-Imports).
//
// Suite-Routen liegen in src/app/autor/(suite)/ (plus /autor/artikel/neu und
// /autor/freigaben in der eigenen Group (freigaben), handy-tauglich).
// Neue Suite-Route = neuer Eintrag hier, sonst bekommt sie Navbar und Banner.
// Oeffentliche Profile /autor/<handle> fallen bewusst NICHT darunter.
export const AUTHOR_SUITE_PREFIXES = [
  "/autor/dashboard",
  "/autor/profil",
  "/autor/artikel",
  "/autor/podcasts",
  "/autor/prompts",
  "/autor/statistiken",
  "/autor/news-ticker",
  "/autor/seiten",
  "/autor/admin",
  "/autor/freigaben",
] as const;

// Seiten ohne Site-Chrome und ohne Tracking: Kunden-Vorschau (#158) und der
// Fragebogen des Showcase (Token-Seite fuer Unternehmen).
export const CHROMELESS_PREFIXES = ["/vorschau", "/showcase/mitmachen"] as const;

// Beitragsvorschau (/vorschau/artikel/…): zeigt den Beitrag wie publiziert,
// also mit Navbar und Ticker. Tracking, CMP und Anzeigen bleiben aus wie auf
// allen /vorschau-Seiten.
export const ARTICLE_PREVIEW_PREFIX = "/vorschau/artikel";

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isAuthorSuitePath(pathname: string): boolean {
  return matchesPrefix(pathname, AUTHOR_SUITE_PREFIXES);
}

export function isChromelessPath(pathname: string): boolean {
  return matchesPrefix(pathname, CHROMELESS_PREFIXES);
}

export function isArticlePreviewPath(pathname: string): boolean {
  return matchesPrefix(pathname, [ARTICLE_PREVIEW_PREFIX]);
}

// Navbar und Ticker: weg in der Autoren-Suite und auf chrome-freien Seiten,
// ausser in der Beitragsvorschau.
export function hidesSiteNav(pathname: string): boolean {
  return isAuthorSuitePath(pathname) || (isChromelessPath(pathname) && !isArticlePreviewPath(pathname));
}

// Handles, die mit Suite-Routen kollidieren wuerden (/autor/<handle>), plus "neu"
// (/autor/artikel/neu liegt ausserhalb der Group, reserviert zur Sicherheit).
export const RESERVED_AUTHOR_HANDLES: string[] = [
  ...AUTHOR_SUITE_PREFIXES.map((p) => p.slice("/autor/".length)),
  "neu",
];

const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export const HANDLE_RULE_TEXT = "Kleinbuchstaben, Ziffern und Bindestriche, 2 bis 40 Zeichen.";

// Normalisiert und prueft ein Handle. Leere Eingabe ist erlaubt (null = kein Profil-Link).
export function normalizeAuthorHandle(
  input: string | null | undefined,
): { ok: true; handle: string | null } | { ok: false; error: string } {
  const v = (input ?? "").trim().toLowerCase();
  if (!v) return { ok: true, handle: null };
  if (v.length < 2 || !HANDLE_RE.test(v)) {
    return { ok: false, error: "Handle: nur Kleinbuchstaben, Ziffern und Bindestriche, 2 bis 40 Zeichen." };
  }
  if (RESERVED_AUTHOR_HANDLES.includes(v)) return { ok: false, error: "Dieses Handle ist reserviert." };
  return { ok: true, handle: v };
}

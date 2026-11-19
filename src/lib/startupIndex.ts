// Verzeichniseintraege mit ein, zwei Saetzen sind fuer Google duenne Seiten
// (Search Console 19.11.2026: 44 von 55 Eintraegen nicht indexiert). Ein
// Eintrag geht erst zu Google, wenn er bestaetigt ist und eine ausgebaute
// Beschreibung hat. Darunter: noindex, follow und nicht in der Sitemap.
// Die Seite bleibt fuer Besucher erreichbar; baut ein Startup den Eintrag
// aus, kommt er ohne weiteres Zutun zurueck.
export const STARTUP_INDEX_MIN_DESCRIPTION_CHARS = 600;

export function startupIsIndexable(row: {
  verified_at: string | null;
  description: string | null;
}): boolean {
  if (!row.verified_at) return false;
  return (row.description ?? "").trim().length >= STARTUP_INDEX_MIN_DESCRIPTION_CHARS;
}

// Slug fuer authors.slug aus dem Anzeigenamen. Gemeinsam fuer die Autoren-
// Verwaltung und den Gast-Autor aus einem Pitch.
export function authorSlugFromName(input: string): string {
  const s = input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "user";
}

// Wildcards fuer ein ilike-Filter escapen: E-Mail-Adressen duerfen `_` und `%`
// enthalten und sollen trotzdem nur sich selbst treffen.
export function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

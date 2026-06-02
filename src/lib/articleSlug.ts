// Slug-Normalisierung für Article-Slugs (articles.slug).
//
// Wird auf zwei Pfaden verwendet:
//   1. "SEO generieren"-Master-Pfad: nimmt fields.slugSuggestion vom LLM
//      entgegen und garantiert das Format (Modell ist nicht 100%
//      zuverlässig bei der Slug-Konvention).
//   2. Slug-AI-Button: nutzt dieselbe Pipeline + Normalisierung — beide
//      Pfade liefern damit identisch normalisierte Slugs.
//
// Konvention für Article-Slugs: nur a-z0-9 und Bindestriche, Umlaute zu
// einfacher Kleinschreibung (ä→a, ö→o, ü→u, ß→ss), KEIN ae/oe/ue (das
// nutzt tagSlug.ts und storageActions/slugifyFilename in anderen
// Kontexten, ist hier nicht erwünscht).

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

// Kanonische Schreibweise der Stadt im Swiss-AI-Verzeichnis (S1, 14.11.2026):
// Vorher standen «Zürich» und «Zurich» als zwei Filtereinträge. Beim
// Einreichen und beim Speichern im Admin angewendet. Test:
// src/lib/__tests__/startupCity.manual.ts.

const ALIASES: Record<string, string> = {
  zurich: "Zürich",
  zuerich: "Zürich",
  geneva: "Genf",
  geneve: "Genf",
  genève: "Genf",
  berne: "Bern",
  lucerne: "Luzern",
  basle: "Basel",
  "st. gallen": "St. Gallen",
  "st gallen": "St. Gallen",
  "sankt gallen": "St. Gallen",
  lausanne: "Lausanne",
  lugano: "Lugano",
  zug: "Zug",
};

export function normalizeCity(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t) return "";
  const key = t.toLowerCase();
  if (ALIASES[key]) return ALIASES[key];
  // Sonst nur den ersten Buchstaben gross, Rest wie eingegeben.
  return t.charAt(0).toUpperCase() + t.slice(1);
}

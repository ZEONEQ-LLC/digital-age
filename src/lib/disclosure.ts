// Interessenbindung am Artikel (articles.disclosure_note, Migration
// 20261115090000). Der Hinweis steht ueber dem Text, wenn Autor:in oder
// Herausgeber eigene Interessen am Thema haben. Reines Modul: Editor, Server
// Action und Test nutzen es gemeinsam.

export const DISCLOSURE_LABEL = "Interessenbindung";
export const DISCLOSURE_MAX = 400;

// Leer oder nur Leerraum = kein Hinweis (null). Zeilenumbrueche und mehrfache
// Leerzeichen werden zu einem Leerzeichen: Der Hinweis ist ein Absatz.
export function normalizeDisclosure(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/\s+/g, " ").trim();
  return text === "" ? null : text;
}

// Fehlertext oder null. Die DB prueft dieselbe Laenge (CHECK).
export function disclosureError(value: string | null): string | null {
  if (value !== null && value.length > DISCLOSURE_MAX) {
    return `Interessenbindung: höchstens ${DISCLOSURE_MAX} Zeichen (aktuell ${value.length}).`;
  }
  return null;
}

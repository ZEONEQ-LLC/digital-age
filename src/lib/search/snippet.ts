// Textausschnitt der Volltextsuche aufbereiten (rein, testbar). search_articles
// liefert ts_headline aus Abstract + Markdown-Body mit Markierungen ⟦…⟧ um die
// Fundstellen. Hier: Markdown-Reste entfernen und in Teile zerlegen, die die
// Seite als Text bzw. <mark> rendert (nie als HTML).

export const HIT_START = "⟦";
export const HIT_END = "⟧";

export type SnippetPart = { text: string; hit: boolean };

export function cleanSnippetMarkdown(raw: string): string {
  return raw
    // Bilder komplett weg, Links auf ihren Text reduzieren.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Abgeschnittene Link-Reste am Rand des Ausschnitts.
    .replace(/\]\([^)\s]*\)?/g, "")
    .replace(/\(https?:\/\/[^)\s]*\)?/g, "")
    .replace(/https?:\/\/\S+/g, "")
    // Eigene Markierungen ({{green}} …), Fussnoten, Hervorhebungen, Code.
    .replace(/\{\{\/?[a-z-]+\}\}/gi, "")
    .replace(/\[\^\d+\]/g, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/(^|\s)\*(\S)/g, "$1$2")
    .replace(/(\S)\*(\s|$)/g, "$1$2")
    // Zeilenanfang: Ueberschriften, Zitate, Listen. Ueberschriften auch
    // mitten im Ausschnitt (ts_headline verbindet Zeilen, Trenner « … »).
    .replace(/(^|\n)\s*(#{1,6}|>|[-*+]|\d+\.)\s+/g, "$1")
    .replace(/(^|\s)#{1,6}\s+/g, "$1")
    .replace(/[[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function snippetParts(raw: string): SnippetPart[] {
  let text = cleanSnippetMarkdown(raw);
  // Leerer Abstract: Ausschnitt beginnt mit dem Trenner " … ".
  text = text.replace(/^…\s*/, "").replace(/\s*…$/, " …");
  const parts: SnippetPart[] = [];
  let rest = text;
  while (rest.length > 0) {
    const s = rest.indexOf(HIT_START);
    if (s === -1) {
      parts.push({ text: rest, hit: false });
      break;
    }
    const e = rest.indexOf(HIT_END, s + HIT_START.length);
    if (e === -1) {
      parts.push({ text: rest.replace(HIT_START, ""), hit: false });
      break;
    }
    if (s > 0) parts.push({ text: rest.slice(0, s), hit: false });
    const hit = rest.slice(s + HIT_START.length, e);
    if (hit) parts.push({ text: hit, hit: true });
    rest = rest.slice(e + HIT_END.length);
  }
  // Benachbarte Teile gleicher Art zusammenfassen (z.B. ⟦AI⟧ ⟦Act⟧ bleibt
  // getrennt durch das Leerzeichen, das ist gewollt).
  return parts.filter((p) => p.text.length > 0);
}

// Suchbegriff fuer Anzeige und Abfrage normalisieren (Laenge wie in der RPC).
export function normalizeQuery(q: unknown): string {
  if (typeof q !== "string") return "";
  return q.replace(/\s+/g, " ").trim().slice(0, 200);
}

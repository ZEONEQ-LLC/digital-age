// «Übernehmen» eines SEO-Review-Vorschlags (Backlog «'Uebernehmen'-Button pro
// SEO-Review-Vorschlag», PR 189): proposedText ersetzt targetQuote oder kommt
// davor/danach. Reine Helfer fuer Titel (String) und Abstract (Tiptap-JSON);
// der Body laeuft ueber TiptapBodyEditor.applyTextEdit (PM-Transaktion).
//
// Gesucht wird wie bei «Im Text anzeigen»: Whitespace-tolerant, Gross-/
// Kleinschreibung egal, erstes Vorkommen. Im Abstract nur innerhalb EINES
// Text-Knotens: Ueber Formatierungsgrenzen hinweg wird nicht ersetzt, dann
// meldet der Aufrufer «bitte von Hand».

export type SuggestionAction = "replace" | "insert_before" | "insert_after";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Regex fuer das Zitat: Whitespace-Runs matchen beliebigen Whitespace.
export function quotePattern(quote: string): RegExp | null {
  const parts = quote.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return new RegExp(parts.map(escapeRegExp).join("\\s+"), "i");
}

// Wendet die Aenderung auf einen String an; null = Zitat nicht gefunden.
export function applySuggestionToString(
  text: string,
  quote: string,
  insert: string,
  action: SuggestionAction,
): string | null {
  const re = quotePattern(quote);
  const ins = insert.trim();
  if (!re || !ins) return null;
  const m = re.exec(text);
  if (!m) return null;
  const start = m.index;
  const end = m.index + m[0].length;
  if (action === "replace") return text.slice(0, start) + ins + text.slice(end);
  if (action === "insert_before") return text.slice(0, start) + ins + " " + text.slice(start);
  return text.slice(0, end) + " " + ins + text.slice(end);
}

type JsonNode = { type?: string; text?: string; content?: JsonNode[]; [k: string]: unknown };

// Tiptap-JSON (Abstract): erster Text-Knoten, der das Zitat enthaelt, wird
// geaendert. Rueckgabe: neues Dokument oder null (nicht gefunden).
export function applySuggestionToDoc<T>(doc: T, quote: string, insert: string, action: SuggestionAction): T | null {
  const copy = JSON.parse(JSON.stringify(doc)) as JsonNode;
  let done = false;
  const walk = (node: JsonNode) => {
    if (done) return;
    if (node.type === "text" && typeof node.text === "string") {
      const next = applySuggestionToString(node.text, quote, insert, action);
      if (next !== null) {
        node.text = next;
        done = true;
      }
      return;
    }
    for (const child of node.content ?? []) walk(child);
  };
  walk(copy);
  return done ? (copy as T) : null;
}

// Gleiche Aussage wie das Zitat (nur Whitespace/Gross-Klein anders): nichts zu tun.
export function isNoopSuggestion(quote: string, insert: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  return norm(quote) === norm(insert);
}

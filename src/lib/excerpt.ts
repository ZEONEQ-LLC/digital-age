// Abstract als Klartext fuer Teaser: eigene Marker ({{g}}, **, Quellen [^1],
// interne und externe Links) gehoeren nicht in Listen und Karten.
export function plainExcerpt(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/\[\^\d+\]/g, "")
    .replace(/\[\[[^\]]+\]\]\(([^)]+)\)/g, "$1")
    .replace(/\{\{\/?[a-z]+\}\}/gi, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

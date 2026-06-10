// Single Source of Truth fuer das Parsen einer Markdown-Link-URL, die
// balancierte innere Klammern enthalten darf — z.B.
//   https://www.finma.ch/.../anti-money-laundering-act-(amla)/
//
// PROBLEM: Die naive URL-Capture `[^)]+` (bzw. `https?:\/\/[^)\s]+`) stoppt
// an der ERSTEN `)`. Bei URLs mit legitimen inneren Klammern (Wikipedia-
// "(disambiguation)", Gesetzeskuerzel "(amla)") wird die URL abgeschnitten:
// der href ist kaputt UND der Rest `/)` bleibt als sichtbarer Text stehen.
//
// FIX (additiv): Statt bei jeder `)` abzubrechen, matcht die URL-Capture
// entweder Nicht-Klammer-Zeichen ODER eine balancierte `(...)`-Gruppe. Die
// Capture endet damit erst an der abschliessenden `)` des Markdown-Links.
//
// - URLs OHNE Klammern verhalten sich BIT-IDENTISCH wie vorher (die
//   Alternative `[^()]` deckt denselben Zeichenraum ab, solange keine `(`
//   vorkommt; das `+` verlangt wie vorher mind. ein Zeichen).
// - Nur EINE Verschachtelungsebene ist gewollt: deckt die realen Faelle ab
//   und vermeidet die ReDoS-Flaeche unbegrenzter Rekursion. Die beiden
//   Alternativen sind am ersten Zeichen disjunkt (`[^()]` vs `(`), daher
//   linear — kein catastrophic backtracking.
// - Degenerierte Faelle (unbalancierte Klammer, leere URL) matchen schlicht
//   NICHT als Link und degradieren zu Literal-Text — kein Hang, kein Crash.

// Kern der balancierten-Klammern-Logik — hier und NUR hier definiert.
// `atom` ist die Zeichenklasse OHNE Klammern (z.B. "[^()]" oder
// "[^()\\s]"). Ergebnis matcht eine nicht-leere Folge aus solchen Zeichen
// und/oder einfach verschachtelten "(...)"-Gruppen.
function balancedBody(atom: string): string {
  return `(?:${atom}|\\(${atom}*\\))+`;
}

// Generischer URL-Body (Gegenstueck zum alten `[^)]+`): alles ausser
// unbalancierten Klammern, inkl. Whitespace.
export const BALANCED_URL = balancedBody("[^()]");

// Strikter http-URL-Body (Gegenstueck zum alten `https?:\/\/[^)\s]+`):
// erzwingt das http(s)-Praefix und verbietet Whitespace.
export const BALANCED_HTTP_URL = `https?:\\/\\/${balancedBody("[^()\\s]")}`;

// `[text](url)` — externer Inline-Link. Group 1 = Text, Group 2 = URL.
// Genutzt von BlockReader + InlineText (Public-Render).
export function externalLinkRe(flags = ""): RegExp {
  return new RegExp(`\\[([^\\]]+)\\]\\((${BALANCED_URL})\\)`, flags);
}

// `![alt](url)` am Zeilenanfang — Bild-Block. Group 1 = Alt, Group 2 = URL.
// Genutzt von markdownBlocks (markdownToBlocks). Gleiche End-Bedingung wie
// der externe Link (Markdown-`)`), nur Anchor + optionaler Alt-Text.
export function imageLinkRe(flags = ""): RegExp {
  return new RegExp(`^!\\[([^\\]]*)\\]\\((${BALANCED_URL})\\)`, flags);
}

// `[text](http-url)` — Quellen-Zeilen-Parser. Group 1 = Text, Group 2 = URL.
// Genutzt von mdCleanup (MD_LINK_RE): nur http(s), kein Whitespace.
export function mdHttpLinkRe(flags = ""): RegExp {
  return new RegExp(`\\[([^\\]]*)\\]\\((${BALANCED_HTTP_URL})\\)`, flags);
}

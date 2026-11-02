// Titelvergleich fuer die Plattform-Suche (Spotify, YouTube). Reine
// Funktionen, keine Server-Imports, damit sie im manuellen Test laufen.
//
// Normalisierung: Kleinbuchstaben, Folgen-Praefixe wie "#541 -", "Ep. 12:",
// "Folge 7 |" entfernen, Satzzeichen raus, Mehrfach-Leerzeichen eins.
// Aehnlichkeit: Dice-Koeffizient ueber Wort-Tokens plus Containment, damit
// ein gekuerzter Plattform-Titel ("… | DOAC") trotzdem matcht.

const PREFIX_RE = /^(?:(?:#|ep\.?|episode|folge|teil|nr\.?)\s*\d+[a-z]?\s*[-:|–—.]?\s*)+/i;
const TRAILER_RE = /\s*[|–—-]\s*[^|–—-]{0,40}$/;

export function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(PREFIX_RE, "")
    .replace(/[„“"«»'’`´()[\]{}]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalizeTitle(s).split(" ").filter((t) => t.length > 1));
}

export function titleSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  const dice = (2 * common) / (ta.size + tb.size);
  // Containment: kleinerer Titel vollstaendig im groesseren enthalten.
  const containment = common / Math.min(ta.size, tb.size);
  return Math.max(dice, containment >= 0.99 && Math.min(ta.size, tb.size) >= 3 ? 0.9 : 0);
}

// Plattform-Titel tragen oft einen Anhang ("… | The Diary Of A CEO"); fuer den
// Vergleich mit dem Apple-Titel einmal mit und einmal ohne Anhang pruefen.
export function bestSimilarity(appleTitle: string, platformTitle: string): number {
  const stripped = platformTitle.replace(TRAILER_RE, "");
  return Math.max(titleSimilarity(appleTitle, platformTitle), stripped ? titleSimilarity(appleTitle, stripped) : 0);
}

export type Candidate<T> = { item: T; title: string };

export function pickBest<T>(appleTitle: string, candidates: Candidate<T>[], threshold: number): { item: T; score: number } | null {
  let best: { item: T; score: number } | null = null;
  for (const c of candidates) {
    const score = bestSimilarity(appleTitle, c.title);
    if (score >= threshold && (!best || score > best.score)) best = { item: c.item, score };
  }
  return best;
}

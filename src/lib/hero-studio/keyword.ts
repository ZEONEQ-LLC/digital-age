// Schlagwort-Fallback des Hero Studio. Reihenfolge: Fokus-Keyword (SEO-Tab) →
// Schlagwort der KI-Vorschlaege → aus dem Titel abgeleitet. Die Engine bekommt nie
// einen leeren Text (sie fiele sonst auf «digital age» zurueck, was wie ein Fehler wirkt).

export const HERO_KEYWORD_MAX = 26;

// Ganzer Titel, wenn er hoechstens max Zeichen hat, sonst an einer Wortgrenze auf
// hoechstens max gekuerzt (liegt im gekuerzten Teil ein Satzzeichen mit Leerzeichen,
// z. B. «Mega-Trend IoT: Die …», endet das Schlagwort davor); Satz- und
// Anfuehrungszeichen am Rand fallen weg.
export function keywordFromTitle(title: string, max = HERO_KEYWORD_MAX): string {
  const t = title.replace(/\s+/g, " ").trim();
  const strip = (s: string) => s.replace(/^[\s«»"'„‚‘’“”(\[]+/g, "").replace(/[\s.,:;!?…«»"'„‚‘’“”)\]\-–—&/]+$/g, "").trim();
  if (t.length <= max) return strip(t);
  const head = t.slice(0, max + 1);
  const sp = head.lastIndexOf(" ");
  let cut = sp > 0 ? head.slice(0, sp) : t.slice(0, max);
  const clause = cut.search(/[:;!?.–—]\s/);
  if (clause >= 8) cut = cut.slice(0, clause);
  return strip(cut) || strip(t.slice(0, max));
}

// Texte kuerzen, ohne mitten im Satz aufzuhoeren (PR 215). Rein und ohne
// Abhaengigkeiten: News-Einordnung (newsTicker/assessment.ts) und die
// Ersatztexte des Newsletters (newsletter/sections.ts, draftJob.ts) teilen
// dieselbe Regel. Test: __tests__/textClip.manual.ts.
//
// Anlass: In der ersten versendeten Ausgabe (16.11.2026) endeten der
// Podcast-Tipp und ein «Warum wichtig» mit « …».

// Abkuerzungen, nach deren Punkt kein Satz endet.
const ABBREVIATIONS = new Set([
  "z", "b", "u", "a", "d", "h", "o", "ä", "i", "s", "v", "e", "g",
  "ca", "bzw", "inkl", "exkl", "vgl", "ggf", "evtl", "resp", "sog", "nr", "st", "dr", "prof", "mio", "mrd",
  "tsd", "abs", "art", "lit", "ff", "al", "vs", "etc", "usw", "inc", "ltd", "co", "corp", "no", "max", "min", "mind", "zzgl",
]);

// Stellen, an denen ein Satz endet: Punkt, Ausrufe- oder Fragezeichen (auch
// vor einem schliessenden Anfuehrungszeichen), danach Leerraum oder Textende.
// Nicht nach einer Abkuerzung («z. B.», «Mio.») und nicht in einer Zahl («3.5»,
// «16. November»).
function sentenceEnds(text: string): number[] {
  const ends: number[] = [];
  const re = /[.!?][»"”’)]*(?=\s|$)/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const end = m.index + m[0].length;
    if (m[0][0] === ".") {
      const before = text.slice(0, m.index);
      const word = /([\p{L}\p{N}]+)$/u.exec(before)?.[1] ?? "";
      if (word === "") continue;
      if (/^\p{N}+$/u.test(word)) continue; // «16.» oder «3.» vor einer Zahl oder einem Monat
      if (word.length === 1 || ABBREVIATIONS.has(word.toLowerCase())) continue;
    }
    ends.push(end);
  }
  return ends;
}

// Kuerzt auf hoechstens `max` Zeichen. Passt der Text, bleibt er. Sonst endet
// er am letzten ganzen Satz, sofern davon mindestens `minShare` der Laenge
// uebrig bleibt; erst wenn es keinen solchen Satz gibt, an einer Wortgrenze
// mit « …».
export function clipAtSentence(text: string, max: number, minShare = 0.4): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const ends = sentenceEnds(t).filter((e) => e <= max);
  const last = ends[ends.length - 1];
  if (last !== undefined && last >= max * minShare) return t.slice(0, last);
  const cut = t.slice(0, Math.max(1, max - 2));
  const space = cut.lastIndexOf(" ");
  const head = (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.\s–-]+$/, "");
  return `${head} …`;
}

// Endet der Text abgeschnitten («…» oder «...»)? Fuer den Hinweis im Entwurf.
export function endsCutOff(text: string | null | undefined): boolean {
  return /(…|\.\.\.)\s*$/.test((text ?? "").trim());
}

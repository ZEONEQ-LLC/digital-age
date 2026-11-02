// ALT-Texte und Bildquelle des Hero Studio. Die Engine liefert nur Bausteine
// (altParts: Motiv-Phrase, Farbklang, Schlagwort, Animation, Schlagwort im Bild);
// Zusammensetzen und Kuerzen passieren hier, die Zeichenlogik bleibt unberuehrt.
//   Standbild (cover_image_alt): hoechstens 125 Zeichen (Empfehlung im Bild-Details-
//   Modal), ohne Praefix «Grafik von digital age», beschreibt nur, was zu sehen ist.
//   Animation (cover_video_alt): Text der Engine, hoechstens 250 Zeichen.

import type { HeroAltParts, HeroEngine, HeroLang, HeroSpec } from "./vendor";

export const HERO_ALT_MAX = 125;
export const HERO_VIDEO_ALT_MAX = 250;
/** Bildquelle, die das Uebernehmen setzt, wenn das Feld leer ist oder diesen Wert traegt. */
export const HERO_IMAGE_SOURCE = "digital age";

const ARTICLE_RE = /^(das|der|die|den|dem|ein|eine|einen|einem|einer|the|a|an)\s+/i;

// Motiv-Phrase ohne Artikel: «das Symbol «X»» → «Symbol «X»», «zwei Münzen» und
// «digital age Bot …» bleiben wie sie sind (Nomen sind in der Engine schon gross).
export function motifNoun(phrase: string): string {
  return phrase.replace(/\s+/g, " ").trim().replace(ARTICLE_RE, "");
}

// Farbklang klein am Anfang («Weiss mit grünen Akzenten …» → «weiss mit …»).
function colorPhrase(color: string): string {
  const c = color.replace(/\s+/g, " ").trim();
  return c ? c.charAt(0).toLowerCase() + c.slice(1) : "";
}

export type ComposeOptions = {
  /** Farbklang mitnehmen (Stufe 1); false = Stufe 2 */
  color?: boolean;
  /** kurze Form des Schlagwort-Teils: «darunter «X»» statt «darunter handgeschrieben «X»» (Stufe 3) */
  shortTail?: boolean;
};

// Setzt den ALT des Standbilds zusammen.
export function composeHeroAlt(p: HeroAltParts, lang: HeroLang, opts: ComposeOptions = {}): string {
  const en = lang === "en";
  const withColor = opts.color !== false;
  const q = (t: string) => (en ? `"${t}"` : `«${t}»`);
  const color = withColor && p.color ? `, ${colorPhrase(p.color)}` : "";
  const text = p.text.replace(/\s+/g, " ").trim();
  if (p.engine === "typo") {
    return en ? `Lettering ${q(text)}${color}.` : `Schriftzug ${q(text)}${color}.`;
  }
  const motif = motifNoun(p.motif) || (en ? "a motif" : "Motiv");
  const head = p.anim === "entwurf"
    ? (en ? "Line drawing with construction lines" : "Linienzeichnung mit Hilfslinien")
    : (en ? "Line drawing" : "Linienzeichnung");
  let tail = "";
  if (text) {
    const below = en ? `, below it ${q(text)}` : `, darunter ${q(text)}`;
    const behind = en ? `, behind it ${q(text)}` : `, dahinter ${q(text)}`;
    if (p.anim === "schreiben") tail = opts.shortTail ? below : en ? `, below it in handwriting ${q(text)}` : `, darunter handgeschrieben ${q(text)}`;
    else if (p.caption === "unten") tail = below;
    else if (p.caption === "gross") tail = opts.shortTail ? behind : en ? `, behind it in outline letters ${q(text)}` : `, dahinter in Umrissbuchstaben ${q(text)}`;
  }
  return `${head}: ${motif}${color}${tail}.`;
}

// Haengende Satzzeichen, offene Anfuehrungszeichen und leere Satzteile am Ende entfernen.
function tidyEnd(s: string): string {
  let cut = s;
  for (let i = 0; i < 6; i++) {
    cut = cut.replace(/[\s,;:.«"„(]+$/g, "");
    const openDe = (cut.match(/«/g) || []).length > (cut.match(/»/g) || []).length;
    const openEn = (cut.match(/"/g) || []).length % 2 === 1;
    if (openDe || openEn) { cut = cut.slice(0, Math.max(cut.lastIndexOf("«"), cut.lastIndexOf('"'))); continue; }
    const m = cut.match(/,\s+(darunter(\s+handgeschrieben)?|dahinter(\s+in(\s+Umrissbuchstaben)?)?|below(\s+it(\s+in(\s+handwriting)?)?)?|behind(\s+it(\s+in(\s+outline(\s+letters)?)?)?)?)$/i);
    if (m && m.index != null) { cut = cut.slice(0, m.index); continue; }
    break;
  }
  return cut;
}

// Kuerzt an einer Wortgrenze auf hoechstens max Zeichen, Punkt am Ende.
export function cutAtWord(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  let cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  if (sp > 0) cut = cut.slice(0, sp);
  cut = tidyEnd(cut);
  if (!cut) cut = t.slice(0, max - 1).trimEnd();
  return cut + ".";
}

// Standbild, Stufen: 1 mit Farbklang, 2 ohne Farbklang, 3 ohne Farbklang mit kurzem
// Schlagwort-Teil, 4 an einer Wortgrenze gekuerzt. Immer ≤ max.
export function fitHeroAlt(p: HeroAltParts, lang: HeroLang, max = HERO_ALT_MAX): string {
  const full = composeHeroAlt(p, lang);
  if (full.length <= max) return full;
  const noColor = composeHeroAlt(p, lang, { color: false });
  if (noColor.length <= max) return noColor;
  const short = composeHeroAlt(p, lang, { color: false, shortTail: true });
  if (short.length <= max) return short;
  return cutAtWord(short, max);
}

// Animation: Text der Engine, bei Ueberlaenge am letzten Satzende, sonst an einer Wortgrenze.
export function fitHeroVideoAlt(s: string, max = HERO_VIDEO_ALT_MAX): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const i = t.lastIndexOf(". ", max - 1);
  if (i > max * 0.4) return t.slice(0, i + 1);
  return cutAtWord(t, max);
}

export function heroAltStatic(engine: HeroEngine, spec: HeroSpec, lang: HeroLang): string {
  return fitHeroAlt(engine.altParts(spec, lang), lang);
}

export function heroAltAnimated(engine: HeroEngine, spec: HeroSpec, lang: HeroLang): string {
  return fitHeroVideoAlt(engine.altAnimated(spec, lang));
}

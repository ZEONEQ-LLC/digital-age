// Manueller Test-Runner fuer src/lib/hero-studio/alt.ts (kurzer ALT ≤ 125, Animation ≤ 250)
// und keyword.ts (Schlagwort aus dem Titel).
//   npx tsx src/lib/hero-studio/__tests__/alt.manual.ts
// Exit 0 = alles gruen, 1 = mind. ein Fail.
// Die Bausteine (parts) stammen aus engine.altParts() der vendorten Engine fuer die sechs
// Referenz-Rezepte (scripts/hero-studio, referenzen.json, Artikel «AI Money Moves»),
// abgelesen am 02.11.2026 im Headless-Chromium.

import { HERO_ALT_MAX, HERO_VIDEO_ALT_MAX, composeHeroAlt, cutAtWord, fitHeroAlt, fitHeroVideoAlt, motifNoun } from "../alt";
import { keywordFromTitle } from "../keyword";
import type { HeroAltParts } from "../vendor";

let passes = 0, fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

const REFS: Record<string, { de: HeroAltParts; en: HeroAltParts }> = {
  "R1-linie-standard": {
    de: { engine: "line", motif: "zwei Münzen", color: "Grün auf dunklem Grund", text: "AI Money Moves", anim: "entwurf", caption: "keine" },
    en: { engine: "line", motif: "two coins", color: "green on a dark background", text: "AI Money Moves", anim: "entwurf", caption: "keine" },
  },
  "R2-linie-schreiben": {
    de: { engine: "line", motif: "zwei Münzen", color: "Grün auf dunklem Grund", text: "AI Money Moves", anim: "schreiben", caption: "keine" },
    en: { engine: "line", motif: "two coins", color: "green on a dark background", text: "AI Money Moves", anim: "schreiben", caption: "keine" },
  },
  "R3-linie-bot-kamera": {
    de: { engine: "line", motif: "den digital age Bot mit Kopfhörern und grünem Visier", color: "Grün auf dunklem Grund", text: "AI Money Moves", anim: "kamera", caption: "gross" },
    en: { engine: "line", motif: "the digital age bot with headphones and a green visor", color: "green on a dark background", text: "AI Money Moves", anim: "kamera", caption: "gross" },
  },
  "R4-typo-standard": {
    de: { engine: "typo", motif: "", color: "Grün auf einem grauen Feld", text: "AI MONEY MOVES", anim: "decode", caption: "" },
    en: { engine: "typo", motif: "", color: "green on a grey panel", text: "AI MONEY MOVES", anim: "decode", caption: "" },
  },
  "R5-typo-fallblatt": {
    de: { engine: "typo", motif: "", color: "Grün auf einem grauen Feld", text: "AI MONEY MOVES", anim: "fallblatt", caption: "" },
    en: { engine: "typo", motif: "", color: "green on a grey panel", text: "AI MONEY MOVES", anim: "fallblatt", caption: "" },
  },
  "R6-linie-morph": {
    de: { engine: "line", motif: "ein Bankgebäude mit Säulen", color: "Grün auf einem grauen Feld", text: "AI Money Moves", anim: "morph", caption: "keine" },
    en: { engine: "line", motif: "a bank building with columns", color: "green on a grey panel", text: "AI Money Moves", anim: "morph", caption: "keine" },
  },
};

section("Sechs Referenz-Rezepte, alle ≤ 125");
for (const [id, p] of Object.entries(REFS)) {
  const de = fitHeroAlt(p.de, "de"), en = fitHeroAlt(p.en, "en");
  ok(`${id} de (${de.length})`, de.length <= HERO_ALT_MAX && de.endsWith("."), de);
  ok(`${id} en (${en.length})`, en.length <= HERO_ALT_MAX && en.endsWith("."), en);
  const colorDe = p.de.color.charAt(0).toLowerCase() + p.de.color.slice(1);
  ok(`${id} ohne Praefix, Farbklang wenn er passt`, !/digital age:/.test(de) && (de.includes(colorDe) || composeHeroAlt(p.de, "de").length > HERO_ALT_MAX));
}
{
  ok("R1 Wortlaut", fitHeroAlt(REFS["R1-linie-standard"].de, "de") === "Linienzeichnung mit Hilfslinien: zwei Münzen, grün auf dunklem Grund.");
  ok("R2 Schreibschrift", fitHeroAlt(REFS["R2-linie-schreiben"].de, "de") === "Linienzeichnung: zwei Münzen, grün auf dunklem Grund, darunter handgeschrieben «AI Money Moves».");
  ok("R3 Umriss-Schlagwort, Farbklang faellt weg (Stufe 2)", fitHeroAlt(REFS["R3-linie-bot-kamera"].de, "de") === "Linienzeichnung: digital age Bot mit Kopfhörern und grünem Visier, dahinter in Umrissbuchstaben «AI Money Moves».");
  ok("R4 Typo", fitHeroAlt(REFS["R4-typo-standard"].de, "de") === "Schriftzug «AI MONEY MOVES», grün auf einem grauen Feld.");
  ok("R4 Typo en", fitHeroAlt(REFS["R4-typo-standard"].en, "en") === 'Lettering "AI MONEY MOVES", green on a grey panel.');
}

section("Beispiele aus dem Nachtrag");
{
  const iot: HeroAltParts = { engine: "line", motif: "das Symbol «Vernetzte Dinge»", color: "dunkel auf grüner Fläche", text: "Mega-Trend IoT", anim: "zeichnen", caption: "unten" };
  ok("Linie IoT", fitHeroAlt(iot, "de") === "Linienzeichnung: Symbol «Vernetzte Dinge», dunkel auf grüner Fläche, darunter «Mega-Trend IoT».", fitHeroAlt(iot, "de"));
  const typo: HeroAltParts = { engine: "typo", motif: "", color: "Weiss mit grünen Akzenten auf dunklem Grund", text: "AI Money Moves", anim: "decode", caption: "" };
  ok("Typo", fitHeroAlt(typo, "de") === "Schriftzug «AI Money Moves», weiss mit grünen Akzenten auf dunklem Grund.", fitHeroAlt(typo, "de"));
  const iotEn: HeroAltParts = { ...iot, motif: 'the symbol "Network"', color: "dark type on a green field" };
  ok("Linie IoT en", fitHeroAlt(iotEn, "en") === 'Line drawing: symbol "Network", dark type on a green field, below it "Mega-Trend IoT".', fitHeroAlt(iotEn, "en"));
}

section("Kuerzungsstufen");
{
  const longMotif = "das Symbol «Internationale Zahlungsinfrastruktur»"; // KI-Titel bis 40 Zeichen
  const p: HeroAltParts = { engine: "line", motif: longMotif, color: "Weiss mit grünen Akzenten auf dunklem Grund", text: "Ein ziemlich langes Schlagwort", anim: "entwurf", caption: "gross" };
  const s1 = composeHeroAlt(p, "de"), s2 = composeHeroAlt(p, "de", { color: false }), s3 = composeHeroAlt(p, "de", { color: false, shortTail: true });
  ok("Stufe 1 > 125, Stufe 2 > 125, Stufe 3 ≤ 125", s1.length > 125 && s2.length > 125 && s3.length <= 125, `${s1.length} ${s2.length} ${s3.length}`);
  ok("Stufe 3 behaelt das Schlagwort", fitHeroAlt(p, "de") === s3 && s3.includes("dahinter «Ein ziemlich langes Schlagwort»"), s3);
  const p4: HeroAltParts = { ...p, motif: "das Symbol «Internationale Zahlungsinfrastruktur und Banken»", text: "Noch ein ziemlich langes Wort" };
  const s4 = fitHeroAlt(p4, "de");
  ok("Stufe 4: Wortgrenze, ≤ 125, kein offenes «, Punkt am Ende", s4.length <= 125 && (s4.match(/«/g) || []).length === (s4.match(/»/g) || []).length && s4.endsWith(".") && !/,\s*$/.test(s4.slice(0, -1)), s4);
  ok("Stufe 4 englisch", (() => { const e = fitHeroAlt({ ...p4, motif: 'the symbol "International payment infrastructure and banks"', color: "white with green accents on a dark background" }, "en"); return e.length <= 125 && (e.match(/"/g) || []).length % 2 === 0 && e.endsWith("."); })());
}

section("Hilfsfunktionen");
{
  ok("motifNoun ohne Artikel", motifNoun("das Symbol «X»") === "Symbol «X»" && motifNoun("ein Gehirn") === "Gehirn" && motifNoun("einen Roboterkopf mit Antenne") === "Roboterkopf mit Antenne" && motifNoun("zwei Münzen") === "zwei Münzen" && motifNoun('the symbol "X"') === 'symbol "X"' && motifNoun("an open book") === "open book");
  ok("cutAtWord kurz bleibt", cutAtWord("Kurzer Text.", 125) === "Kurzer Text.");
  const c = cutAtWord("Linienzeichnung: zwei Münzen, grün auf dunklem Grund, darunter «AI Money Moves».", 60);
  ok("cutAtWord an Wortgrenze mit Punkt", c.length <= 60 && c.endsWith(".") && !c.includes("«"), c);
  const c2 = cutAtWord("Linienzeichnung: zwei Münzen, grün auf dunklem Grund, darunter handgeschrieben «AI Money Moves».", 86);
  ok("cutAtWord raeumt leeren Satzteil weg", c2 === "Linienzeichnung: zwei Münzen, grün auf dunklem Grund.", c2);
  const long = "Grafik von digital age, in Grün auf dunklem Grund. ".repeat(6).trim();
  const v = fitHeroVideoAlt(long);
  ok("Video-ALT ≤ 250 am Satzende", v.length <= HERO_VIDEO_ALT_MAX && v.endsWith("Grund."), String(v.length));
  ok("Video-ALT kurz bleibt", fitHeroVideoAlt("Eine Linie.") === "Eine Linie.");
}

section("keywordFromTitle");
{
  ok("kurzer Titel ganz", keywordFromTitle("Einführung in IoT") === "Einführung in IoT");
  ok("Satzzeichen am Ende weg", keywordFromTitle("Was bringt KI im KMU?") === "Was bringt KI im KMU" && keywordFromTitle("«Agentic AI»") === "Agentic AI");
  ok("Wortgrenze, hoechstens 26", keywordFromTitle("Your Bank Knows Your Transactions. But Your AI Might Move Your Money.") === "Your Bank Knows Your" && keywordFromTitle("Wie KMU mit Agenten heute Zeit sparen") === "Wie KMU mit Agenten heute");
  ok("Satzzeichen im gekuerzten Teil beendet das Schlagwort", keywordFromTitle("Mega-Trend IoT: Die Vernetzung der Dinge") === "Mega-Trend IoT" && keywordFromTitle("KI im Alltag. Was sich jetzt ändert") === "KI im Alltag" && keywordFromTitle("Die Bank, die KI und das Geld der Kunden") === "Die Bank, die KI und das");
  ok("genau 26 an der Grenze", keywordFromTitle("Zwölf Thesen zur Zukunft de Arbeit") === "Zwölf Thesen zur Zukunft" && keywordFromTitle("abcdefghijklmnopqrstuvwxyz und mehr") === "abcdefghijklmnopqrstuvwxyz");
  ok("ein langes Wort hart", keywordFromTitle("Donaudampfschifffahrtsgesellschaftskapitän") === "Donaudampfschifffahrtsgese" && keywordFromTitle("Donaudampfschifffahrtsgese").length === 26);
  ok("leer bleibt leer", keywordFromTitle("") === "" && keywordFromTitle("   ") === "");
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);

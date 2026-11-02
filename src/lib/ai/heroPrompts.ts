// Pure Prompt-Bau + Parser fuer die Hero-Studio-Tasks hero_proposals und
// social_posts. Kein "use server" — nebenwirkungsfrei, damit Server Actions
// (heroActions.ts), Registry (promptRegistry.ts), Studio-Client (Content-Hash,
// Store-Parser) und Test importieren koennen. Drei-Teiler wie seoPrompts.ts:
// Sprache [Code] + Strategie [editierbar] + Schema [Code]. Die generierten
// Listen (Animationen, Bewegungen, Farbklaenge, letzte Heroes, Symbolnamen)
// und der Artikeltext gehen in den User-Prompt.
//
// v1 nur Symbol-Motive: kein Feld "d", keine Bildkontrolle per Vision.

import {
  HERO_ANIM_SET, HERO_MOTION_SET, HERO_SCHEME_SET, HERO_STYLE_SET, HERO_TEXTURE_SET, HERO_WEIGHT_SET,
} from "@/lib/hero-studio/enums";

type Locale = "de-CH" | "en";
export type HeroLang = "de" | "en";

export const HERO_LEAD_MAX = 800;
export const HERO_BODY_MAX = 3500;
export const SOCIAL_BODY_MAX = 2500;
export const HERO_PROPOSALS_MAX_TOKENS = 1200;
export const SOCIAL_POSTS_MAX_TOKENS = 700;
export const HERO_PROPOSALS_STORE_MAX_BYTES = 64 * 1024;

const clampStr = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const cap = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);

function localeLine(locale: Locale | HeroLang, subject: string): string {
  const en = locale === "en";
  return `SPRACHE ${subject}: ${en ? "Englisch" : "Deutsch (Schweizer Rechtschreibung, ss statt ß)"}.`;
}

// ─────────────────────────────────────────────────────────────────────────
// hero_proposals — vier Vorschlaege (2 Linie, 2 Typo) aus dem Beitrag.
// Strategie aus kiPromptHS des Prototyps, ohne eigene Zeichnungen.
// ─────────────────────────────────────────────────────────────────────────

export const HERO_PROPOSALS_STRATEGY = [
  "Du bist Art Director bei digital-age.ch, einem Schweizer Magazin für KI und Future Tech. Für das Hero-Bild eines Beitrags schlägst du 4 Visuals vor: 2 Linienzeichnungen und 2 kinetische Typografien. Das Hero erscheint statisch in Listen und auf der Startseite; im Beitrag kann es animiert laufen.",
  "",
  "REGELN:",
  "1. Schlagwort: 1 bis 3 Wörter, höchstens 20 Zeichen, in der Sprache der Headline. Es erscheint klein unter einer Linienzeichnung oder handgeschrieben.",
  "2. Kennzahl: nur wenn im Text eine prägnante Zahl steht (zum Beispiel «73 %»), sonst leer. Erfinde keine Zahlen.",
  "3. Linie (genau 2 Vorschläge): je ein Motiv als One-Line-Zeichnung, immer ein Symbol aus der Lucide-Liste (Feld \"icon\", exakter Name), weil Symbole sofort erkennbar sind. Nimm das Symbol, das den Kern des Beitrags trifft, und eines, das ihn aus einem anderen Blickwinkel zeigt, etwa als Metapher. Wähle je eine Animation aus der Liste.",
  "4. Typo (genau 2 Vorschläge): ein kurzer Text (1 bis 3 Wörter, höchstens 20 Zeichen, darf vom Schlagwort abweichen) und eine Bewegung aus der Liste.",
  "5. Farbklang (Feld \"farbe\"): eine der ids aus der Liste. Grün ist die Hausfarbe, Orange die zweite Markenfarbe; die Grau-Klänge wirken sachlich, die Flächen plakativ.",
  "6. Die 4 Vorschläge unterscheiden sich deutlich voneinander und von den zuletzt verwendeten Heroes.",
  "7. Begründe jeden Vorschlag in einem Satz (Feld \"warum\"), mit Bezug zum Inhalt des Beitrags.",
].join("\n");

export const HERO_PROPOSALS_SCHEMA = [
  "OUTPUT: NUR ein JSON-Objekt, Schema:",
  "{",
  '  "schlagwort": string,            // 1-3 Woerter, hoechstens 20 Zeichen',
  '  "kennzahl": string,              // leer, wenn keine praegnante Zahl im Text steht',
  '  "linie": [                       // genau 2 Eintraege',
  '    { "titel": string,             // 2-4 Woerter',
  '      "warum": string,             // ein Satz',
  '      "icon": string,              // exakter Name aus der Lucide-Liste',
  '      "stichworte": string[],      // 5-8 Stichworte, Deutsch und Englisch, kleingeschrieben',
  '      "animation": string,         // id aus der Liste der Animationen',
  '      "farbe": string }            // id aus der Liste der Farbklaenge',
  "  ],",
  '  "typo": [                        // genau 2 Eintraege',
  '    { "titel": string, "warum": string,',
  '      "text": string,              // 1-3 Woerter, hoechstens 20 Zeichen',
  '      "motion": string,            // id aus der Liste der Bewegungen',
  '      "sub": 0 | 1 | 2,',
  '      "farbe": string,',
  '      "texture": "none" | "dots" | "lines" | "scan" | "signature",',
  '      "style": "fill" | "outline" | "mixed",',
  '      "weight": 400 | 500 | 600 | 700,',
  '      "upper": boolean }',
  "  ]",
  "}",
  'Keine eigenen Zeichnungen, kein Feld "d". Kein Text ausserhalb des JSON.',
].join("\n");

export function buildHeroProposalsSystem(locale: Locale | HeroLang, strategyOverride?: string): string {
  const strategy = strategyOverride?.trim() || HERO_PROPOSALS_STRATEGY;
  return [localeLine(locale, "von Schlagwort, Text und Begründungen"), strategy, HERO_PROPOSALS_SCHEMA].join("\n\n");
}

export type HeroProposalsInput = {
  headline: string;
  rubrik: string;
  author: string;
  keyword: string;
  lead: string;
  body: string;
  /** Listen aus der Engine (animList, motionList, schemeList) */
  animList: string;
  motionList: string;
  schemeList: string;
  /** Zuletzt verwendete Heroes, eine Zeile pro Eintrag */
  recent: string[];
  /** Symbolnamen, kommagetrennt (promptIconNames) */
  iconNames: string;
};

export function buildHeroProposalsPrompt(a: HeroProposalsInput): string {
  const lead = cap(a.lead, HERO_LEAD_MAX);
  const body = cap(a.body, HERO_BODY_MAX);
  const recent = a.recent.map((r) => cap(r, 160)).filter(Boolean).slice(0, 8);
  return [
    "Beitrag",
    `- Headline: ${cap(a.headline, 300)}`,
    `- Rubrik: ${cap(a.rubrik, 80)}`,
    `- Autor: ${cap(a.author, 120) || "Redaktion"}`,
    `- Fokus-Keyword: ${cap(a.keyword, 80) || "(keins)"}`,
    lead ? `- Lead: ${lead}` : "",
    body ? `- Text (Auszug): ${body}` : "",
    "",
    'Animationen für Linie (Feld "animation"):',
    cap(a.animList, 2000).replace(/ - /g, "\n- "),
    "",
    'Bewegungen für Typo (Feld "motion"):',
    cap(a.motionList, 4000).replace(/ - /g, "\n- "),
    "",
    'Farbklänge (Feld "farbe"):',
    cap(a.schemeList, 2000),
    "",
    "Zuletzt verwendete Heroes, wähle andere Motive und Bewegungen:",
    recent.length ? recent.map((r, i) => `${i + 1}. ${r}`).join("\n") : "keine",
    "",
    `Lucide-Symbole (exakte Namen): ${cap(a.iconNames, 24000)}`,
  ].filter((l) => l !== "").join("\n");
}

export type HeroLineProposal = { titel: string; warum: string; icon: string; stichworte: string[]; animation?: string; farbe?: string };
export type HeroTypoProposal = { titel: string; warum: string; text: string; motion: string; sub?: number; farbe?: string; texture?: string; style?: string; weight?: number; upper?: boolean };
export type HeroProposalsPayload = { schlagwort: string; kennzahl: string; linie: HeroLineProposal[]; typo: HeroTypoProposal[] };

// Am Artikel gespeicherte Vorschlaege (articles.cover_proposals), keine Revision.
export type HeroProposalsStore = HeroProposalsPayload & { version: 1; contentHash: string; createdAt: string };

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export function normalizeIconName(s: unknown): string {
  if (typeof s !== "string") return "";
  return s.trim().toLowerCase().replace(/^lucide[-:\s]*/, "").replace(/[\s_]+/g, "-");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

// Validiert die Antwort: Strings geklemmt, Symbolnamen gegen die Datenliste,
// Kennungen gegen die Enum-Sets, ungueltige Eintraege verworfen. null, wenn
// kein brauchbarer Vorschlag uebrig bleibt (→ invalid_json).
// validIcons = null: jedes Symbol durchlassen (Store lesen; die Engine prueft beim Umsetzen erneut).
export function parseHeroProposals(raw: string, validIcons: ReadonlySet<string> | null): HeroProposalsPayload | null {
  let parsed: unknown;
  try { parsed = JSON.parse(stripCodeFence(raw)); } catch { return null; }
  if (!isRecord(parsed)) return null;
  const linie: HeroLineProposal[] = [];
  for (const o of Array.isArray(parsed.linie) ? parsed.linie : []) {
    if (!isRecord(o)) continue;
    const icon = normalizeIconName(o.icon);
    if (!icon || (validIcons && !validIcons.has(icon))) continue;
    const stichworte = (Array.isArray(o.stichworte) ? o.stichworte : [])
      .filter((x): x is string => typeof x === "string").map((x) => cap(x.toLowerCase(), 30)).filter(Boolean).slice(0, 10);
    const p: HeroLineProposal = { titel: clampStr(o.titel, 40), warum: clampStr(o.warum ?? o.idee, 220), icon, stichworte };
    if (typeof o.animation === "string" && HERO_ANIM_SET.has(o.animation)) p.animation = o.animation;
    if (typeof o.farbe === "string" && HERO_SCHEME_SET.has(o.farbe)) p.farbe = o.farbe;
    linie.push(p);
    if (linie.length >= 2) break;
  }
  const typo: HeroTypoProposal[] = [];
  for (const o of Array.isArray(parsed.typo) ? parsed.typo : []) {
    if (!isRecord(o)) continue;
    if (typeof o.motion !== "string" || !HERO_MOTION_SET.has(o.motion)) continue;
    const p: HeroTypoProposal = { titel: clampStr(o.titel, 40), warum: clampStr(o.warum ?? o.begruendung, 220), text: clampStr(o.text, 30), motion: o.motion };
    const sub = typeof o.sub === "number" ? o.sub : typeof o.sub === "string" ? parseInt(o.sub, 10) : NaN;
    if (Number.isFinite(sub)) p.sub = Math.min(2, Math.max(0, Math.round(sub)));
    if (typeof o.farbe === "string" && HERO_SCHEME_SET.has(o.farbe)) p.farbe = o.farbe;
    if (typeof o.texture === "string" && HERO_TEXTURE_SET.has(o.texture)) p.texture = o.texture;
    if (typeof o.style === "string" && HERO_STYLE_SET.has(o.style)) p.style = o.style;
    const weight = typeof o.weight === "number" ? o.weight : typeof o.weight === "string" ? parseInt(o.weight, 10) : NaN;
    if (HERO_WEIGHT_SET.has(weight)) p.weight = weight;
    if (typeof o.upper === "boolean") p.upper = o.upper;
    typo.push(p);
    if (typo.length >= 2) break;
  }
  if (!linie.length && !typo.length) return null;
  return { schlagwort: clampStr(parsed.schlagwort, 26), kennzahl: clampStr(parsed.kennzahl, 12), linie, typo };
}

// Gespeicherte Vorschlaege lesen (Client und Server): nur Form pruefen; die
// Symbolnamen prueft die Engine beim Umsetzen erneut (sanitizeKi).
export function parseHeroProposalsStore(json: unknown): HeroProposalsStore | null {
  if (!isRecord(json) || json.version !== 1 || typeof json.contentHash !== "string") return null;
  const payload = parseHeroProposals(JSON.stringify({ schlagwort: json.schlagwort, kennzahl: json.kennzahl, linie: json.linie, typo: json.typo }), null);
  if (!payload) return null;
  return { version: 1, contentHash: json.contentHash.slice(0, 32), createdAt: typeof json.createdAt === "string" ? json.createdAt : "", ...payload };
}

// Content-Hash wie strHash der Engine (FNV-1a 32 Bit ueber Code Points): aus
// Titel, Fokus-Keyword, Lead, Text (≤3500) und Rubrik. Gespeicherte Vorschlaege
// gelten nur fuer denselben Inhalt.
export function fnv1a32(s: string): number {
  let h = 2166136261 >>> 0;
  for (const ch of s) { h ^= ch.codePointAt(0) as number; h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export function heroContentHash(a: { headline: string; keyword: string; lead: string; body: string; rubrik: string }): string {
  return fnv1a32([a.headline, a.keyword, cap(a.lead, HERO_LEAD_MAX), cap(a.body, HERO_BODY_MAX), a.rubrik].map((x) => (x || "").trim()).join("|")).toString(16);
}

// ─────────────────────────────────────────────────────────────────────────
// social_posts — LinkedIn- und Instagram-Text zum Beitrag (postPromptHS).
// ─────────────────────────────────────────────────────────────────────────

export const SOCIAL_POSTS_STRATEGY = [
  "Du schreibst Social-Media-Posts für digital-age.ch, ein Schweizer Magazin für KI und Future Tech. Zielgruppe: Entscheider und Praktiker in der DACH-Region.",
  "",
  "SCHREIBE:",
  "1. linkedin: 500 bis 900 Zeichen. Der erste Satz ist ein konkreter Einstieg, keine rhetorische Frage und keine Floskel wie «In der heutigen Zeit». Zwei bis drei kurze Absätze. Höchstens ein Emoji. Am Ende ein Satz, der zum Beitrag führt, mit dem Platzhalter {{LINK}}, und die Nennung des Autors.",
  "2. instagram: höchstens 400 Zeichen, lockerer, endet mit «Link in Bio» (bei Englisch «Link in bio»).",
  "3. hashtags: 3 bis 5 passende Hashtags in CamelCase, keine generischen Einzelwörter wie #AI oder #Tech.",
  "",
  "Verwende nur Fakten aus den Angaben; erfinde keine Zahlen, Zitate oder Details.",
].join("\n");

export const SOCIAL_POSTS_SCHEMA = [
  "OUTPUT: NUR ein JSON-Objekt, Schema:",
  '{ "linkedin": string, "instagram": string, "hashtags": string[] }',
  "Kein Text ausserhalb des JSON.",
].join("\n");

export function buildSocialPostsSystem(lang: HeroLang, strategyOverride?: string): string {
  const strategy = strategyOverride?.trim() || SOCIAL_POSTS_STRATEGY;
  return [localeLine(lang, "der Posts"), strategy, SOCIAL_POSTS_SCHEMA].join("\n\n");
}

export type SocialPostsInput = {
  headline: string;
  rubrik: string;
  author: string;
  figure: string;
  keyword: string;
  lead: string;
  body: string;
};

export function buildSocialPostsPrompt(a: SocialPostsInput): string {
  const lead = cap(a.lead, HERO_LEAD_MAX);
  const body = cap(a.body, SOCIAL_BODY_MAX);
  const fig = cap(a.figure, 12);
  return [
    "Artikel",
    `- Headline: ${cap(a.headline, 300)}`,
    `- Rubrik: ${cap(a.rubrik, 80)}`,
    `- Autor: ${cap(a.author, 120) || "Redaktion"}`,
    fig ? `- Kennzahl aus dem Artikel: ${fig}` : "",
    `- Schlagwort im Visual: ${cap(a.keyword, 40) || "(keins)"}`,
    lead ? `- Lead: ${lead}` : "",
    body ? `- Auszug aus dem Text: ${body}` : "",
    "",
    "Der Platzhalter {{LINK}} wird durch den Link zum Beitrag ersetzt.",
  ].filter((l) => l !== "").join("\n");
}

export type SocialPosts = { linkedin: string; instagram: string; hashtags: string[] };

export function parseSocialPosts(raw: string): SocialPosts | null {
  let parsed: unknown;
  try { parsed = JSON.parse(stripCodeFence(raw)); } catch { return null; }
  if (!isRecord(parsed)) return null;
  const tags = (Array.isArray(parsed.hashtags) ? parsed.hashtags : [])
    .filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean)
    .map((x) => (x.startsWith("#") ? x : "#" + x)).slice(0, 5);
  const linkedin = typeof parsed.linkedin === "string" ? parsed.linkedin.trim().slice(0, 3000) : "";
  const instagram = typeof parsed.instagram === "string" ? parsed.instagram.trim().slice(0, 2200) : "";
  if (!linkedin && !instagram) return null;
  return { linkedin, instagram, hashtags: tags };
}

// {{LINK}} ersetzen und Hashtags anhaengen, falls sie nicht schon im Text stehen.
export function finishPost(text: string, url: string, tags: string[]): string {
  const clean = text.replace(/\{\{\s*LINK\s*\}\}/g, url).trim();
  if (!clean) return "";
  return tags.length && !tags.every((t) => clean.includes(t)) ? `${clean}\n\n${tags.join(" ")}` : clean;
}

// Kennungen der Engine als reine Daten, fuer die serverseitige Validierung der
// KI-Antworten (heroPrompts.ts). Spiegel von vendor/hero-engine.js: ANIMS
// (line/consts.js), MODES (typo), SCHEMES (shared), TEX_LBL/STYLE_LBL/WEIGHT_LBL
// (typo) und die eigenen Symbole (consts.js OWN_ICONS). Bei Aenderungen an der
// Engine hier nachziehen.

export const HERO_ANIM_IDS = [
  "zeichnen", "lichtlauf", "atmen", "aufloesen", "morph", "faden", "schreiben", "kamera", "zweistift", "entwurf",
] as const;

export const HERO_MOTION_IDS = [
  "cylinder", "ticker", "decode", "raster", "echo", "wave", "takt", "fallblatt", "ring", "pfad", "streuung", "stapel", "schnitt", "blende", "pegel",
] as const;

export const HERO_SCHEME_IDS = [
  "gruen", "weiss_gruen", "gruen_orange", "orange", "orange_gruen", "trio", "grau_gruen", "grau_orange", "graufeld", "flaeche_gruen", "flaeche_orange", "flaeche_weiss",
] as const;

export const HERO_TEXTURE_IDS = ["none", "dots", "lines", "scan", "signature"] as const;
export const HERO_STYLE_IDS = ["fill", "outline", "mixed"] as const;
export const HERO_WEIGHTS = [400, 500, 600, 700] as const;
export const HERO_OWN_ICONS = ["robot", "coins-rim", "coins-franc", "digital-age-bot"] as const;

export const HERO_ANIM_SET: ReadonlySet<string> = new Set(HERO_ANIM_IDS);
export const HERO_MOTION_SET: ReadonlySet<string> = new Set(HERO_MOTION_IDS);
export const HERO_SCHEME_SET: ReadonlySet<string> = new Set(HERO_SCHEME_IDS);
export const HERO_TEXTURE_SET: ReadonlySet<string> = new Set(HERO_TEXTURE_IDS);
export const HERO_STYLE_SET: ReadonlySet<string> = new Set(HERO_STYLE_IDS);
export const HERO_WEIGHT_SET: ReadonlySet<number> = new Set(HERO_WEIGHTS);

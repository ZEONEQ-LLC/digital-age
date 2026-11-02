// Typisierte Fassade fuer das vendorte Engine-Modul hero-engine.js (generiert aus dem Prototyp,
// siehe scripts/hero-studio/freeze-engine.py). Die Engine laeuft nur im Browser (Canvas 2D, SVG-Sampler).

export type HeroEngineId = "line" | "typo";
export type HeroViewId = "hero" | "og" | "portrait" | "story" | "square";
export type HeroFormatId = "wide" | "og" | "portrait" | "story" | "square";
export type HeroLang = "de" | "en";

export interface HeroView { id: HeroViewId; label: string; sub: string; fmt: HeroFormatId; brand: boolean; headline: boolean }
export interface HeroFormat { w: number; h: number; ratio: string; name: string }
export interface HeroScheme { name: string; desc: string; main: string; second: string; signal: string; fill: string; ink: string; bg: string | null; logo: string; hue: string }
export interface HeroAnim { name: string; base: number; desc: string }
export interface HeroMode { name: string; base: number; angles: number[]; align: boolean; fill?: boolean; desc: string; fits: string; subs: string[] }

/** KI-Motiv (v1 nur icon; d bleibt im Typ, wird aber nicht erzeugt) */
export interface HeroKiMotif { id: string; titel: string; idee?: string; keys?: string; icon?: string; d?: string; status?: string; blind?: string }

/** Ein Vorschlag bzw. die gewaehlte Variante. Optionen-Schluessel in overrides stammen aus options(). */
export interface HeroSpec {
  id?: string;
  engine: HeroEngineId;
  variant: number;
  overrides: Record<string, string | number | boolean>;
  text?: string | null;
  figure?: string | null;
  kiMotifs: HeroKiMotif[];
  titel?: string;
  why?: string;
  source?: "auto" | "ki" | "saved";
  check?: string;
}

/** Zeitpunkt in der Schleife: Anteil p (0..1) oder Sekunden. */
export type HeroTime = { p: number; sec?: undefined } | { sec: number; p?: undefined };

export interface HeroArticle {
  /** seedKey (im Prototyp der Slug); bestimmt zusammen mit variant das Rezept */
  slug: string;
  headline: string;
  rubrik: string;
  author: string;
  date: string;
  readMin: number;
  keyword: string;
  figure: string;
  lead: string;
  body: string;
}

export type HeroEffective = Record<string, string | number | boolean | null | undefined>;
export interface HeroAltParts {
  engine: HeroEngineId;
  /** Motiv-Phrase der Engine mit Artikel, z. B. «das Symbol «Vernetzte Dinge»» (Linie), leer bei Typo */
  motif: string;
  /** Farbklang ohne fuehrendes «in», z. B. «dunkel auf grüner Fläche» */
  color: string;
  /** Schlagwort bzw. Schriftzug, wie gezeichnet */
  text: string;
  /** Animation (Linie) bzw. Bewegung (Typo) */
  anim: string;
  /** Schlagwort im Bild (Linie): keine | unten | gross */
  caption: string;
}
export type HeroOptionValue = string | number | boolean;
export interface HeroOption {
  k: string;
  label: string;
  type: "chips" | "range";
  opts?: [HeroOptionValue, string][];
  min?: number;
  max?: number;
  step?: number;
  fmt?: (v: number) => string;
}
export interface HeroSummary { kind: string; main: string; tech: string; reason: string }
export interface HeroMotifInfo { id: string; name: string; icon?: string; ki?: boolean; abstract?: boolean; alt: { de: string; en: string }; d?: string }
export interface HeroMotifTop { top: string[]; rest: string[]; matched: Set<string> }
export type HeroFingerprint = Record<string, string | number>;
export interface HeroMemoryEntry {
  key: string;
  engine: HeroEngineId;
  title: string;
  variant: number;
  overrides: Record<string, string | number | boolean>;
  text: string;
  fp: HeroFingerprint;
  kiMotifs: HeroKiMotif[];
  animated: boolean;
  savedAtMs: number;
}
export interface HeroCheck {
  ok: boolean;
  closest?: { entry: HeroMemoryEntry; sim: number } | null;
  reason?: "motif" | "motion" | "similar";
  hit?: HeroMemoryEntry;
  count?: number;
}
/** Vorberechnete Linie eines Motivs (Punkte normalisiert auf -0.5..0.5) */
export interface HeroMotifData { pts: [number, number][]; nrm: [number, number][]; conn: Uint8Array; hi: Uint8Array; w: number; h: number; len: number }
export interface HeroScriptFont { upm: number; asc: number; xh: number; g: Record<string, [number, string]> }
export interface HeroKiLineProposal { titel?: string; warum?: string; idee?: string; icon?: string; stichworte?: string[]; animation?: string; farbe?: string }
export interface HeroKiTypoProposal { titel?: string; warum?: string; text?: string; motion?: string; sub?: number; farbe?: string; texture?: string; style?: string; weight?: number; upper?: boolean; angle?: number; align?: string; font?: string }
export interface HeroKiResponse { schlagwort?: string; kennzahl?: string; linie?: HeroKiLineProposal[]; typo?: HeroKiTypoProposal[] }

export interface HeroEngine {
  VIEWS: HeroView[];
  VIEW_BY_ID: Record<HeroViewId, HeroView>;
  FORMATS: Record<HeroFormatId, HeroFormat>;
  SCHEMES: Record<string, HeroScheme>;
  ANIMS: Record<string, HeroAnim>;
  MODES: Record<string, HeroMode>;
  MOTIFS: HeroMotifInfo[];
  ICON_DE: Record<string, string>;
  EN_DE: Record<string, string>;

  setArticle(a: Partial<HeroArticle>): void;
  getArticle(): HeroArticle;
  setKiKeyword(s: string): void;
  getKiKeyword(): string;
  setMemory(list: HeroMemoryEntry[]): void;
  recentHeroes(): HeroMemoryEntry[];
  memoryEntry(spec: HeroSpec, animated: boolean): HeroMemoryEntry;

  renderSpec(ctx: CanvasRenderingContext2D, spec: HeroSpec, time: HeroTime, view: HeroViewId | HeroView, scale?: number): void;
  heroP(spec: HeroSpec): number;
  loopOf(spec: HeroSpec): number;
  fitCanvas(c: HTMLCanvasElement, view: HeroView, cssW: number): number;
  effective(spec: HeroSpec): HeroEffective;
  summary(spec: HeroSpec): HeroSummary;
  altStatic(spec: HeroSpec, lang: HeroLang): string;
  altAnimated(spec: HeroSpec, lang: HeroLang): string;
  /** Bausteine des kurzen ALT-Texts (Zusammensetzen und Kuerzen in alt.ts) */
  altParts(spec: HeroSpec, lang: HeroLang): HeroAltParts;
  fingerprint(spec: HeroSpec): HeroFingerprint;
  checkFp(spec: HeroSpec): HeroCheck;
  options(spec: HeroSpec): HeroOption[];

  motifTop(spec: HeroSpec): HeroMotifTop;
  motifInfo(spec: HeroSpec, id: string): HeroMotifInfo | null;
  motifData(id: string, key: string, variant: number): HeroMotifData;
  drawMotifThumb(canvas: HTMLCanvasElement, m: HeroMotifData | null, color: string, bg: string | null, hiColor?: string): void;
  searchIcons(q: string, limit?: number): string[];
  iconMotifId(name: string): string;
  iconLabel(name: string): string;

  registerKi(m: HeroKiMotif): void;
  registerSpec(spec: HeroSpec): void;
  kiRecord(m: HeroKiMotif): HeroKiMotif;
  sanitizeKi(o: unknown): HeroKiMotif | null;
  sanitizeRegie(o: unknown): { ov: Record<string, string | number | boolean>; text: string; titel: string; begruendung: string } | null;
  promptIconNames(): string;
  animList(): string;
  motionList(): string;
  schemeList(): string;

  baseSpec(engine: HeroEngineId): HeroSpec;
  autoSpec(engine: HeroEngineId, others: HeroSpec[]): HeroSpec;
  rerollSpec(old: HeroSpec, others: HeroSpec[]): HeroSpec;
  rollSpec(s: HeroSpec, others: HeroSpec[]): HeroSpec;
  specsFromKi(res: HeroKiResponse): { specs: HeroSpec[]; kiKeyword: string };
  articleKey(): string;
  articleKeyFrom(slug: string, headline: string): string;
  detectLang(text: string): HeroLang;
  strHash(s: string): number;

  logoReady: Promise<unknown>;
  clearTextCaches(): void;
  dispose(): void;
}

export function createHeroEngine(init: {
  icons: Record<string, string>;
  iconTags: Record<string, string>;
  scriptFont: HeroScriptFont;
  /** URL der Alpha-Maske des Logos (public/images/hero-studio/logo-mask.png) */
  logoMask: string;
}): HeroEngine;

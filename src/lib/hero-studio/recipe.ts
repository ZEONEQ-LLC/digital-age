// Rezept v1 des Hero Studio: Typ, Bauen, Validieren. Das Rezept liegt in
// articles.cover_recipe (jsonb, im Revisions-Snapshot) und erlaubt, das Hero in
// jedem Format neu zu berechnen: gleicher seedKey + variant + overrides = gleiches
// Bild (Engine ist deterministisch, siehe vendor/).

import type { Json } from "@/lib/database.types";
import type { HeroEngineId, HeroFingerprint, HeroKiMotif, HeroSpec } from "./vendor";

export const HERO_RECIPE_VERSION = 1 as const;
export const HERO_STUDIO_VERSION = "1";
// saveArticle prueft 32 KB; wir bleiben deutlich darunter.
export const HERO_RECIPE_MAX_BYTES = 24 * 1024;

export type HeroOverrides = Record<string, string | number | boolean>;

export type HeroRecipeSnapshot = {
  title: string;
  author: string;
  date: string;
  category: string;
};

export type HeroRecipeFiles = {
  hero: string;
  og: string;
  video: string | null;
};

export type HeroRecipe = {
  version: typeof HERO_RECIPE_VERSION;
  studioVersion: string;
  engine: HeroEngineId;
  variant: number;
  overrides: HeroOverrides;
  text: string;
  figure: string | null;
  kiMotifs: HeroKiMotif[];
  animated: boolean;
  seedKey: string;
  fp: HeroFingerprint;
  snapshot: HeroRecipeSnapshot;
  files: HeroRecipeFiles;
  createdAt: string;
};

// Erlaubte Override-Schluessel je Engine: Schnelleinstellungen der Shell plus
// das Optionen-Schema aus options() (line-api.js / typo-api.js).
export const LINE_OVERRIDE_KEYS = [
  "motif", "motif2", "anim", "color",
  "stroke", "weight", "comp", "caption", "texture", "angle", "scale", "wobble", "speed",
] as const;
export const TYPO_OVERRIDE_KEYS = [
  "motion", "color",
  "sub", "angle", "align", "style", "weight", "tracking", "upper", "font", "texture", "scale", "intensity", "speed",
] as const;

const OVERRIDE_KEYS: Record<HeroEngineId, readonly string[]> = {
  line: LINE_OVERRIDE_KEYS,
  typo: TYPO_OVERRIDE_KEYS,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function sanitizeOverrides(engine: HeroEngineId, ov: unknown): HeroOverrides {
  const out: HeroOverrides = {};
  if (!isRecord(ov)) return out;
  for (const k of OVERRIDE_KEYS[engine]) {
    const v = ov[k];
    if (typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v))) out[k] = v;
  }
  return out;
}

// v1: nur Symbol-Motive (icon). Eigene Zeichnungen (d) werden verworfen.
export function sanitizeKiMotifs(list: unknown): HeroKiMotif[] {
  if (!Array.isArray(list)) return [];
  const out: HeroKiMotif[] = [];
  for (const m of list) {
    if (!isRecord(m)) continue;
    if (typeof m.id !== "string" || !m.id.startsWith("ki-") || typeof m.icon !== "string" || !m.icon) continue;
    out.push({
      id: m.id.slice(0, 80),
      titel: String(m.titel ?? "").slice(0, 40),
      idee: String(m.idee ?? "").slice(0, 240),
      keys: String(m.keys ?? "").slice(0, 300),
      icon: m.icon.slice(0, 60),
    });
    if (out.length >= 4) break;
  }
  return out;
}

function sanitizeFingerprint(fp: unknown): HeroFingerprint {
  const out: HeroFingerprint = {};
  if (!isRecord(fp)) return out;
  for (const [k, v] of Object.entries(fp)) {
    if (typeof v === "string" || typeof v === "number") out[k] = v;
  }
  return out;
}

export type BuildRecipeInput = {
  spec: HeroSpec;
  animated: boolean;
  seedKey: string;
  fp: HeroFingerprint;
  snapshot: HeroRecipeSnapshot;
  files: HeroRecipeFiles;
};

export function buildHeroRecipe(input: BuildRecipeInput): HeroRecipe {
  const { spec } = input;
  return {
    version: HERO_RECIPE_VERSION,
    studioVersion: HERO_STUDIO_VERSION,
    engine: spec.engine,
    variant: Math.max(0, Math.floor(spec.variant || 0)),
    overrides: sanitizeOverrides(spec.engine, spec.overrides),
    text: (spec.text ?? "").replace(/\s+/g, " ").trim().slice(0, 30),
    figure: spec.figure ? String(spec.figure).trim().slice(0, 12) || null : null,
    kiMotifs: sanitizeKiMotifs(spec.kiMotifs),
    animated: !!input.animated,
    seedKey: input.seedKey.slice(0, 120),
    fp: sanitizeFingerprint(input.fp),
    snapshot: {
      title: input.snapshot.title.slice(0, 300),
      author: input.snapshot.author.slice(0, 120),
      date: input.snapshot.date.slice(0, 20),
      category: input.snapshot.category.slice(0, 80),
    },
    files: {
      hero: input.files.hero.slice(0, 200),
      og: input.files.og.slice(0, 200),
      video: input.files.video ? input.files.video.slice(0, 200) : null,
    },
    createdAt: new Date().toISOString(),
  };
}

// Liest ein gespeichertes Rezept. null bei allem, was kein Rezept v1 ist
// (auch JSON-null, das der Restore aelterer Snapshots schreibt).
export function parseHeroRecipe(json: unknown): HeroRecipe | null {
  if (!isRecord(json)) return null;
  if (json.version !== HERO_RECIPE_VERSION) return null;
  const engine = json.engine;
  if (engine !== "line" && engine !== "typo") return null;
  if (typeof json.seedKey !== "string" || !json.seedKey) return null;
  const files = isRecord(json.files) ? json.files : null;
  if (!files || typeof files.hero !== "string" || typeof files.og !== "string") return null;
  const snap = isRecord(json.snapshot) ? json.snapshot : {};
  const variant = typeof json.variant === "number" && Number.isFinite(json.variant) ? Math.max(0, Math.floor(json.variant)) : 0;
  return {
    version: HERO_RECIPE_VERSION,
    studioVersion: typeof json.studioVersion === "string" ? json.studioVersion : HERO_STUDIO_VERSION,
    engine,
    variant,
    overrides: sanitizeOverrides(engine, json.overrides),
    text: typeof json.text === "string" ? json.text.slice(0, 30) : "",
    figure: typeof json.figure === "string" && json.figure.trim() ? json.figure.trim().slice(0, 12) : null,
    kiMotifs: sanitizeKiMotifs(json.kiMotifs),
    animated: json.animated === true,
    seedKey: json.seedKey.slice(0, 120),
    fp: sanitizeFingerprint(json.fp),
    snapshot: {
      title: typeof snap.title === "string" ? snap.title : "",
      author: typeof snap.author === "string" ? snap.author : "",
      date: typeof snap.date === "string" ? snap.date : "",
      category: typeof snap.category === "string" ? snap.category : "",
    },
    files: {
      hero: files.hero,
      og: files.og,
      video: typeof files.video === "string" && files.video ? files.video : null,
    },
    createdAt: typeof json.createdAt === "string" ? json.createdAt : "",
  };
}

export function recipeToJson(r: HeroRecipe): Json {
  return JSON.parse(JSON.stringify(r)) as Json;
}

export function recipeByteLength(r: HeroRecipe): number {
  return new TextEncoder().encode(JSON.stringify(r)).length;
}

// Die gespeicherte Variante als Spec fuer die Engine (Karte «Am Beitrag»).
export function recipeToSpec(r: HeroRecipe, id = "saved"): HeroSpec {
  return {
    id,
    engine: r.engine,
    variant: r.variant,
    overrides: { ...r.overrides },
    text: r.text,
    figure: r.figure,
    kiMotifs: r.kiMotifs.map((m) => ({ ...m })),
    source: "saved",
  };
}

// «Veraltet»: welche Artikelfelder sich seit dem Uebernehmen geaendert haben.
export function heroStaleChanges(r: HeroRecipe, live: HeroRecipeSnapshot): string[] {
  const norm = (s: string) => (s || "").replace(/\s+/g, " ").trim();
  const out: string[] = [];
  if (norm(r.snapshot.title) !== norm(live.title)) out.push("Titel");
  if (norm(r.snapshot.author) !== norm(live.author)) out.push("Autor");
  if (norm(r.snapshot.date) !== norm(live.date)) out.push("Datum");
  if (norm(r.snapshot.category) !== norm(live.category)) out.push("Rubrik");
  return out;
}

// Storage-Pfade, die ein Rezept referenziert (fuer das Aufraeumen nach dem Speichern).
export function recipeFilePaths(r: HeroRecipe | null | undefined): string[] {
  if (!r) return [];
  return [r.files.hero, r.files.og, r.files.video].filter((p): p is string => !!p);
}

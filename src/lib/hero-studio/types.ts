// Schnittstelle zwischen EditorClient und dem Hero Studio (Tab im Artikel-Editor).

import type { HeroRecipe } from "./recipe";
import type { HeroEngineId, HeroLang, HeroSpec, HeroViewId } from "./vendor";

// Artikeldaten, wie das Studio sie braucht (Diagnose I): alles aus dem Editor-State.
export type HeroArticleInput = {
  articleId: string;
  slug: string;
  headline: string;
  rubrik: string;
  author: string;
  /** TT.MM.JJJJ */
  date: string;
  readMin: number;
  keyword: string;
  figure: string;
  lead: string;
  /** Klartext des Body (stripAllMarkup) */
  body: string;
  lang: HeroLang;
};

// Ergebnis des Uebernehmens, das der Editor speichert (ein saveArticle, eine Revision).
export type HeroApplyInput = {
  coverUrl: string;
  ogUrl: string;
  videoUrl: string | null;
  altStatic: string;
  altAnimated: string | null;
  recipe: HeroRecipe;
};

export type HeroApplyResult = { ok: true } | { ok: false; error: string };

export type HeroTakeResult = {
  spec: HeroSpec;
  /** Fingerabdruck aus Variante, Einstellungen, Animation und Artikelfeldern (Prototyp takeKey) */
  key: string;
  /** Blobs des letzten frischen Uebernehmens (fuer Downloads); null bei wiederhergestelltem Stand */
  hero: Blob | null;
  og: Blob | null;
  video: Blob | null;
  /** Public-URLs im Storage */
  heroUrl: string;
  ogUrl: string;
  videoUrl: string | null;
  altStatic: string;
  altAnim: string;
  altSocial: string;
  recipe: HeroRecipe;
  slug: string;
  posts: { li: string; ig: string; langSel: string } | null;
  social: {
    portrait: { png: Blob | null; mp4: Blob | null };
    story: { png: Blob | null; mp4: Blob | null };
  };
};

// Session-Zustand des Studios, lebt im EditorClient (useRef), damit ein
// Tab-Wechsel die Vorschlaege, die Auswahl und das letzte Ergebnis nicht verwirft.
export type HeroSession = {
  props: HeroSpec[];
  filter: "alle" | HeroEngineId;
  selId: string | null;
  viewId: HeroViewId;
  animated: boolean;
  chosen: boolean;
  kiKeyword: string;
  propSeq: number;
  motifsOpen: boolean;
  take: HeroTakeResult | null;
};

export type HeroStudioProps = {
  article: HeroArticleInput;
  /** gespeichertes Rezept des Artikels (cover_recipe) oder null */
  recipe: HeroRecipe | null;
  /** gespeicherte Dateien des Artikels, damit Schritt 3 den uebernommenen Stand zeigt */
  saved: { coverUrl: string; ogUrl: string; videoUrl: string | null; alt: string } | null;
  session: HeroSession | null;
  onSessionChange: (s: HeroSession) => void;
  onApply: (input: HeroApplyInput) => Promise<HeroApplyResult>;
};

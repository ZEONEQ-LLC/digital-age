// Geometrie + Regeln der sechs Platzierungen — EINE Quelle im Code (E5).
// Die Katalogspalten in ad_placements (desktop_height, mobile_height,
// min_viewport, insert_after_block) sind nur noch Anzeige.
// Client-sicher: kein Server-Import.
import type { ScopeKind } from "@/lib/ads/types";

export type PlacementCode =
  | "home_billboard"
  | "hub_sidebar"
  | "swiss_ai_sidebar"
  | "article_inline"
  | "rail_left"
  | "rail_right";

export type HeightPair = { desktop: number; mobile: number };
export type Size = { w: number; h: number };

export type PlacementGeometry = {
  // Reservierte Hoehe fuer typografische (internal) Kreative — jetzt genutzt (D1).
  internalHeight: HeightPair;
  // Bildformat-Hoehen fuer kind='image' (reserviert, wenn getSlotReservation "image" liefert).
  imageHeight: HeightPair;
  // Katalogformat aus dem Seed (desktop_size / mobile_size). Bild-Kreative
  // muessen dazu passen (G2): Seitenverhaeltnis +-2 %, Breite >= Nennbreite.
  // Mobile als Liste erlaubter Formate: das erste ist das Katalogformat
  // (Mediadaten, Reservierung), weitere sind Alternativen, der Kunde waehlt
  // pro Kampagne (Backlog 23.09.: home_billboard zusaetzlich 300x250).
  imageSize: { desktop: Size; mobile?: Size[] };
  // Reservierte Mobile-Hoehe, wenn ein Kreativ im alternativen (hoeheren)
  // Mobile-Format live ist (getSlotReservation "image-tall").
  imageHeightMobileAlt?: number;
  // "wide": breite Flaeche, ab 768px horizontal (Text links, CTA rechts).
  // "stacked": Sidebar/Rail, gestapelt und oben ausgerichtet.
  layout: "wide" | "stacked";
  minViewport?: number;
  // Menschlich gezaehlt: "nach dem N-ten Block" (E7). Einfuegung bei Index N-1.
  insertAfterBlock?: number;
  allowedScopes: ScopeKind[];
  allowedRessorts?: string[];
};

// Band-Aufschlag fuer article_inline (Presserat 10.1, Kundenkreative im
// Artikel): Kopfzeile (~20 px) + Abstand (12 px) + Innenabstand oben/unten
// (2 x 20 px). Einmal gemessen, in die reservierten Hoehen eingerechnet, damit
// die Hoehe vor dem Fetch bekannt bleibt (CLS-Regel aus #157/#158).
export const BAND_EXTRA = 72;

export const PLACEMENTS: Record<PlacementCode, PlacementGeometry> = {
  home_billboard: {
    imageSize: { desktop: { w: 970, h: 250 }, mobile: [{ w: 320, h: 100 }, { w: 300, h: 250 }] },
    internalHeight: { desktop: 132, mobile: 150 }, imageHeight: { desktop: 250, mobile: 100 }, imageHeightMobileAlt: 250,
    layout: "wide", allowedScopes: ["global"],
  },
  hub_sidebar: {
    imageSize: { desktop: { w: 300, h: 600 }, mobile: [{ w: 300, h: 250 }] },
    internalHeight: { desktop: 168, mobile: 150 }, imageHeight: { desktop: 600, mobile: 250 },
    layout: "stacked", allowedScopes: ["global", "ressort"], allowedRessorts: ["ki-business", "future-tech"],
  },
  swiss_ai_sidebar: {
    imageSize: { desktop: { w: 300, h: 250 }, mobile: [{ w: 300, h: 250 }] },
    internalHeight: { desktop: 168, mobile: 150 }, imageHeight: { desktop: 250, mobile: 250 },
    layout: "stacked", allowedScopes: ["global", "ressort"], allowedRessorts: ["swiss-ai"],
  },
  article_inline: {
    imageSize: { desktop: { w: 728, h: 90 }, mobile: [{ w: 300, h: 250 }] },
    internalHeight: { desktop: 132 + BAND_EXTRA, mobile: 150 + BAND_EXTRA }, imageHeight: { desktop: 90 + BAND_EXTRA, mobile: 250 + BAND_EXTRA },
    layout: "wide", insertAfterBlock: 3, allowedScopes: ["global", "ressort", "article"],
  },
  rail_left: {
    imageSize: { desktop: { w: 160, h: 600 } },
    internalHeight: { desktop: 600, mobile: 0 }, imageHeight: { desktop: 600, mobile: 0 },
    layout: "stacked", minViewport: 1680, allowedScopes: ["global"],
  },
  rail_right: {
    imageSize: { desktop: { w: 160, h: 600 } },
    internalHeight: { desktop: 600, mobile: 0 }, imageHeight: { desktop: 600, mobile: 0 },
    layout: "stacked", minViewport: 1680, allowedScopes: ["global"],
  },
};

export const PLACEMENT_CODES = Object.keys(PLACEMENTS) as PlacementCode[];

export function isPlacementCode(code: string): code is PlacementCode {
  return Object.prototype.hasOwnProperty.call(PLACEMENTS, code);
}

// Alle erlaubten Bildformate einer Platzierung je Variante; leer = liefert in
// dieser Variante nicht aus (Rails haben kein Mobile). Das erste ist das
// Katalogformat.
export function expectedSizes(code: PlacementCode, variant: "desktop" | "mobile"): Size[] {
  const g = PLACEMENTS[code];
  return variant === "mobile" ? g.imageSize.mobile ?? [] : [g.imageSize.desktop];
}

// Katalogformat (das erste erlaubte); null = liefert in dieser Variante nicht aus.
export function expectedSize(code: PlacementCode, variant: "desktop" | "mobile"): Size | null {
  return expectedSizes(code, variant)[0] ?? null;
}

// Erstes erlaubtes Format, zu dem die Masse passen; null = passt zu keinem.
export function matchingExpectedSize(code: PlacementCode, variant: "desktop" | "mobile", w: number, h: number): Size | null {
  return expectedSizes(code, variant).find((exp) => matchesExpectedSize(w, h, exp)) ?? null;
}

export function formatSizeList(sizes: Size[]): string {
  return sizes.map((s) => `${s.w}×${s.h}`).join(" oder ");
}

// G2: Seitenverhaeltnis innerhalb 2 % des Katalogformats, Breite >= Nennbreite
// (Retina-Vielfache erlaubt). Toleranz auch auf /mediadaten angezeigt.
export const ASPECT_TOLERANCE = 0.02;

export function matchesExpectedSize(w: number, h: number, exp: Size): boolean {
  if (w <= 0 || h <= 0) return false;
  const ratio = (w / h) / (exp.w / exp.h);
  return Math.abs(ratio - 1) <= ASPECT_TOLERANCE && w >= exp.w;
}

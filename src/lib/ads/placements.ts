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

export type PlacementGeometry = {
  // Reservierte Hoehe fuer typografische (internal) Kreative — jetzt genutzt (D1).
  internalHeight: HeightPair;
  // Bildformat-Hoehen fuer kind='image' — ab PR 2 genutzt.
  imageHeight: HeightPair;
  // "wide": breite Flaeche, ab 768px horizontal (Text links, CTA rechts).
  // "stacked": Sidebar/Rail, gestapelt und oben ausgerichtet.
  layout: "wide" | "stacked";
  minViewport?: number;
  // Menschlich gezaehlt: "nach dem N-ten Block" (E7). Einfuegung bei Index N-1.
  insertAfterBlock?: number;
  allowedScopes: ScopeKind[];
  allowedRessorts?: string[];
};

export const PLACEMENTS: Record<PlacementCode, PlacementGeometry> = {
  home_billboard: {
    internalHeight: { desktop: 132, mobile: 150 }, imageHeight: { desktop: 250, mobile: 100 },
    layout: "wide", allowedScopes: ["global"],
  },
  hub_sidebar: {
    internalHeight: { desktop: 168, mobile: 150 }, imageHeight: { desktop: 600, mobile: 250 },
    layout: "stacked", allowedScopes: ["global", "ressort"], allowedRessorts: ["ki-business", "future-tech"],
  },
  swiss_ai_sidebar: {
    internalHeight: { desktop: 168, mobile: 150 }, imageHeight: { desktop: 250, mobile: 250 },
    layout: "stacked", allowedScopes: ["global", "ressort"], allowedRessorts: ["swiss-ai"],
  },
  article_inline: {
    internalHeight: { desktop: 132, mobile: 150 }, imageHeight: { desktop: 90, mobile: 250 },
    layout: "wide", insertAfterBlock: 3, allowedScopes: ["global", "ressort", "article"],
  },
  rail_left: {
    internalHeight: { desktop: 600, mobile: 0 }, imageHeight: { desktop: 600, mobile: 0 },
    layout: "stacked", minViewport: 1680, allowedScopes: ["global"],
  },
  rail_right: {
    internalHeight: { desktop: 600, mobile: 0 }, imageHeight: { desktop: 600, mobile: 0 },
    layout: "stacked", minViewport: 1680, allowedScopes: ["global"],
  },
};

export const PLACEMENT_CODES = Object.keys(PLACEMENTS) as PlacementCode[];

export function isPlacementCode(code: string): code is PlacementCode {
  return Object.prototype.hasOwnProperty.call(PLACEMENTS, code);
}

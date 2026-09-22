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

export type PlacementGeometry = {
  desktopHeight: number;
  mobileHeight: number;
  minViewport?: number;
  // Menschlich gezaehlt: "nach dem N-ten Block" (E7). Einfuegung bei Index N-1.
  insertAfterBlock?: number;
  allowedScopes: ScopeKind[];
  allowedRessorts?: string[];
};

export const PLACEMENTS: Record<PlacementCode, PlacementGeometry> = {
  home_billboard:   { desktopHeight: 250, mobileHeight: 100, allowedScopes: ["global"] },
  hub_sidebar:      { desktopHeight: 600, mobileHeight: 250, allowedScopes: ["global", "ressort"], allowedRessorts: ["ki-business", "future-tech"] },
  swiss_ai_sidebar: { desktopHeight: 250, mobileHeight: 250, allowedScopes: ["global", "ressort"], allowedRessorts: ["swiss-ai"] },
  article_inline:   { desktopHeight: 90,  mobileHeight: 250, insertAfterBlock: 3, allowedScopes: ["global", "ressort", "article"] },
  rail_left:        { desktopHeight: 600, mobileHeight: 0, minViewport: 1680, allowedScopes: ["global"] },
  rail_right:       { desktopHeight: 600, mobileHeight: 0, minViewport: 1680, allowedScopes: ["global"] },
};

export const PLACEMENT_CODES = Object.keys(PLACEMENTS) as PlacementCode[];

export function isPlacementCode(code: string): code is PlacementCode {
  return Object.prototype.hasOwnProperty.call(PLACEMENTS, code);
}

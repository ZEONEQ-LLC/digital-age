"use client";

import { usePathname } from "next/navigation";
import ModuleSlot from "./ModuleSlot";
import { PLACEMENTS } from "@/lib/ads/placements";

// Zwei vertikale Rails, fix am Aussenrand ab minViewport (Geometrie-Konstante).
// Position:fixed = vollstaendig aus dem Fluss → das zentrierte Content-Band wird
// nie verschoben. Darunter per Media-Query ausgeblendet UND ModuleSlot laedt
// wegen minViewport gar nicht erst. Nicht in der Editor-Suite.
const RAIL_MIN = PLACEMENTS.rail_left.minViewport ?? 1680;
const RAIL_WIDTH = 160;

export default function RailModules() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/autor/") && pathname !== "/autor") return null;
  if (pathname.startsWith("/vorschau/")) return null;

  return (
    <div className="rail-wrap">
      <style>{`
        .rail-wrap { display: none; }
        @media (min-width: ${RAIL_MIN}px) {
          .rail-wrap { display: block; }
          .rail-col {
            position: fixed;
            top: calc(var(--nav-h, 64px) + 32px);
            width: ${RAIL_WIDTH}px;
            z-index: 5;
          }
          .rail-col--left { left: 24px; }
          .rail-col--right { right: 24px; }
        }
      `}</style>
      <div className="rail-col rail-col--left">
        <ModuleSlot code="rail_left" />
      </div>
      <div className="rail-col rail-col--right">
        <ModuleSlot code="rail_right" />
      </div>
    </div>
  );
}

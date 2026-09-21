"use client";

import { usePathname } from "next/navigation";
import ModuleSlot from "./ModuleSlot";

// Zwei vertikale Rails, fix am Aussenrand ab 1680px. Position:fixed =
// vollstaendig aus dem Fluss → das zentrierte Content-Band wird nie
// verschoben. Unter 1680px per Media-Query ausgeblendet UND ModuleSlot
// laedt wegen minViewport gar nicht erst. Nicht in der Editor-Suite.
export default function RailModules() {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/autor/") && pathname !== "/autor") return null;

  return (
    <div className="rail-wrap" aria-hidden="false">
      <style>{`
        .rail-wrap { display: none; }
        @media (min-width: 1680px) {
          .rail-wrap { display: block; }
          .rail-col {
            position: fixed;
            top: calc(var(--nav-h, 64px) + 32px);
            width: 160px;
            z-index: 5;
          }
          .rail-col--left { left: 24px; }
          .rail-col--right { right: 24px; }
        }
      `}</style>
      <div className="rail-col rail-col--left">
        <ModuleSlot code="rail_left" scope="home" desktopHeight={600} mobileHeight={0} minViewport={1680} />
      </div>
      <div className="rail-col rail-col--right">
        <ModuleSlot code="rail_right" scope="home" desktopHeight={600} mobileHeight={0} minViewport={1680} />
      </div>
    </div>
  );
}

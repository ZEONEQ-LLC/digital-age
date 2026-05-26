"use client";

import { usePathname } from "next/navigation";

// Versteckt den NewsTicker auf /autor/-Subrouten (Editor-Suite). Pattern
// identisch zu Navbar (hidet sich ebenfalls auf /autor/-Pfaden). Der Gate
// muss Client sein (usePathname), die NewsTicker-Server-Component kommt
// als children durchgereicht.
export default function NewsTickerGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/autor/") && pathname !== "/autor") return null;
  return <>{children}</>;
}

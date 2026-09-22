"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Sub-Navigation der Werbung-Sektion (PageTitle-right-Slot). Aktiver Eintrag
// im Chip-Stil der Suite (vgl. .as-chip in AdminStartupsClient).
const ITEMS = [
  { href: "/autor/admin/werbung", label: "Kampagnen" },
  { href: "/autor/admin/werbung/kunden", label: "Kunden" },
];

export default function WerbungSubNav() {
  const pathname = usePathname() ?? "";
  const isKunden = pathname.startsWith("/autor/admin/werbung/kunden");
  return (
    <nav aria-label="Werbung" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <style>{`
        .wsn-chip {
          background: transparent; color: var(--da-muted-soft);
          border: 1px solid var(--da-border); padding: 6px 12px; border-radius: 999px;
          font-size: 12px; text-decoration: none; transition: border-color var(--t-fast), color var(--t-fast);
        }
        .wsn-chip:hover { color: var(--da-text); border-color: var(--da-muted); }
        .wsn-chip--active { background: var(--da-green); color: var(--da-dark); border-color: var(--da-green); font-weight: 600; }
      `}</style>
      {ITEMS.map((it) => {
        const active = it.label === "Kunden" ? isKunden : !isKunden;
        return (
          <Link key={it.href} href={it.href} className={`wsn-chip${active ? " wsn-chip--active" : ""}`} aria-current={active ? "page" : undefined}>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

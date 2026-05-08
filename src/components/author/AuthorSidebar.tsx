"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Author } from "@/types/author";

type NavItem = { id: string; label: string; href: string; icon: string };

const items: NavItem[] = [
  { id: "dashboard",    label: "Dashboard",     href: "/autor/dashboard",     icon: "◆" },
  { id: "articles",     label: "Meine Artikel", href: "/autor/artikel",       icon: "▤" },
  { id: "stats",        label: "Statistiken",   href: "/autor/statistiken",   icon: "▴" },
  { id: "profile",      label: "Profil",        href: "/autor/profil",        icon: "◉" },
];

type AuthorSidebarProps = {
  author: Author;
};

export default function AuthorSidebar({ author }: AuthorSidebarProps) {
  const path = usePathname() ?? "";

  const isActive = (href: string): boolean => {
    if (href === "/autor/artikel") {
      return path === href || path.startsWith("/autor/artikel/");
    }
    return path === href;
  };

  return (
    <>
      <style>{`
        .a-sb {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: var(--sidebar-w);
          background: var(--da-darker);
          border-right: 1px solid var(--da-border);
          padding: 24px 16px;
          display: flex; flex-direction: column;
          z-index: 30;
        }
        .a-sb__brand { display: flex; align-items: center; gap: 9px; padding: 0 8px; margin-bottom: 32px; }
        .a-sb__brand-mark {
          width: 26px; height: 26px; background: var(--da-green); border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          color: var(--da-dark); font-weight: 700; font-size: 13px;
          font-family: var(--da-font-display);
        }
        .a-sb__brand-name {
          color: var(--da-text); font-size: 14px; font-weight: 700;
          font-family: var(--da-font-display); letter-spacing: -0.01em;
        }
        .a-sb__brand-tag {
          color: var(--da-green); font-size: 9px; font-family: var(--da-font-mono);
          font-weight: 700; letter-spacing: 0.1em; margin-left: auto;
          border: 1px solid var(--da-green); padding: 1px 5px; border-radius: 3px;
        }
        .a-sb__chip { display: flex; align-items: center; gap: 10px; padding: 10px 8px; margin-bottom: 22px; }
        .a-sb__chip-name { color: var(--da-text); font-size: 12px; font-weight: 600; }
        .a-sb__chip-role { color: var(--da-faint); font-size: 10px; }
        .a-sb__nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
        .a-sb__nav-item {
          display: flex; align-items: center; gap: 12px;
          background: transparent; color: var(--da-muted-soft);
          border: none; border-left: 2px solid transparent;
          border-radius: 4px;
          padding: 10px 12px; font-size: 13px; font-weight: 500;
          cursor: pointer; text-align: left; text-decoration: none;
          transition: color var(--t-fast), background var(--t-fast);
          font-family: inherit;
        }
        .a-sb__nav-item:hover { color: var(--da-text); }
        .a-sb__nav-item--active {
          background: rgba(50,255,126,0.08);
          color: var(--da-green);
          border-left-color: var(--da-green);
          font-weight: 600;
        }
        .a-sb__nav-icon { font-size: 12px; opacity: 0.7; }
        .a-sb__nav-item--active .a-sb__nav-icon { opacity: 1; }
        .a-sb__foot {
          border-top: 1px solid var(--da-border);
          padding-top: 14px;
          display: flex; flex-direction: column; gap: 2px;
        }
        .a-sb__foot-item {
          display: flex; align-items: center; gap: 10px;
          background: transparent; color: var(--da-muted-soft);
          border: none; padding: 8px 12px; font-size: 12px;
          cursor: pointer; text-align: left; text-decoration: none;
          font-family: inherit;
        }
        .a-sb__foot-item:hover { color: var(--da-text); }
        @media (max-width: 1024px) {
          .a-sb { display: none; }
        }
      `}</style>
      <nav className="a-sb">
        <Link href="/" className="a-sb__brand">
          <span className="a-sb__brand-mark">d</span>
          <span className="a-sb__brand-name">digital age</span>
          <span className="a-sb__brand-tag">AUTOR</span>
        </Link>

        <div className="a-sb__chip">
          <Image
            src={author.avatar}
            alt={author.name}
            width={32}
            height={32}
            style={{ borderRadius: "50%", objectFit: "cover" }}
            unoptimized
          />
          <div style={{ minWidth: 0 }}>
            <p className="a-sb__chip-name">{author.name}</p>
            {author.role && <p className="a-sb__chip-role">{author.role}</p>}
          </div>
        </div>

        <div className="a-sb__nav">
          {items.map((it) => {
            const sel = isActive(it.href);
            return (
              <Link
                key={it.id}
                href={it.href}
                className={`a-sb__nav-item${sel ? " a-sb__nav-item--active" : ""}`}
              >
                <span className="a-sb__nav-icon">{it.icon}</span>
                {it.label}
              </Link>
            );
          })}
        </div>

        <div className="a-sb__foot">
          <Link href="/" className="a-sb__foot-item">
            <span style={{ fontSize: 11 }}>↗</span> Zur Website
          </Link>
        </div>
      </nav>
    </>
  );
}

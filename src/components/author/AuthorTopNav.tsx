"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Author } from "@/types/author";

type NavItem = { id: string; label: string; href: string; icon: string };

const items: NavItem[] = [
  { id: "dashboard", label: "Dashboard",   href: "/autor/dashboard",   icon: "◆" },
  { id: "articles",  label: "Artikel",     href: "/autor/artikel",     icon: "▤" },
  { id: "stats",     label: "Stats",       href: "/autor/statistiken", icon: "▴" },
  { id: "podcasts",  label: "Podcasts",    href: "/autor/podcasts",    icon: "♫" },
  { id: "profile",   label: "Profil",      href: "/autor/profil",      icon: "◉" },
];

type AuthorTopNavProps = {
  author: Author;
};

export default function AuthorTopNav({ author }: AuthorTopNavProps) {
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
        .a-tn {
          background: var(--da-darker);
          border-bottom: 1px solid var(--da-border);
          padding: 0 var(--sp-5);
          position: sticky; top: 0; z-index: 30;
        }
        .a-tn__inner {
          display: flex; align-items: center; gap: var(--sp-6);
          max-width: var(--max-dash);
          margin: 0 auto;
          height: 56px;
        }
        .a-tn__brand { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .a-tn__brand-mark {
          width: 24px; height: 24px;
          background: var(--da-green); border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          color: var(--da-dark); font-weight: 700; font-size: 12px;
          font-family: var(--da-font-display);
        }
        .a-tn__brand-name {
          color: var(--da-text); font-size: 13px; font-weight: 700;
          font-family: var(--da-font-display);
        }
        .a-tn__brand-tag {
          color: var(--da-green); font-size: 9px;
          font-family: var(--da-font-mono);
          font-weight: 700; letter-spacing: 0.1em;
          border: 1px solid var(--da-green);
          padding: 1px 5px; border-radius: 3px;
        }
        .a-tn__nav {
          display: flex; gap: 4px; flex: 1;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .a-tn__nav::-webkit-scrollbar { display: none; }
        .a-tn__item {
          display: flex; align-items: center; gap: 6px;
          color: var(--da-muted-soft);
          padding: 18px 12px;
          font-size: 13px; font-weight: 500;
          text-decoration: none;
          border-bottom: 2px solid transparent;
          white-space: nowrap;
          transition: color var(--t-fast), border-color var(--t-fast);
        }
        .a-tn__item:hover { color: var(--da-text); }
        .a-tn__item--active {
          color: var(--da-green);
          border-bottom-color: var(--da-green);
          font-weight: 600;
        }
        .a-tn__icon { font-size: 11px; opacity: 0.7; }
        .a-tn__item--active .a-tn__icon { opacity: 1; }
        .a-tn__chip {
          display: flex; align-items: center; gap: 8px;
          flex-shrink: 0;
        }
        .a-tn__chip-name {
          color: var(--da-text); font-size: 12px; font-weight: 600;
        }
        @media (max-width: 600px) {
          .a-tn__chip-name { display: none; }
        }
      `}</style>
      <header className="a-tn">
        <div className="a-tn__inner">
          <Link href="/autor/dashboard" className="a-tn__brand">
            <span className="a-tn__brand-mark">d</span>
            <span className="a-tn__brand-name">digital age</span>
            <span className="a-tn__brand-tag">AUTOR</span>
          </Link>
          <nav className="a-tn__nav">
            {items.map((it) => {
              const sel = isActive(it.href);
              return (
                <Link
                  key={it.id}
                  href={it.href}
                  className={`a-tn__item${sel ? " a-tn__item--active" : ""}`}
                >
                  <span className="a-tn__icon">{it.icon}</span>
                  {it.label}
                </Link>
              );
            })}
          </nav>
          <div className="a-tn__chip">
            <Image
              src={author.avatar}
              alt={author.name}
              width={28}
              height={28}
              style={{ borderRadius: "50%", objectFit: "cover" }}
              unoptimized
            />
            <span className="a-tn__chip-name">{author.name}</span>
          </div>
        </div>
      </header>
    </>
  );
}

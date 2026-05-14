"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthorChip } from "@/types/authorVM";

type NavItem = { id: string; label: string; href: string; icon: string };

const items: NavItem[] = [
  { id: "dashboard", label: "Dashboard",   href: "/autor/dashboard",   icon: "◆" },
  { id: "articles",  label: "Artikel",     href: "/autor/artikel",     icon: "▤" },
  { id: "stats",     label: "Stats",       href: "/autor/statistiken", icon: "▴" },
  { id: "podcasts",  label: "Podcasts",    href: "/autor/podcasts",    icon: "♫" },
  { id: "prompts",   label: "Meine Prompts", href: "/autor/prompts",     icon: "❖" },
  { id: "profile",   label: "Profil",      href: "/autor/profil",      icon: "◉" },
];

const adminItems: NavItem[] = [
  { id: "admin-articles", label: "Alle Artikel", href: "/autor/admin/artikel",     icon: "▦" },
  { id: "admin-authors", label: "Autoren",     href: "/autor/admin/autoren",     icon: "◌" },
  { id: "admin-invites", label: "Einladungen", href: "/autor/admin/einladungen", icon: "✉" },
  { id: "admin-prompts",  label: "Prompts Admin",  href: "/autor/admin/prompts",  icon: "❖" },
  { id: "admin-startups", label: "Startups", href: "/autor/admin/startups", icon: "⊞" },
];

type AuthorTopNavProps = {
  author: AuthorChip;
};

export default function AuthorTopNav({ author }: AuthorTopNavProps) {
  const path = usePathname() ?? "";

  const isActive = (href: string): boolean => {
    if (href === "/autor/artikel") {
      return path === href || path.startsWith("/autor/artikel/");
    }
    if (href.startsWith("/autor/admin/")) {
      return path === href || path.startsWith(`${href}/`);
    }
    return path === href;
  };

  const isEditor = author.userRole === "editor";

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
        .a-tn__divider {
          width: 1px; height: 22px; background: var(--da-border);
          margin: 0 4px; align-self: center; flex-shrink: 0;
        }
        .a-tn__label-admin {
          color: var(--da-faint); font-family: var(--da-font-mono);
          font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0 4px; align-self: center; flex-shrink: 0;
        }
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
            {isEditor && (
              <>
                <span className="a-tn__divider" aria-hidden />
                <span className="a-tn__label-admin">Admin</span>
                {adminItems.map((it) => {
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
              </>
            )}
          </nav>
          <div className="a-tn__chip">
            {author.avatar ? (
              <Image
                src={author.avatar}
                alt={author.name}
                width={28}
                height={28}
                style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0 }}
                unoptimized
              />
            ) : (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--da-card)",
                  color: "var(--da-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {author.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="a-tn__chip-name">{author.name}</span>
          </div>
        </div>
      </header>
    </>
  );
}

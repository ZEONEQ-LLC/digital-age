"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthorChip } from "@/types/authorVM";

type NavItem = { id: string; label: string; href: string; icon: string };

const items: NavItem[] = [
  { id: "dashboard",    label: "Dashboard",     href: "/autor/dashboard",     icon: "◆" },
  { id: "articles",     label: "Meine Artikel", href: "/autor/artikel",       icon: "▤" },
  { id: "stats",        label: "Statistiken",   href: "/autor/statistiken",   icon: "▴" },
  { id: "podcasts",     label: "Podcasts",      href: "/autor/podcasts",      icon: "♫" },
  { id: "prompts",      label: "Meine Prompts", href: "/autor/prompts",       icon: "❖" },
  { id: "profile",      label: "Profil",        href: "/autor/profil",        icon: "◉" },
];

const adminItems: NavItem[] = [
  { id: "admin-articles", label: "Alle Artikel",   href: "/autor/admin/artikel",     icon: "▦" },
  { id: "admin-authors", label: "Autoren",      href: "/autor/admin/autoren",     icon: "◌" },
  { id: "admin-invites", label: "Einladungen",  href: "/autor/admin/einladungen", icon: "✉" },
  { id: "admin-prompts",  label: "Prompts Admin",  href: "/autor/admin/prompts",  icon: "❖" },
  { id: "admin-startups", label: "Startups", href: "/autor/admin/startups", icon: "⊞" },
  { id: "admin-tags",     label: "Tags",     href: "/autor/admin/tags",     icon: "#" },
  { id: "admin-newsletter", label: "Newsletter", href: "/autor/admin/newsletter", icon: "✉" },
  { id: "admin-nachrichten", label: "Nachrichten", href: "/autor/admin/nachrichten", icon: "✎" },
  { id: "admin-pitches", label: "Pitches", href: "/autor/admin/pitches", icon: "✦" },
];

type AuthorSidebarProps = {
  author: AuthorChip;
};

export default function AuthorSidebar({ author }: AuthorSidebarProps) {
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
        /* min-height: 0 ist entscheidend — flex children verweigern sonst
         * unter ihre Content-Size zu schrumpfen und der overflow-Scroll
         * triggert nie. Brand + Chip oben und .a-sb__foot unten bleiben
         * als flex-Geschwister gepinnt, nur die Nav-Liste scrollt. */
        .a-sb__nav {
          display: flex; flex-direction: column; gap: 2px;
          flex: 1 1 0;
          min-height: 0;
          overflow-y: auto;
          /* Scrollbar dezent — Brand-konform dark. */
          scrollbar-width: thin;
          scrollbar-color: var(--da-border) transparent;
        }
        .a-sb__nav::-webkit-scrollbar { width: 6px; }
        .a-sb__nav::-webkit-scrollbar-track { background: transparent; }
        .a-sb__nav::-webkit-scrollbar-thumb {
          background: var(--da-border);
          border-radius: 3px;
        }
        .a-sb__nav::-webkit-scrollbar-thumb:hover {
          background: var(--da-muted-soft);
        }
        .a-sb__section {
          margin-top: 18px; padding: 0 12px 6px;
          color: var(--da-faint); font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase;
          border-top: 1px solid var(--da-border); padding-top: 14px;
        }
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
          {author.avatar ? (
            <Image
              src={author.avatar}
              alt={author.name}
              width={32}
              height={32}
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0 }}
              unoptimized
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--da-card)",
                color: "var(--da-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
              }}
            >
              {author.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <p className="a-sb__chip-name">{author.name}</p>
            {author.jobTitle && <p className="a-sb__chip-role">{author.jobTitle}</p>}
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
          {isEditor && (
            <>
              <div className="a-sb__section">Admin</div>
              {adminItems.map((it) => {
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
            </>
          )}
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

"use client";
import { useEffect, useState } from "react";

export type TocItem = { id: string; label: string; level?: 2 | 3 };

type TableOfContentsProps = {
  items: TocItem[];
};

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        .toc { position: sticky; top: calc(var(--nav-h) + var(--sp-8)); padding-top: var(--sp-2); }
        .toc__label {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: var(--fs-caption);
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: var(--sp-4);
        }
        .toc__link {
          display: block;
          font-size: var(--fs-body-sm);
          color: var(--da-muted-soft);
          padding: 6px 0 6px 14px;
          border-left: 2px solid var(--da-card);
          line-height: 1.4;
          transition: color var(--t-fast), border-color var(--t-fast);
        }
        .toc__link:hover {
          color: var(--da-green);
          border-left-color: var(--da-green);
        }
        .toc__link--active {
          color: var(--da-green);
          border-left-color: var(--da-green);
          font-weight: 600;
        }
        .toc__link--h3 {
          padding-left: 28px;
          font-size: 12px;
          color: var(--da-muted);
        }
      `}</style>
      <nav className="toc" aria-label="Inhaltsverzeichnis">
        <p className="toc__label">Inhalt</p>
        {items.map(({ id, label, level }) => {
          const cls = [
            "toc__link",
            level === 3 ? "toc__link--h3" : "",
            active === id ? "toc__link--active" : "",
          ].filter(Boolean).join(" ");
          return (
            <a
              key={id}
              href={`#${id}`}
              className={cls}
              onClick={(e) => handleClick(e, id)}
            >
              {label}
            </a>
          );
        })}
      </nav>
    </>
  );
}

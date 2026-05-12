"use client";

import Link from "next/link";
import type { StartupCardVM } from "@/lib/mappers/startupMappers";

type CompanyRowProps = {
  company: StartupCardVM;
  accent?: string;
};

export default function CompanyRow({ company, accent = "var(--da-green)" }: CompanyRowProps) {
  const sc = company.swiss_status_color;
  return (
    <>
      <style>{`
        .crow {
          display: flex; align-items: center; gap: var(--sp-5);
          padding: 18px 0; border-bottom: 1px solid var(--da-border);
          transition: opacity var(--t-base);
          text-decoration: none;
        }
        .crow:hover { opacity: 0.78; }
        .crow__bar { width: 3px; align-self: stretch; background: var(--cc-hl); border-radius: 2px; flex-shrink: 0; }
        .crow__name { width: 180px; flex-shrink: 0; }
        .crow__name-text { color: var(--da-text); font-size: 15px; font-weight: 700; }
        .crow__name-sub {
          color: var(--da-muted); font-size: 12px; margin-top: 3px;
          font-family: var(--da-font-mono); white-space: nowrap;
        }
        .crow__tagline { flex: 1; color: var(--da-muted); font-size: 13px; line-height: 1.5; min-width: 0; }
        .crow__status {
          color: var(--cc-hl);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          white-space: nowrap; flex-shrink: 0;
        }
        .crow__industry {
          background: var(--da-dark); color: var(--accent);
          border: 1px solid var(--da-border);
          font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: var(--r-sm);
          white-space: nowrap; flex-shrink: 0;
        }
        .crow__emp {
          color: var(--da-muted); font-size: 12px;
          font-family: var(--da-font-mono); flex-shrink: 0;
        }
        @media (max-width: 900px) {
          .crow { flex-wrap: wrap; row-gap: var(--sp-2); }
          .crow__tagline { width: 100%; flex: 1 1 100%; order: 5; }
        }
      `}</style>
      <Link
        href={`/swiss-ai/${company.slug}`}
        className="crow"
        style={{ ["--cc-hl" as string]: sc, ["--accent" as string]: accent }}
      >
        <div className="crow__bar" />
        <div className="crow__name">
          <div className="crow__name-text">{company.name}</div>
          <div className="crow__name-sub">{company.city} · {company.founded_year}</div>
        </div>
        <div className="crow__tagline">{company.tagline}</div>
        <span className="crow__status">🇨🇭 {company.swiss_status_label}</span>
        <span className="crow__industry">{company.industry}</span>
        <span className="crow__emp">{company.employee_range_label}</span>
      </Link>
    </>
  );
}

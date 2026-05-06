"use client";

export type SwissStatus = "Swiss Based" | "Swiss Founded" | "Active in CH";

export type Company = {
  id: number;
  name: string;
  tagline: string;
  city: string;
  industry: string;
  status: SwissStatus;
  employees: string;
  featured: boolean;
  founded: number;
};

export const statusColor = (s: SwissStatus): string =>
  s === "Swiss Based" ? "var(--da-green)" : s === "Swiss Founded" ? "var(--da-orange)" : "var(--da-purple)";

type CompanyCardProps = {
  company: Company;
  accent?: string;
};

export default function CompanyCard({ company, accent = "var(--da-green)" }: CompanyCardProps) {
  const sc = statusColor(company.status);
  return (
    <>
      <style>{`
        .cc {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: var(--r-lg); padding: var(--sp-6); position: relative;
          transition: border-color var(--t-base), transform var(--t-base);
        }
        .cc:hover { border-color: var(--cc-hl, var(--da-green)); transform: translateY(-2px); }
        .cc__feat {
          position: absolute; top: 14px; right: 14px;
          background: var(--accent, var(--da-green)); color: var(--da-dark);
          font-family: var(--da-font-mono);
          font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 3px 8px; border-radius: var(--r-xs);
        }
        .cc__status { display: flex; align-items: center; gap: 6px; margin-bottom: var(--sp-4); }
        .cc__status-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; background: var(--cc-hl); }
        .cc__status-text {
          color: var(--cc-hl);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
        }
        .cc__name {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: 19px; font-weight: 700; margin-bottom: 8px;
        }
        .cc__tagline {
          color: var(--da-muted); font-size: 13px; line-height: 1.55;
          margin-bottom: var(--sp-5); min-height: 40px;
        }
        .cc__meta { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
        .cc__chip {
          background: var(--da-dark); border: 1px solid var(--da-border);
          font-size: 11px; padding: 4px 10px; border-radius: var(--r-sm);
        }
        .cc__chip--city { color: var(--da-text-strong); font-weight: 500; }
        .cc__chip--industry { color: var(--accent); font-weight: 600; }
        .cc__chip--emp { color: var(--da-muted); font-family: var(--da-font-mono); }
      `}</style>
      <div className="cc" style={{ ["--cc-hl" as string]: sc, ["--accent" as string]: accent }}>
        {company.featured && <span className="cc__feat">Featured</span>}
        <div className="cc__status">
          <span className="cc__status-dot" />
          <span className="cc__status-text">🇨🇭 {company.status}</span>
        </div>
        <h3 className="cc__name">{company.name}</h3>
        <p className="cc__tagline">{company.tagline}</p>
        <div className="cc__meta">
          <span className="cc__chip cc__chip--city">📍 {company.city}</span>
          <span className="cc__chip cc__chip--industry">{company.industry}</span>
          <span className="cc__chip cc__chip--emp">{company.employees} MA</span>
        </div>
      </div>
    </>
  );
}

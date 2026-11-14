"use client";

import Image from "next/image";
import Link from "next/link";
import type { StartupCardVM } from "@/lib/mappers/startupMappers";
import { AFFILIATION_LABEL, INVESTOR_LABEL } from "@/lib/startupTrust";

type CompanyCardProps = {
  company: StartupCardVM;
  accent?: string;
};

export default function CompanyCard({ company, accent = "var(--da-green)" }: CompanyCardProps) {
  const sc = company.swiss_status_color;
  // «Offen für Investoren» (.cc__inv) steht als zweite Zeile neben dem Logo
  // statt als Badge oben rechts: Der längere Begriff überlappte dort auf dem
  // Handy den Status (S1). Neutral statt orange, weil «Swiss Founded» selbst
  // orange ist. Bewusst kein Kommentar im <style>: Der stuende pro Karte im
  // HTML.
  return (
    <>
      <style>{`
        .cc {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: var(--r-lg); padding: var(--sp-6); position: relative;
          transition: border-color var(--t-base), transform var(--t-base);
          text-decoration: none; display: block;
        }
        .cc:hover { border-color: var(--cc-hl, var(--da-green)); transform: translateY(-2px); }
        .cc__badges {
          position: absolute; top: 14px; right: 14px;
          display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;
        }
        .cc__badge {
          font-family: var(--da-font-mono);
          font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 3px 8px; border-radius: var(--r-xs);
        }
        .cc__badge--feat { background: var(--accent, var(--da-green)); color: var(--da-dark); }
        .cc__inv {
          color: var(--da-text-strong); font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 5px;
        }
        .cc__head { display: flex; align-items: center; gap: 12px; margin-bottom: var(--sp-4); }
        .cc__logo {
          width: 36px; height: 36px; border-radius: 6px;
          background: var(--da-dark); border: 1px solid var(--da-border);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; color: var(--da-muted); font-size: 14px; flex-shrink: 0;
          overflow: hidden;
        }
        .cc__logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cc__status { display: flex; align-items: center; gap: 6px; }
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
        /* Offenlegung (S1): ruhig, aber immer sichtbar. */
        .cc__aff { color: var(--da-text-strong); font-size: 12px; margin: calc(-1 * var(--sp-2)) 0 var(--sp-4); padding-left: 9px; border-left: 2px solid var(--da-orange); }
        .cc__meta { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
        .cc__chip {
          background: var(--da-dark); border: 1px solid var(--da-border);
          font-size: 11px; padding: 4px 10px; border-radius: var(--r-sm);
        }
        .cc__chip--city { color: var(--da-text-strong); font-weight: 500; }
        .cc__chip--industry { color: var(--accent); font-weight: 600; }
        .cc__chip--emp { color: var(--da-muted); font-family: var(--da-font-mono); }
      `}</style>
      <Link
        href={`/swiss-ai/${company.slug}`}
        className="cc"
        style={{ ["--cc-hl" as string]: sc, ["--accent" as string]: accent }}
      >
        <div className="cc__badges">
          {company.is_featured && <span className="cc__badge cc__badge--feat">Spotlight</span>}
        </div>
        <div className="cc__head">
          <div className="cc__logo" aria-hidden>
            {company.logo_url ? (
              <Image src={company.logo_url} alt="" width={36} height={36} unoptimized />
            ) : (
              company.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="cc__status">
              <span className="cc__status-dot" />
              <span className="cc__status-text">🇨🇭 {company.swiss_status_label}</span>
            </div>
            {company.is_open_to_investment && <div className="cc__inv">{INVESTOR_LABEL}</div>}
          </div>
        </div>
        <h3 className="cc__name">{company.name}</h3>
        <p className="cc__tagline">{company.tagline}</p>
        {company.affiliation_note && <p className="cc__aff" title={company.affiliation_note}>{AFFILIATION_LABEL}</p>}
        <div className="cc__meta">
          <span className="cc__chip cc__chip--city">📍 {company.city}</span>
          <span className="cc__chip cc__chip--industry">{company.industry}</span>
          <span className="cc__chip cc__chip--emp">{company.employee_range_label} MA</span>
        </div>
      </Link>
    </>
  );
}

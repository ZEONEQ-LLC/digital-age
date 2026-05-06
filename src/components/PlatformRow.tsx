"use client";

import { catColors, hostingColor, hostingLabel, type Platform } from "./PlatformCard";

type PlatformRowProps = {
  platform: Platform;
  inCompare: boolean;
  onToggleCompare: (id: number) => void;
  accent?: string;
};

export default function PlatformRow({ platform, inCompare, onToggleCompare, accent = "var(--da-green)" }: PlatformRowProps) {
  const cc = catColors[platform.category] ?? accent;
  const hc = hostingColor(platform.hosting);

  return (
    <>
      <style>{`
        .prow {
          display: flex; align-items: center; gap: var(--sp-5);
          padding: 16px 0;
          border-bottom: 1px solid var(--da-border);
          transition: opacity var(--t-base);
        }
        .prow:hover { opacity: 0.8; }
        .prow__logo {
          width: 40px; height: 40px; border-radius: var(--r-lg);
          background: var(--da-dark); border: 1px solid var(--da-border);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .prow__logo span { color: var(--cc); font-size: 14px; font-weight: 700; font-family: var(--da-font-display); }
        .prow__name { width: 140px; flex-shrink: 0; }
        .prow__name-text { color: var(--da-text); font-size: 15px; font-weight: 700; }
        .prow__cat {
          color: var(--cc);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          margin-top: 2px;
        }
        .prow__tagline { flex: 1; color: var(--da-muted); font-size: 13px; line-height: 1.5; min-width: 0; }
        .prow__host { color: var(--hc); font-size: 11px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
        .prow__price {
          color: var(--da-muted); font-size: 12px;
          font-family: var(--da-font-mono); white-space: nowrap; flex-shrink: 0;
        }
        .prow__actions { display: flex; gap: var(--sp-2); flex-shrink: 0; }
        .prow__open {
          background: var(--accent); color: var(--da-dark);
          font-size: 12px; font-weight: 700; padding: 7px 16px;
          border-radius: var(--r-sm); text-decoration: none; white-space: nowrap;
        }
        .prow__cmp {
          background: var(--da-dark);
          color: var(--da-faint);
          border: 1px solid var(--da-border);
          border-radius: var(--r-sm); padding: 7px 10px;
          font-size: 11px; cursor: pointer; white-space: nowrap;
          transition: all var(--t-fast);
        }
        .prow__cmp--on {
          background: rgba(50,255,126,0.13);
          color: var(--accent); border-color: var(--accent);
        }
        @media (max-width: 900px) {
          .prow { flex-wrap: wrap; row-gap: var(--sp-2); }
          .prow__tagline { width: 100%; flex: 1 1 100%; order: 5; }
        }
      `}</style>
      <div
        className="prow"
        style={{ ["--cc" as string]: cc, ["--hc" as string]: hc, ["--accent" as string]: accent }}
      >
        <div className="prow__logo"><span>{platform.name[0]}</span></div>
        <div className="prow__name">
          <div className="prow__name-text">{platform.name}</div>
          <div className="prow__cat">{platform.category}</div>
        </div>
        <div className="prow__tagline">{platform.tagline}</div>
        <span className="prow__host">{hostingLabel(platform.hosting)}</span>
        <span className="prow__price">{platform.pricing}</span>
        <div className="prow__actions">
          <a className="prow__open" href={platform.link} target="_blank" rel="noopener noreferrer">Öffnen →</a>
          <button
            type="button"
            className={`prow__cmp${inCompare ? " prow__cmp--on" : ""}`}
            onClick={() => onToggleCompare(platform.id)}
          >
            {inCompare ? "✓" : "+"}
          </button>
        </div>
      </div>
    </>
  );
}

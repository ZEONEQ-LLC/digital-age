"use client";

import { useEffect } from "react";
import { catColors, hostingColor, hostingLabel, type Platform } from "./PlatformCard";

type CompareModalProps = {
  ids: number[];
  platforms: Platform[];
  onClose: () => void;
};

const ROWS: Array<{ key: string; label: string; render: (p: Platform) => React.ReactNode }> = [
  { key: "category", label: "Kategorie", render: (p) => <span style={{ color: catColors[p.category] ?? "var(--da-green)", fontWeight: 700 }}>{p.category}</span> },
  { key: "hosting",  label: "Hosting",   render: (p) => <span style={{ color: hostingColor(p.hosting), fontWeight: 700 }}>{hostingLabel(p.hosting)}</span> },
  { key: "pricing",  label: "Preismodell", render: (p) => <span style={{ fontFamily: "var(--da-font-mono)", fontSize: 13 }}>{p.pricing}</span> },
  { key: "tagline",  label: "Beschreibung", render: (p) => <span style={{ color: "var(--da-muted)", fontSize: 13, lineHeight: 1.5 }}>{p.tagline}</span> },
  { key: "link",     label: "Ausprobieren", render: (p) => <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ color: "var(--da-green)", fontWeight: 700, fontSize: 13 }}>Öffnen →</a> },
];

const MAX = 3;

export default function CompareModal({ ids, platforms, onClose }: CompareModalProps) {
  const selected = platforms.filter((p) => ids.includes(p.id));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const empties = MAX - selected.length;

  return (
    <>
      <style>{`
        .cmod-overlay {
          position: fixed; inset: 0; z-index: 400;
          background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: var(--sp-8);
        }
        .cmod {
          background: var(--da-footer);
          border: 1px solid var(--da-border);
          border-radius: 12px;
          width: 100%; max-width: 900px; max-height: 90vh;
          overflow: auto; position: relative;
        }
        .cmod__header {
          padding: var(--sp-6) var(--sp-8);
          border-bottom: 1px solid var(--da-border);
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; background: var(--da-footer); z-index: 10;
        }
        .cmod__title-row { display: flex; align-items: center; gap: var(--sp-3); }
        .cmod__bar { width: 3px; height: 22px; background: var(--da-green); border-radius: 2px; }
        .cmod__title { color: var(--da-text); font-size: 18px; font-weight: 700; font-family: var(--da-font-display); }
        .cmod__count {
          color: var(--da-muted); font-size: 13px;
          font-family: var(--da-font-mono);
        }
        .cmod__close {
          background: none; border: 1px solid var(--da-border); color: var(--da-muted);
          width: 32px; height: 32px; border-radius: var(--r-md); cursor: pointer; font-size: 16px;
          display: flex; align-items: center; justify-content: center;
        }
        .cmod__table { width: 100%; border-collapse: collapse; }
        .cmod__th-merkmal {
          width: 140px; padding: 20px var(--sp-6); text-align: left;
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          border-bottom: 1px solid var(--da-border);
        }
        .cmod__th-platform {
          padding: 20px var(--sp-6); text-align: left;
          border-bottom: 1px solid var(--da-border);
          border-left: 1px solid var(--da-border);
          min-width: 220px;
        }
        .cmod__th-empty {
          padding: 20px var(--sp-6);
          border-bottom: 1px solid var(--da-border);
          border-left: 1px solid var(--da-border);
          color: #333; font-size: 13px; font-style: italic; min-width: 220px;
        }
        .cmod__head-block { display: flex; align-items: center; gap: 10px; }
        .cmod__head-logo {
          width: 36px; height: 36px; border-radius: var(--r-lg);
          background: var(--da-dark); border: 1px solid var(--da-border);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .cmod__head-name { color: var(--da-text); font-size: 16px; font-weight: 700; }
        .cmod__head-pick {
          color: var(--da-green); font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
        }
        .cmod__row--alt { background: rgba(42,42,46,0.3); }
        .cmod__td-label {
          padding: 16px var(--sp-6);
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;
          vertical-align: top;
        }
        .cmod__td-cell {
          padding: 16px var(--sp-6);
          border-left: 1px solid var(--da-border);
          vertical-align: top;
        }
        .cmod__footer {
          padding: 20px var(--sp-8); border-top: 1px solid var(--da-border);
          display: flex; justify-content: flex-end;
        }
        .cmod__close-btn {
          background: var(--da-green); color: var(--da-dark);
          border: none; padding: 11px 28px; border-radius: var(--r-sm);
          font-size: 14px; font-weight: 700; cursor: pointer;
        }
      `}</style>
      <div className="cmod-overlay" role="dialog" aria-modal="true" aria-label="Plattform-Vergleich"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="cmod">
          <div className="cmod__header">
            <div className="cmod__title-row">
              <div className="cmod__bar" />
              <h2 className="cmod__title">Plattform-Vergleich</h2>
              <span className="cmod__count">{selected.length} {selected.length === 1 ? "Plattform" : "Plattformen"}</span>
            </div>
            <button type="button" className="cmod__close" onClick={onClose} aria-label="Schliessen">×</button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="cmod__table">
              <thead>
                <tr>
                  <th className="cmod__th-merkmal">Merkmal</th>
                  {selected.map((p) => (
                    <th key={p.id} className="cmod__th-platform">
                      <div className="cmod__head-block">
                        <div className="cmod__head-logo">
                          <span style={{ color: catColors[p.category] ?? "var(--da-green)", fontSize: 14, fontWeight: 700, fontFamily: "var(--da-font-display)" }}>{p.name[0]}</span>
                        </div>
                        <div>
                          <div className="cmod__head-name">{p.name}</div>
                          {p.featured && <span className="cmod__head-pick">Top Pick</span>}
                        </div>
                      </div>
                    </th>
                  ))}
                  {Array.from({ length: empties }).map((_, i) => (
                    <th key={`empty-h-${i}`} className="cmod__th-empty">+ Plattform hinzufügen</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(({ key, label, render }, ri) => (
                  <tr key={key} className={ri % 2 === 1 ? "cmod__row--alt" : undefined}>
                    <td className="cmod__td-label">{label}</td>
                    {selected.map((p) => (
                      <td key={p.id} className="cmod__td-cell">{render(p)}</td>
                    ))}
                    {Array.from({ length: empties }).map((_, i) => (
                      <td key={`empty-c-${i}`} className="cmod__td-cell" />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cmod__footer">
            <button type="button" className="cmod__close-btn" onClick={onClose}>Schliessen</button>
          </div>
        </div>
      </div>
    </>
  );
}

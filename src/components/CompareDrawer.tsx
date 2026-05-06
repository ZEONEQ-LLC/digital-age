"use client";

import type { Platform } from "./PlatformCard";

type CompareDrawerProps = {
  ids: number[];
  platforms: Platform[];
  onRemove: (id: number) => void;
  onClear: () => void;
  onOpen: () => void;
};

const MAX = 3;

export default function CompareDrawer({ ids, platforms, onRemove, onClear, onOpen }: CompareDrawerProps) {
  if (ids.length === 0) return null;
  const selected = platforms.filter((p) => ids.includes(p.id));

  return (
    <>
      <style>{`
        .cdraw {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 300;
          background: var(--da-footer);
          border-top: 2px solid var(--da-green);
          padding: 16px var(--sp-8);
          display: flex; align-items: center; gap: var(--sp-5); flex-wrap: wrap;
        }
        .cdraw__label {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          white-space: nowrap;
        }
        .cdraw__items { display: flex; gap: 10px; flex: 1; flex-wrap: wrap; }
        .cdraw__chip {
          display: flex; align-items: center; gap: var(--sp-2);
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: var(--r-md); padding: 6px var(--sp-3);
        }
        .cdraw__chip-name { color: var(--da-text); font-size: 13px; font-weight: 600; }
        .cdraw__chip-rm {
          background: none; border: none; color: var(--da-faint);
          cursor: pointer; font-size: 14px; line-height: 1; padding: 0;
        }
        .cdraw__open {
          background: var(--da-green); color: var(--da-dark);
          border: none; padding: 6px 20px; border-radius: var(--r-md);
          font-size: 12px; font-weight: 700; cursor: pointer;
        }
        .cdraw__clear {
          background: none; border: none; color: var(--da-muted);
          font-size: 13px; cursor: pointer;
        }
      `}</style>
      <div className="cdraw" role="region" aria-label="Plattform-Vergleich">
        <span className="cdraw__label">Vergleich ({ids.length}/{MAX})</span>
        <div className="cdraw__items">
          {selected.map((p) => (
            <div key={p.id} className="cdraw__chip">
              <span className="cdraw__chip-name">{p.name}</span>
              <button type="button" className="cdraw__chip-rm" aria-label={`${p.name} entfernen`} onClick={() => onRemove(p.id)}>×</button>
            </div>
          ))}
          {ids.length >= 2 && (
            <button type="button" className="cdraw__open" onClick={onOpen}>Jetzt vergleichen →</button>
          )}
        </div>
        <button type="button" className="cdraw__clear" onClick={onClear}>Leeren</button>
      </div>
    </>
  );
}

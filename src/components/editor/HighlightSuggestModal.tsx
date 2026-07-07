"use client";

import { useEffect, useMemo, useState } from "react";
import type { HighlightSuggestion } from "@/lib/ai/highlightPrompts";
import { truncateQuote } from "@/lib/ai/seoReview";

type Props = {
  open: boolean;
  suggestions: HighlightSuggestion[];
  // Ist das Zitat im aktuellen Editor-Text auffindbar? (bodyEditorRef.hasText)
  isFindable: (quote: string) => boolean;
  onApply: (quotes: string[]) => void;
  onClose: () => void;
};

// Modal fuer die AI-Highlight-Vorschlaege. ALLE auffindbaren Eintraege sind
// vorausgewaehlt; nicht gefundene (Text seit der Analyse geaendert) sind als
// solche markiert und die Checkbox deaktiviert. "Anwenden" gibt die gewaehlten
// Zitate zurueck — der Editor setzt Bold + Green-Highlight.
export default function HighlightSuggestModal({
  open,
  suggestions,
  isFindable,
  onApply,
  onClose,
}: Props) {
  const findable = useMemo(
    () => suggestions.map((s) => isFindable(s.quote)),
    [suggestions, isFindable],
  );

  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Beim Oeffnen / neuen Vorschlaegen: alle auffindbaren vorauswaehlen.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    const init = new Set<number>();
    suggestions.forEach((_, i) => {
      if (findable[i]) init.add(i);
    });
    setSelected(init);
  }, [open, suggestions, findable]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) return null;

  function toggle(i: number) {
    if (!findable[i]) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function handleApply() {
    const quotes = Array.from(selected)
      .sort((a, b) => a - b)
      .map((i) => suggestions[i].quote);
    onApply(quotes);
  }

  const selectedCount = selected.size;

  return (
    <>
      <style>{`
        .hl-backdrop {
          position: fixed; inset: 0; z-index: 120;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 72px 24px 24px;
        }
        .hl-card {
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: 8px; width: 100%; max-width: 620px;
          display: flex; flex-direction: column; max-height: 78vh;
          overflow: hidden; font-family: var(--da-font-body);
        }
        .hl-header { padding: 16px 18px; border-bottom: 1px solid var(--da-border); }
        .hl-title { color: var(--da-text); font-size: 16px; font-weight: 700; margin: 0; }
        .hl-sub { color: var(--da-muted); font-size: 12px; margin: 4px 0 0; line-height: 1.5; }
        .hl-body { padding: 12px 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .hl-item {
          display: flex; gap: 10px; align-items: flex-start;
          border: 1px solid var(--da-border); border-radius: 6px; padding: 10px 12px;
        }
        .hl-item--disabled { opacity: 0.5; }
        .hl-quote { color: var(--da-text); font-size: 13px; line-height: 1.5; margin: 0; }
        .hl-reason { color: var(--da-muted-soft); font-size: 11px; margin: 4px 0 0; line-height: 1.45; }
        .hl-missing {
          color: var(--da-orange, #ff9f0a); font-size: 10px; font-family: var(--da-font-mono);
          font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 4px;
          display: inline-block;
        }
        .hl-footer {
          padding: 14px 18px; border-top: 1px solid var(--da-border);
          display: flex; justify-content: flex-end; gap: 10px; align-items: center;
        }
        .hl-btn-primary {
          background: var(--da-green); color: var(--da-dark); border: none;
          padding: 9px 16px; border-radius: 4px; font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: inherit;
        }
        .hl-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .hl-btn-ghost {
          background: transparent; color: var(--da-muted-soft); border: 1px solid var(--da-border);
          padding: 9px 16px; border-radius: 4px; font-size: 13px; cursor: pointer; font-family: inherit;
        }
      `}</style>
      <div
        className="hl-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="hl-card" role="dialog" aria-modal="true">
          <div className="hl-header">
            <p className="hl-title">Kernaussagen markieren</p>
            <p className="hl-sub">
              Vorschläge der AI (wörtliche Zitate). Gewählte Stellen werden im
              Body <strong>fett + grün hervorgehoben</strong>. Rückgängig mit
              ⌘/Strg&nbsp;+&nbsp;Z.
            </p>
          </div>

          <div className="hl-body">
            {suggestions.length === 0 ? (
              <p style={{ color: "var(--da-muted)", fontSize: 13, margin: 0 }}>
                Keine Vorschläge erhalten.
              </p>
            ) : (
              suggestions.map((s, i) => {
                const isFound = findable[i];
                return (
                  <label
                    key={i}
                    className={`hl-item${isFound ? "" : " hl-item--disabled"}`}
                    style={{ cursor: isFound ? "pointer" : "default" }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      disabled={!isFound}
                      onChange={() => toggle(i)}
                      style={{ marginTop: 2, flex: "0 0 auto" }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <p className="hl-quote">„{truncateQuote(s.quote, 160)}“</p>
                      {s.reason.trim() !== "" && (
                        <p className="hl-reason">{s.reason}</p>
                      )}
                      {!isFound && (
                        <span className="hl-missing">
                          nicht gefunden — Text evtl. geändert
                        </span>
                      )}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <div className="hl-footer">
            <button type="button" className="hl-btn-ghost" onClick={onClose}>
              Abbrechen
            </button>
            <button
              type="button"
              className="hl-btn-primary"
              onClick={handleApply}
              disabled={selectedCount === 0}
            >
              Anwenden ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

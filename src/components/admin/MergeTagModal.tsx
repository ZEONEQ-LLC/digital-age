"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { searchTags, type TagSearchResult } from "@/lib/tagSearchActions";
import { mergeTag } from "@/lib/admin/tagOperations";

type Props = {
  fromTag: { id: string; name: string; slug: string; articleCount: number };
  onClose: () => void;
  onDone: (info: { affectedCount: number; toName: string }) => void;
};

export default function MergeTagModal({ fromTag, onClose, onDone }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TagSearchResult[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [target, setTarget] = useState<TagSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  useEffect(() => {
    if (target) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await searchTags(q, { limit: 8, exclude: [fromTag.name] });
      setSuggestions(results);
      setHighlight(0);
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fromTag.name, target]);

  function pickTarget(t: TagSearchResult) {
    setTarget(t);
    setQuery("");
    setSuggestions([]);
  }

  function clearTarget() {
    setTarget(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length > 0)
        setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[highlight]) pickTarget(suggestions[highlight]);
    }
  }

  function submit() {
    if (!target) {
      setError("Bitte einen Ziel-Tag wählen.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await mergeTag(fromTag.id, target.id);
        onDone({ affectedCount: result.affectedCount, toName: target.name });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <>
      <style>{`
        .tagmod-backdrop {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .tagmod-card {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 8px;
          padding: 28px;
          max-width: 520px;
          width: 100%;
          font-family: var(--da-font-body);
          position: relative;
        }
        .tagmod-title {
          color: var(--da-text);
          font-size: 18px;
          font-weight: 700;
          font-family: var(--da-font-display);
          margin-bottom: 6px;
        }
        .tagmod-sub {
          color: var(--da-muted);
          font-size: 13px;
          margin-bottom: 18px;
          line-height: 1.5;
        }
        .tagmod-label {
          display: block;
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .tagmod-picker-wrap {
          position: relative;
          margin-bottom: 16px;
        }
        .tagmod-input {
          width: 100%;
          background: var(--da-dark);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: inherit;
        }
        .tagmod-input:focus { outline: none; border-color: var(--da-green); }
        .tagmod-target-chip {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--da-dark);
          border: 1px solid var(--da-green);
          border-radius: 999px;
          padding: 8px 14px 8px 16px;
          color: var(--da-text);
          font-size: 14px;
        }
        .tagmod-target-chip__x {
          background: transparent; border: none; cursor: pointer;
          color: var(--da-muted-soft);
          font-size: 14px;
          padding: 0 4px;
        }
        .tagmod-target-chip__x:hover { color: var(--da-text); }
        .tagmod-suggestions {
          position: absolute; left: 0; right: 0; top: 100%;
          margin-top: 4px;
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 4px;
          z-index: 30;
          max-height: 240px; overflow-y: auto;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        .tagmod-sugg {
          display: block; width: 100%;
          background: transparent; color: var(--da-text);
          border: none; padding: 8px 12px;
          font-size: 13px; cursor: pointer; text-align: left;
          border-radius: 3px;
          font-family: inherit;
        }
        .tagmod-sugg:hover, .tagmod-sugg--hl {
          background: var(--da-dark);
        }
        .tagmod-confirm-box {
          background: rgba(255,140,66,0.10);
          border: 1px solid var(--da-orange);
          border-radius: 4px;
          padding: 12px 14px;
          color: var(--da-text);
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 18px;
        }
        .tagmod-confirm-box strong { color: var(--da-text); }
        .tagmod-error {
          background: rgba(255,107,107,0.10);
          border: 1px solid #ff6b6b;
          border-radius: 4px;
          padding: 10px 14px;
          color: #ff8e8e;
          font-size: 13px;
          margin-bottom: 18px;
        }
        .tagmod-actions {
          display: flex; gap: 10px; justify-content: flex-end;
        }
        .tagmod-btn {
          padding: 9px 18px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          border: none;
        }
        .tagmod-btn--ghost {
          background: transparent;
          color: var(--da-muted-soft);
          border: 1px solid var(--da-border);
        }
        .tagmod-btn--ghost:hover { color: var(--da-text); }
        .tagmod-btn--primary {
          background: var(--da-orange);
          color: var(--da-dark);
        }
        .tagmod-btn--primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
      <div
        className="tagmod-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget && !pending) onClose();
        }}
      >
        <div className="tagmod-card" role="dialog" aria-modal="true">
          <h2 className="tagmod-title">Tag mergen</h2>
          <p className="tagmod-sub">
            <strong>{fromTag.name}</strong> wird in einen anderen Tag gemergt
            und anschliessend gelöscht. Alle {fromTag.articleCount} Artikel-
            Junctions werden umgehängt.
          </p>

          <span className="tagmod-label">Ziel-Tag</span>
          <div className="tagmod-picker-wrap">
            {target ? (
              <div className="tagmod-target-chip">
                <span>{target.name}</span>
                <button
                  type="button"
                  className="tagmod-target-chip__x"
                  onClick={clearTarget}
                  aria-label="Auswahl entfernen"
                  disabled={pending}
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  className="tagmod-input"
                  placeholder="Tag suchen…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  autoFocus
                  disabled={pending}
                />
                {suggestions.length > 0 && (
                  <div className="tagmod-suggestions">
                    {suggestions.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`tagmod-sugg${i === highlight ? " tagmod-sugg--hl" : ""}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pickTarget(s);
                        }}
                        onMouseEnter={() => setHighlight(i)}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {target && (
            <div className="tagmod-confirm-box">
              <strong>{fromTag.articleCount}</strong> Artikel-Junctions werden
              umgehängt. Tag <strong>{fromTag.name}</strong> wird anschliessend
              gelöscht.
            </div>
          )}

          {error && <div className="tagmod-error">{error}</div>}

          <div className="tagmod-actions">
            <button
              type="button"
              className="tagmod-btn tagmod-btn--ghost"
              onClick={onClose}
              disabled={pending}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="tagmod-btn tagmod-btn--primary"
              onClick={submit}
              disabled={pending || !target}
            >
              {pending ? "Merge läuft…" : "Mergen"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

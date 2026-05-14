"use client";

import { useEffect, useRef, useState } from "react";
import { searchTags, type TagSearchResult } from "@/lib/tagSearchActions";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

// Autocomplete-Tag-Input mit Pills. Bestehende Tags kommen aus der
// `tags`-Tabelle, neue Tags werden beim Save in saveArticle angelegt.
// Externe API: nur Tag-Namen (string[]) — die UI kennt keine IDs.
export default function TagInput({ value, onChange, placeholder = "Tag hinzufügen…" }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TagSearchResult[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await searchTags(q, { limit: 8, exclude: value });
      setSuggestions(results);
      setHighlight(0);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, value]);

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (value.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setQuery("");
      return;
    }
    onChange([...value, trimmed]);
    setQuery("");
    setSuggestions([]);
  }

  function removeTag(name: string) {
    onChange(value.filter((t) => t !== name));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions[highlight]) {
        addTag(suggestions[highlight].name);
      } else if (query.trim()) {
        addTag(query);
      }
    } else if (e.key === "Tab" && query.trim()) {
      // Tab fügt den aktuellen Query als neuen Tag hinzu, falls Text drin
      if (open && suggestions.length > 0) {
        e.preventDefault();
        addTag(suggestions[highlight]?.name ?? query);
      }
    } else if (e.key === "Backspace" && query === "" && value.length > 0) {
      e.preventDefault();
      removeTag(value[value.length - 1]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length > 0) setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === ",") {
      e.preventDefault();
      if (query.trim()) addTag(query);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <style>{`
        .tag-input-wrap {
          display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
          background: var(--da-dark);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 8px 10px;
          min-height: 38px;
          cursor: text;
        }
        .tag-input-wrap:focus-within { border-color: var(--da-green); }
        .tag-input-pill {
          display: inline-flex; align-items: center; gap: 4px;
          background: var(--da-card);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 999px;
          padding: 2px 4px 2px 10px;
          font-size: 12px;
          line-height: 1.5;
        }
        .tag-input-pill-x {
          width: 16px; height: 16px;
          display: inline-flex; align-items: center; justify-content: center;
          background: transparent;
          color: var(--da-muted-soft);
          border: none;
          cursor: pointer;
          border-radius: 50%;
          font-size: 12px;
          padding: 0;
          font-family: inherit;
        }
        .tag-input-pill-x:hover { color: var(--da-text); background: var(--da-dark); }
        .tag-input-field {
          flex: 1; min-width: 80px;
          background: transparent; color: var(--da-text);
          border: none; outline: none;
          font-size: 13px; font-family: inherit;
        }
        .tag-input-suggestions {
          position: absolute; left: 0; right: 0; top: 100%;
          margin-top: 4px;
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 4px;
          z-index: 20;
          max-height: 220px; overflow-y: auto;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        .tag-input-sugg {
          display: block; width: 100%;
          background: transparent; color: var(--da-text);
          border: none; padding: 7px 10px;
          font-size: 13px; cursor: pointer; text-align: left;
          border-radius: 3px;
          font-family: inherit;
        }
        .tag-input-sugg:hover, .tag-input-sugg--hl { background: var(--da-dark); }
        .tag-input-sugg--new {
          color: var(--da-green);
          border-top: 1px solid var(--da-border);
          margin-top: 4px; padding-top: 9px;
        }
      `}</style>
      <div className="tag-input-wrap" onClick={() => inputRef.current?.focus()}>
        {value.map((tag) => (
          <span key={tag} className="tag-input-pill">
            {tag}
            <button
              type="button"
              className="tag-input-pill-x"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              aria-label={`${tag} entfernen`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="tag-input-field"
          type="text"
          value={query}
          placeholder={value.length === 0 ? placeholder : ""}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
        />
      </div>
      {open && (suggestions.length > 0 || query.trim().length >= 1) && (
        <div className="tag-input-suggestions">
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`tag-input-sugg${i === highlight ? " tag-input-sugg--hl" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s.name);
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              {s.name}
            </button>
          ))}
          {query.trim().length >= 1 &&
            !suggestions.some((s) => s.name.toLowerCase() === query.trim().toLowerCase()) && (
              <button
                type="button"
                className="tag-input-sugg tag-input-sugg--new"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(query);
                }}
              >
                + Neuer Tag „{query.trim()}"
              </button>
            )}
        </div>
      )}
    </div>
  );
}

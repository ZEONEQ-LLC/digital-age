"use client";

import { useState } from "react";

// Mini-Pill-Input für Sekundär-Keywords im SEO-Tab.
//
// Bewusst KEIN Reuse von TagInput, weil:
// - kein DB-Lookup / Autocomplete gegen die tags-Tabelle
// - keine kanonische Tag-Liste, keine Slug-Konvertierung
// - rein Plain-Text-Pills pro Artikel, gespeichert in
//   articles.seo_keywords_secondary[]
//
// Verhalten:
// - Enter ODER Komma fügen den getippten Begriff als Pill hinzu
// - Backspace bei leerem Input entfernt letzte Pill
// - Duplikate (case-insensitive) werden ignoriert
// - x-Button entfernt einzelne Pill

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

export default function KeywordPillInput({
  value,
  onChange,
  placeholder = "Begriff eingeben, Enter zum Hinzufügen…",
}: Props) {
  const [draft, setDraft] = useState("");

  function addPill(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === "") return;
    const key = trimmed.toLowerCase();
    if (value.some((v) => v.toLowerCase() === key)) {
      setDraft("");
      return;
    }
    onChange([...value, trimmed]);
    setDraft("");
  }

  function removePill(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <>
      <style>{`
        .kpi-wrap {
          display: flex; flex-wrap: wrap; gap: 6px;
          padding: 8px 10px;
          background: var(--da-dark);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          min-height: 38px;
          align-items: center;
        }
        .kpi-wrap:focus-within { border-color: var(--da-green); }
        .kpi-pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(50, 255, 126, 0.10);
          border: 1px solid rgba(50, 255, 126, 0.35);
          color: var(--da-text-strong);
          padding: 3px 6px 3px 9px;
          border-radius: 3px;
          font-size: 12px;
          font-family: var(--da-font-mono);
        }
        .kpi-pill-x {
          background: none; border: none;
          color: var(--da-muted);
          font-size: 14px; line-height: 1;
          cursor: pointer;
          padding: 0 4px;
          font-family: inherit;
        }
        .kpi-pill-x:hover { color: var(--da-orange); }
        .kpi-input {
          flex: 1;
          min-width: 120px;
          background: transparent;
          color: var(--da-text);
          border: none;
          outline: none;
          font-size: 13px;
          font-family: inherit;
        }
        .kpi-input::placeholder { color: var(--da-muted-soft); }
      `}</style>
      <div className="kpi-wrap">
        {value.map((pill, i) => (
          <span key={`${pill}-${i}`} className="kpi-pill">
            {pill}
            <button
              type="button"
              className="kpi-pill-x"
              aria-label={`${pill} entfernen`}
              onClick={() => removePill(i)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="kpi-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addPill(draft);
            } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
              e.preventDefault();
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (draft.trim() !== "") addPill(draft);
          }}
          placeholder={value.length === 0 ? placeholder : ""}
        />
      </div>
    </>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  searchPublishedArticles,
  type ArticleSearchResult,
} from "@/lib/articleSearchActions";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (result: ArticleSearchResult) => void;
  excludeId?: string;
  title?: string;
};

// Debounced Autocomplete-Modal für interne Artikel-Verweise. Shared zwischen
// Inline-Link (FloatingToolbar) und InternalArticleCard-Block.
export default function InternalArticleAutocomplete({
  open,
  onClose,
  onPick,
  excludeId,
  title = "Verwandten Artikel auswählen",
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArticleSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchPublishedArticles(query, { excludeId });
        setResults(r);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, excludeId]);

  if (!open) return null;

  return (
    <>
      <style>{`
        .iac-backdrop {
          position: fixed; inset: 0; z-index: 110;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 80px 24px 24px;
        }
        .iac-card {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 8px;
          width: 100%;
          max-width: 560px;
          font-family: var(--da-font-body);
          display: flex; flex-direction: column;
          max-height: 70vh;
          overflow: hidden;
        }
        .iac-header {
          padding: 16px 18px;
          border-bottom: 1px solid var(--da-border);
        }
        .iac-title {
          color: var(--da-faint); font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; margin-bottom: 8px;
        }
        .iac-input {
          width: 100%;
          background: var(--da-darker);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          padding: 9px 12px;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
          outline: none;
        }
        .iac-input:focus { border-color: var(--da-green); }
        .iac-results {
          padding: 8px;
          overflow-y: auto;
          flex: 1;
        }
        .iac-result {
          display: flex; gap: 12px;
          width: 100%;
          padding: 10px;
          border-radius: 4px;
          cursor: pointer;
          background: transparent;
          color: var(--da-text);
          border: none;
          text-align: left;
          font-family: inherit;
          align-items: center;
        }
        .iac-result:hover { background: var(--da-dark); }
        .iac-cover {
          flex: 0 0 60px;
          width: 60px; height: 40px;
          background: var(--da-darker);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        .iac-meta { color: var(--da-faint); font-size: 11px; margin-top: 2px; font-family: var(--da-font-mono); }
        .iac-empty {
          padding: 18px;
          color: var(--da-muted);
          font-size: 13px;
          text-align: center;
        }
      `}</style>
      <div
        className="iac-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="iac-card" role="dialog" aria-modal="true">
          <div className="iac-header">
            <div className="iac-title">{title}</div>
            <input
              ref={inputRef}
              className="iac-input"
              type="text"
              placeholder="Titel eingeben (min. 2 Zeichen)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
              }}
            />
          </div>
          <div className="iac-results">
            {loading && <div className="iac-empty">Suche…</div>}
            {!loading && query.trim().length < 2 && (
              <div className="iac-empty">Mindestens 2 Zeichen eingeben.</div>
            )}
            {!loading && query.trim().length >= 2 && results.length === 0 && (
              <div className="iac-empty">Keine passenden Artikel gefunden.</div>
            )}
            {!loading &&
              results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="iac-result"
                  onClick={() => {
                    onPick(r);
                    onClose();
                  }}
                >
                  <div className="iac-cover">
                    {r.cover_image_url && (
                      <Image
                        src={r.cover_image_url}
                        alt=""
                        fill
                        sizes="60px"
                        style={{ objectFit: "cover" }}
                        unoptimized
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--da-text)" }}>
                      {r.title}
                    </div>
                    {r.category_slug && (
                      <div className="iac-meta">/{r.category_slug}</div>
                    )}
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}

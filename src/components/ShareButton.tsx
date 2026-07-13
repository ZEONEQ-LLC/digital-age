"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Teilt die kanonische Detailseite (NICHT die Audio-Datei-URL). Web Share
// API auf Mobile (navigator.share), sonst Clipboard-Copy mit Toast. Dazu ein
// dedizierter LinkedIn-Share-Link (Hauptkanal).
//
// Feature-Detection via useSyncExternalStore -> SSR-sicher, kein setState
// im Effect.
const emptySubscribe = () => () => {};
function useHasWebShare(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

type Props = {
  url: string;
  title: string;
  text?: string;
};

export default function ShareButton({ url, title, text }: Props) {
  const hasWebShare = useHasWebShare();
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 2500);
  }

  async function handleShare() {
    if (hasWebShare) {
      try {
        await navigator.share({ title, text: text ?? title, url });
        return;
      } catch {
        // Abbruch durch User oder Fehler -> Fallback auf Clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link kopiert");
    } catch {
      showToast("Kopieren nicht möglich");
    }
  }

  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  return (
    <div className="shb">
      <style>{`
        .shb { display: inline-flex; align-items: center; gap: 8px; position: relative; }
        .shb__btn {
          display: inline-flex; align-items: center; gap: 6px;
          height: 40px; padding: 0 14px;
          border-radius: var(--r-pill);
          background: transparent;
          color: var(--da-text-strong);
          border: 1px solid var(--da-border);
          font-size: var(--fs-meta); font-weight: 600;
          font-family: var(--da-font-body);
          cursor: pointer; text-decoration: none;
          transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast);
        }
        .shb__btn:hover { background: var(--da-green); color: var(--da-dark); border-color: var(--da-green); }
        .shb__toast {
          position: absolute; top: calc(100% + 8px); left: 0;
          background: var(--da-dark); color: var(--da-green);
          border: 1px solid var(--da-green);
          padding: 6px 12px; border-radius: var(--r-xs);
          font-size: 12px; font-weight: 600; white-space: nowrap;
          z-index: 10;
        }
      `}</style>

      <button
        type="button"
        className="shb__btn"
        onClick={handleShare}
        aria-label="Podcast teilen"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Teilen
      </button>

      <a
        className="shb__btn"
        href={linkedinHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Auf LinkedIn teilen"
      >
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        LinkedIn
      </a>

      {toast && <span className="shb__toast" role="status">{toast}</span>}
    </div>
  );
}

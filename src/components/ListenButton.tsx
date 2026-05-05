"use client";
import { useState, useRef } from "react";

export default function ListenButton({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const handlePlay = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 1;
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
    setPlaying(true);
  };

  return (
    <>
      <style>{`
        .listen-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 40px;
          padding: 0 14px;
          border-radius: var(--r-pill);
          font-family: var(--da-font-body);
          font-size: var(--fs-meta);
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          background: transparent;
          color: var(--da-green);
          border: 1px solid var(--da-border);
          transition: background-color var(--t-base), color var(--t-base), border-color var(--t-base);
        }
        .listen-btn:hover {
          background: var(--da-green);
          color: var(--da-dark);
          border-color: var(--da-green);
        }
        .listen-btn--playing {
          background: var(--da-green);
          color: var(--da-dark);
          border-color: var(--da-green);
        }
      `}</style>
      <button
        type="button"
        onClick={handlePlay}
        className={`listen-btn${playing ? " listen-btn--playing" : ""}`}
        aria-label={playing ? "Artikel stoppen" : "Artikel anhören"}
      >
        {playing ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
            Stoppen
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            Anhören
          </>
        )}
      </button>
    </>
  );
}

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
    <button
      onClick={handlePlay}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: playing ? "var(--da-green)" : "transparent",
        color: playing ? "var(--da-dark)" : "var(--da-green)",
        border: "2px solid var(--da-green)",
        borderRadius: "4px",
        padding: "8px 16px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "background-color 0.2s, color 0.2s",
      }}
      aria-label={playing ? "Artikel stoppen" : "Artikel anhören"}
    >
      {playing ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
          Stoppen
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          Artikel anhören
        </>
      )}
    </button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDuration } from "@/lib/podcast/format";
import AiGeneratedBadge from "./AiGeneratedBadge";

// Schlanke einzeilige Podcast-Leiste fuer die Artikelseite: Play/Pause,
// Episodentitel (Link zur Detailseite), Dauer, dezentes KI-Badge. Kein
// Seekbar/Speed (das lebt auf der Detailseite). Owns ein natives <audio>.
// playEventName: der Artikel-ANHOEREN-Button feuert dieses Window-Event ->
// Wiedergabe startet.
type Props = {
  src: string;
  title: string;
  slug: string;
  durationSeconds?: number | null;
  aiGenerated?: boolean;
  playEventName?: string;
};

export default function ArticlePodcastBar({
  src,
  title,
  slug,
  durationSeconds,
  aiGenerated,
  playEventName,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(durationSeconds ?? 0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => setPlaying(false);
    const onMeta = () => {
      if (Number.isFinite(a.duration)) setDuration(a.duration);
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  useEffect(() => {
    if (!playEventName) return;
    const onExternalPlay = () => {
      void audioRef.current?.play();
    };
    window.addEventListener(playEventName, onExternalPlay);
    return () => window.removeEventListener(playEventName, onExternalPlay);
  }, [playEventName]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  }

  return (
    <div className="apb">
      <style>{`
        .apb {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px;
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: var(--r-md);
        }
        .apb__play {
          flex-shrink: 0;
          width: 36px; height: 36px; border-radius: 50%;
          border: none; background: var(--da-green); color: var(--da-dark);
          cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
          transition: transform var(--t-fast);
        }
        .apb__play:hover { transform: scale(1.06); }
        .apb__main {
          flex: 1; min-width: 0;
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }
        .apb__title {
          color: var(--da-text); font-weight: 600; font-size: var(--fs-body-sm);
          text-decoration: none; min-width: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .apb__title:hover { color: var(--da-green); }
        .apb__dur {
          color: var(--da-muted); font-family: var(--da-font-mono); font-size: 12px;
          flex-shrink: 0;
        }
      `}</style>

      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        className="apb__play"
        onClick={toggle}
        aria-label={playing ? `${title} pausieren` : `${title} abspielen`}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" />
            <rect x="14" y="5" width="4" height="14" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="apb__main">
        <Link href={`/podcast/${slug}`} className="apb__title">{title}</Link>
        <span className="apb__dur">{formatDuration(duration)}</span>
        {aiGenerated && <AiGeneratedBadge />}
      </div>
    </div>
  );
}

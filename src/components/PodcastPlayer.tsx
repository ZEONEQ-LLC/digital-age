"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/podcast/format";

// Custom-Audio-Player auf Basis des nativen <audio>-Elements. Kein iFrame,
// keine Third-Party-Requests (Datenschutz-Vorteil ggue. SoundCloud-Embed).
// preload="metadata" spart Bandbreite (laedt nur Dauer, kein Audio).
//
// initialDuration = duration_seconds aus der DB, damit die Gesamtzeit sofort
// steht (bevor Metadata geladen ist); wird von echten Metadata ueberschrieben.
type Props = {
  src: string;
  title: string;
  initialDuration?: number | null;
  compact?: boolean;
  // Optionaler Window-Event-Name: feuert das Event -> Player startet. Genutzt
  // vom Artikel-ANHOEREN-Button, um den verknuepften Podcast abzuspielen.
  playEventName?: string;
};

const SPEEDS = [1, 1.25, 1.5] as const;

export default function PodcastPlayer({
  src,
  title,
  initialDuration,
  compact = false,
  playEventName,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(initialDuration ?? 0);
  const [speedIdx, setSpeedIdx] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => {
      if (Number.isFinite(a.duration)) setDuration(a.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, []);

  // Externer Play-Trigger (Artikel-ANHOEREN-Button) via Window-Event.
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

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const a = audioRef.current;
    if (!a) return;
    const t = Number(e.target.value);
    a.currentTime = t;
    setCurrent(t);
  }

  function cycleSpeed() {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    const a = audioRef.current;
    if (a) a.playbackRate = SPEEDS[next];
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className={`ppl${compact ? " ppl--compact" : ""}`}>
      <style>{`
        .ppl {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px;
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: var(--r-md);
        }
        .ppl--compact { padding: 10px 12px; gap: 10px; }
        .ppl__play {
          flex-shrink: 0;
          width: 44px; height: 44px;
          border-radius: 50%;
          border: none;
          background: var(--da-green);
          color: var(--da-dark);
          cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          transition: transform var(--t-fast);
        }
        .ppl--compact .ppl__play { width: 36px; height: 36px; }
        .ppl__play:hover { transform: scale(1.06); }
        .ppl__main { flex: 1; min-width: 0; }
        .ppl__bar {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 6px; border-radius: 3px;
          background: linear-gradient(
            to right,
            var(--da-green) 0%, var(--da-green) var(--pct),
            var(--da-border) var(--pct), var(--da-border) 100%
          );
          cursor: pointer; outline: none;
        }
        .ppl__bar::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px; border-radius: 50%;
          background: var(--da-green); border: 2px solid var(--da-dark);
          cursor: pointer;
        }
        .ppl__bar::-moz-range-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: var(--da-green); border: 2px solid var(--da-dark);
          cursor: pointer;
        }
        .ppl__meta {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 6px;
          font-family: var(--da-font-mono);
          font-size: 11px; color: var(--da-muted);
        }
        .ppl__speed {
          flex-shrink: 0;
          background: transparent;
          border: 1px solid var(--da-border);
          color: var(--da-text-strong);
          border-radius: var(--r-xs);
          padding: 5px 8px;
          font-size: 11px; font-weight: 700;
          font-family: var(--da-font-mono);
          cursor: pointer; line-height: 1;
        }
        .ppl__speed:hover { border-color: var(--da-green); color: var(--da-green); }
      `}</style>

      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        className="ppl__play"
        onClick={toggle}
        aria-label={playing ? `${title} pausieren` : `${title} abspielen`}
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" />
            <rect x="14" y="5" width="4" height="14" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="ppl__main">
        <input
          type="range"
          className="ppl__bar"
          min={0}
          max={duration || 0}
          step={1}
          value={Math.min(current, duration || 0)}
          onChange={seek}
          style={{ ["--pct" as string]: `${pct}%` }}
          aria-label="Wiedergabeposition"
        />
        <div className="ppl__meta">
          <span>{formatDuration(current)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      <button
        type="button"
        className="ppl__speed"
        onClick={cycleSpeed}
        aria-label={`Wiedergabegeschwindigkeit ${SPEEDS[speedIdx]}-fach, klicken zum Ändern`}
      >
        {SPEEDS[speedIdx]}×
      </button>
    </div>
  );
}

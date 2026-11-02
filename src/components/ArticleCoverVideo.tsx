"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

// Hero-Animation auf der Beitragsseite (Hero Studio, Teil 1). Liegt als
// dekorative Bewegungsebene ueber dem statischen <Image priority>; das Bild
// bleibt LCP, Poster und Fallback. Das MP4 beginnt mit genau dem Frame des
// Hero-Bilds, deshalb ist die Ueberblendung nahtlos.
//
// Verhalten:
//   - SSR ohne autoPlay, Deckkraft 0 (Server-Snapshot = "reduziert"). Nach
//     dem Mount: bei prefers-reduced-motion nichts (Bild bleibt, kein Knopf;
//     Umschalten zur Laufzeit pausiert sofort). Sonst
//     muted als Property setzen (React reflektiert das Attribut nicht
//     zuverlaessig, Safari blockiert play() sonst), play(), bei `playing`
//     einblenden. Abgelehntes play()-Promise still abfangen.
//   - Pause-Knopf (WCAG 2.2.2): Endlos-Bewegung muss anhaltbar sein.
//     Angehalten bleibt der aktuelle Frame stehen.
//   - Ausserhalb des Viewports und bei verstecktem Tab pausieren, danach
//     weiter, ausser der Leser hat selbst angehalten.
//   - Keine Controls, kein Ton, kein Bild-im-Bild. aria-hidden: das ALT
//     traegt das Bild darunter; cover_video_alt wird hier nicht gerendert.
type Props = {
  src: string;
  poster: string;
};

// prefers-reduced-motion als externer Store: Server-Snapshot "reduziert"
// (nichts abspielen, kein Knopf), Client folgt der Media Query live.
const REDUCED_MQ = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void): () => void {
  const mq = window.matchMedia(REDUCED_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function getReduced(): boolean {
  return window.matchMedia(REDUCED_MQ).matches;
}
function getReducedServer(): boolean {
  return true;
}

export default function ArticleCoverVideo({ src, poster }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const userPausedRef = useRef(false);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, getReducedServer);
  const enabled = !reduced;
  const [visible, setVisible] = useState(false); // nach erstem `playing`
  const [paused, setPaused] = useState(false);
  const labelId = useId();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!enabled) {
      v.pause();
      return;
    }

    v.muted = true;
    v.defaultMuted = true;
    const onPlaying = () => setVisible(true);
    v.addEventListener("playing", onPlaying);

    const tryPlay = () => {
      if (userPausedRef.current) return;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => { /* Autoplay abgelehnt: Bild bleibt. */ });
    };
    tryPlay();

    // Nur spielen, solange sichtbar und Tab aktiv.
    let inView = true;
    const io = typeof IntersectionObserver === "function"
      ? new IntersectionObserver((entries) => {
          inView = entries[0]?.isIntersecting ?? true;
          if (!inView) v.pause();
          else if (!document.hidden) tryPlay();
        }, { threshold: 0.1 })
      : null;
    io?.observe(v);
    const onVisibility = () => {
      if (document.hidden) v.pause();
      else if (inView) tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      v.removeEventListener("playing", onPlaying);
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      v.pause();
    };
  }, [enabled]);

  function toggle() {
    const v = videoRef.current;
    if (!v) return;
    if (paused) {
      userPausedRef.current = false;
      setPaused(false);
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      userPausedRef.current = true;
      setPaused(true);
      v.pause();
    }
  }

  return (
    <>
      <style>{`
        .acv__video {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 300ms ease;
          pointer-events: none;
        }
        .acv__video--visible { opacity: 1; }
        .acv__btn {
          position: absolute; right: 12px; bottom: 12px;
          width: 36px; height: 36px; border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.35);
          background: rgba(28,28,30,0.72);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; padding: 0;
          backdrop-filter: blur(4px);
          transition: background 150ms ease;
        }
        .acv__btn:hover { background: rgba(28,28,30,0.92); }
        .acv__btn:focus-visible { outline: 2px solid var(--da-green, #32ff7e); outline-offset: 2px; }
        .acv__btn svg { width: 14px; height: 14px; fill: currentColor; display: block; }
      `}</style>
      <video
        ref={videoRef}
        className={`acv__video${visible && enabled ? " acv__video--visible" : ""}`}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
        aria-hidden="true"
        tabIndex={-1}
      />
      {enabled && visible && (
        <button
          type="button"
          className="acv__btn"
          onClick={toggle}
          aria-label={paused ? "Animation abspielen" : "Animation anhalten"}
          aria-describedby={labelId}
          aria-pressed={paused}
        >
          {paused ? (
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" /></svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" /></svg>
          )}
          <span id={labelId} hidden>Hero-Animation</span>
        </button>
      )}
    </>
  );
}

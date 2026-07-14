"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Feature-Detection ueber useSyncExternalStore: liefert server-seitig `true`
// (Button wird optimistisch als verfuegbar gerendert), client-seitig den
// echten Wert. React versoehnt die Differenz nach der Hydration ohne
// Mismatch-Warnung — und ohne setState-in-Effect (Lint-Regel).
const emptySubscribe = () => () => {};
function useSpeechSupported(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => true,
  );
}

// Liest den ganzen Artikel vor (Titel -> Abstract -> Body) via Web Speech
// API. Die vorlesbaren Chunks werden server-seitig gebaut (buildSpeechChunks)
// und als Prop uebergeben — dieser Client-Component-Teil steuert nur die
// Wiedergabe: sequenzielle utterances (eine pro Chunk), Pause/Fortsetzen,
// Stopp, Fortschritt und das zwingende cancel() bei Unmount (Navigation).
//
// Bewusst KEIN visibilitychange-Handler: Hintergrund-Weiterhoeren ist ok,
// nur echte Navigation (Unmount) stoppt.

type PlayState = "idle" | "playing" | "paused";

export default function ListenButton({
  chunks,
  lang,
  podcastTargetId,
  podcastPlayEvent,
}: {
  chunks: string[];
  lang: string;
  // Podcast-Modus: wenn gesetzt, startet der Button NICHT die TTS-Vorlesung,
  // sondern scrollt zur Podcast-Box (podcastTargetId) und feuert das
  // Play-Event (podcastPlayEvent). Fuer Artikel mit verknuepftem self-hosted
  // Podcast — die menschliche Audio-Version ist der bessere "Anhoeren"-Weg.
  podcastTargetId?: string;
  podcastPlayEvent?: string;
}) {
  const supported = useSpeechSupported();
  const [state, setState] = useState<PlayState>("idle");
  // 0-basiert waehrend der Wiedergabe; fuer die Anzeige +1.
  const [index, setIndex] = useState(0);

  // Laufindex + Stop-Flag als Refs, damit onend-Callbacks (die eine alte
  // Closure sehen) korrekt weiterzaehlen bzw. nach Stopp nicht mehr feuern.
  const indexRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    // Cleanup bei Unmount (= Navigation): laufende Wiedergabe hart stoppen.
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        stoppedRef.current = true;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const total = chunks.length;

  function speakFrom(start: number) {
    if (start >= total) {
      // Ende erreicht -> Reset auf idle.
      setState("idle");
      setIndex(0);
      indexRef.current = 0;
      return;
    }
    indexRef.current = start;
    setIndex(start);
    const u = new SpeechSynthesisUtterance(chunks[start]);
    u.lang = lang;
    u.rate = 1;
    u.onend = () => {
      if (stoppedRef.current) return;
      speakFrom(indexRef.current + 1);
    };
    u.onerror = () => {
      if (stoppedRef.current) return;
      // Bei Fehler (z.B. interrupted) nicht endlos weiterspringen — sauber
      // stoppen, damit der User neu starten kann.
      stopPlayback();
    };
    window.speechSynthesis.speak(u);
  }

  function stopPlayback() {
    stoppedRef.current = true;
    window.speechSynthesis.cancel();
    setState("idle");
    setIndex(0);
    indexRef.current = 0;
  }

  function handlePrimary() {
    if (!supported || total === 0) return;
    if (state === "idle") {
      stoppedRef.current = false;
      setState("playing");
      speakFrom(0);
    } else if (state === "playing") {
      window.speechSynthesis.pause();
      setState("paused");
    } else if (state === "paused") {
      window.speechSynthesis.resume();
      setState("playing");
    }
  }

  // Podcast-Modus: identischer Look, aber scrollt zur Box + startet den
  // verknuepften Podcast statt der TTS-Vorlesung.
  if (podcastTargetId) {
    const handlePodcast = () => {
      document
        .getElementById(podcastTargetId)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (podcastPlayEvent) {
        window.dispatchEvent(new CustomEvent(podcastPlayEvent));
      }
    };
    return (
      <>
        <ListenStyles />
        <button
          type="button"
          onClick={handlePodcast}
          className="listen-btn"
          aria-label="Podcast zum Beitrag anhören"
        >
          <PlayIcon />
          Anhören
        </button>
      </>
    );
  }

  if (!supported) {
    return (
      <>
        <ListenStyles />
        <button
          type="button"
          className="listen-btn"
          disabled
          aria-label="Vorlesen wird von diesem Browser nicht unterstützt"
          title="Vorlesen wird von diesem Browser nicht unterstützt"
        >
          <PlayIcon />
          Anhören
        </button>
      </>
    );
  }

  const primaryLabel =
    state === "idle"
      ? "Anhören"
      : state === "playing"
        ? "Pausieren"
        : "Fortsetzen";
  const primaryAria =
    state === "idle"
      ? "Artikel anhören"
      : state === "playing"
        ? "Vorlesen pausieren"
        : "Vorlesen fortsetzen";

  return (
    <>
      <ListenStyles />
      <span className="listen-group">
        <button
          type="button"
          onClick={handlePrimary}
          className={`listen-btn${state !== "idle" ? " listen-btn--active" : ""}`}
          aria-label={primaryAria}
        >
          {state === "playing" ? <PauseIcon /> : <PlayIcon />}
          {primaryLabel}
        </button>

        {state !== "idle" && (
          <>
            <button
              type="button"
              onClick={stopPlayback}
              className="listen-btn listen-btn--stop"
              aria-label="Vorlesen stoppen"
            >
              <StopIcon />
              Stopp
            </button>
            <span className="listen-progress" aria-live="polite">
              Absatz {Math.min(index + 1, total)}/{total}
            </span>
          </>
        )}
      </span>
    </>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" />
      <rect x="14" y="5" width="4" height="14" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" />
    </svg>
  );
}

function ListenStyles() {
  return (
    <style>{`
      .listen-group {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
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
      .listen-btn:hover:not(:disabled) {
        background: var(--da-green);
        color: var(--da-dark);
        border-color: var(--da-green);
      }
      .listen-btn--active {
        background: var(--da-green);
        color: var(--da-dark);
        border-color: var(--da-green);
      }
      .listen-btn--stop {
        color: var(--da-muted);
      }
      .listen-btn--stop:hover:not(:disabled) {
        background: var(--da-card);
        color: var(--da-text);
        border-color: var(--da-border);
      }
      .listen-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .listen-progress {
        font-family: var(--da-font-mono, var(--da-font-body));
        font-size: var(--fs-meta);
        font-weight: 600;
        letter-spacing: 0.04em;
        color: var(--da-muted);
        white-space: nowrap;
      }
    `}</style>
  );
}

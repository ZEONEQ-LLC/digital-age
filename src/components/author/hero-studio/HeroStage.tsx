"use client";

import { useId, type RefObject } from "react";
import type { HeroView, HeroViewId } from "@/lib/hero-studio/vendor";

type Props = {
  views: HeroView[];
  viewId: HeroViewId;
  onView: (v: HeroViewId) => void;
  playing: boolean;
  onTogglePlay: () => void;
  stageRef: RefObject<HTMLCanvasElement | null>;
  wrapRef: RefObject<HTMLDivElement | null>;
  scrubRef: RefObject<HTMLInputElement | null>;
  timeRef: RefObject<HTMLSpanElement | null>;
  onScrubDown: () => void;
  onScrubInput: (value: number) => void;
  onScrubChange: () => void;
  stageAlt: string;
  children: React.ReactNode;
};

// Buehne mit Formatwahl, Canvas und Transport. Zeit und Scrubber werden vom
// rAF-Loop der Wurzel direkt ins DOM geschrieben (refs), nicht ueber React-State.
export default function HeroStage({ views, viewId, onView, playing, onTogglePlay, stageRef, wrapRef, scrubRef, timeRef, onScrubDown, onScrubInput, onScrubChange, stageAlt, children }: Props) {
  const hId = useId();
  return (
    <section className="hs-step" aria-labelledby={hId} data-hs="detail">
      <div className="hs-step-head">
        <h2 id={hId}><span className="hs-step-no">2</span>Anpassen</h2>
        <div className="hs-segs" role="group" aria-label="Format der Vorschau">
          {views.map((v) => (
            <button key={v.id} type="button" className="hs-seg" aria-pressed={v.id === viewId} onClick={() => onView(v.id)}>
              <span>{v.label}</span><small>{v.sub}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="hs-detail">
        <div className="hs-stage">
          <div className="hs-stage-wrap" ref={wrapRef}>
            <canvas className="hs-stage-cv" ref={stageRef} role="img" aria-label={stageAlt} />
          </div>
          <div className="hs-transport">
            <button type="button" className="hs-icon-btn" aria-label={playing ? "Pause" : "Abspielen"} onClick={onTogglePlay}>
              <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
            </button>
            <input
              type="range" min={0} max={1000} defaultValue={0} ref={scrubRef} aria-label="Position in der Schleife"
              onPointerDown={onScrubDown}
              onInput={(e) => onScrubInput(Number((e.target as HTMLInputElement).value))}
              onChange={onScrubChange}
            />
            <span className="hs-time" ref={timeRef}>0.0 / 0.0 s</span>
          </div>
          <p className="hs-hint">Hero heisst: das Bild für die Website, ohne Logo und Headline, weil die Seite beides als Text zeigt. «Teilen», «Feed» und «Story» tragen Logo, Headline und Signatur.</p>
        </div>
        {children}
      </div>
    </section>
  );
}

"use client";

import { useId } from "react";
import type { HeroEngineId, HeroSpec } from "@/lib/hero-studio/vendor";

export type HeroFilter = "alle" | HeroEngineId;

export type ProposalCard = {
  spec: HeroSpec;
  title: string;
  why: string;
  alt: string;
};

type Props = {
  cards: ProposalCard[];
  selId: string | null;
  filter: HeroFilter;
  onFilter: (f: HeroFilter) => void;
  onChoose: (id: string) => void;
  onReroll: (id: string) => void;
  registerCanvas: (id: string, el: HTMLCanvasElement | null) => void;
  kiNote: { msg: string; tone?: "ok" | "warn" | "busy" } | null;
  kiButton: { label: string; onClick: () => void; disabled?: boolean } | null;
  memNote: string;
};

const FILTERS: [HeroFilter, string][] = [["alle", "Alle"], ["line", "Linie"], ["typo", "Typo"]];

export default function HeroProposals({ cards, selId, filter, onFilter, onChoose, onReroll, registerCanvas, kiNote, kiButton, memNote }: Props) {
  const hId = useId();
  return (
    <section className="hs-step" aria-labelledby={hId}>
      <div className="hs-step-head">
        <h2 id={hId}><span className="hs-step-no">1</span>Vorschläge</h2>
        <div className="hs-segs" role="group" aria-label="Technik filtern">
          {FILTERS.map(([f, label]) => (
            <button key={f} type="button" className="hs-seg" aria-pressed={filter === f} onClick={() => onFilter(f)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="hs-step-head">
        <p className="hs-note" data-tone={kiNote?.tone}>{kiNote?.msg ?? ""}</p>
        {kiButton && (
          <button type="button" className="hs-btn line small" onClick={kiButton.onClick} disabled={kiButton.disabled}>{kiButton.label}</button>
        )}
      </div>
      <div className="hs-cards">
        {cards.map(({ spec, title, why, alt }) => {
          const id = spec.id ?? "";
          const on = id === selId;
          return (
            <article key={id} className="hs-card" aria-current={on}>
              <button type="button" className="hs-card-pick" aria-label={`Vorschlag ${title} auswählen`} onClick={() => onChoose(id)}>
                <canvas className="hs-card-cv" role="img" aria-label={alt} ref={(el) => registerCanvas(id, el)} />
              </button>
              <div className="hs-card-meta">
                <div className="hs-card-tags">
                  <span className={`hs-tag hs-tag-${spec.engine}`}>{spec.engine === "line" ? "Linie" : "Typo"}</span>
                  {spec.source === "ki" && <span className="hs-tag hs-tag-ki">KI</span>}
                  {spec.source === "saved" && <span className="hs-tag hs-tag-saved">Am Beitrag</span>}
                </div>
                <h3 className="hs-card-title">{title}</h3>
                <p className="hs-card-why">{why}</p>
                <div className="hs-card-row">
                  <button type="button" className="hs-btn small use" aria-pressed={on} onClick={() => onChoose(id)}>
                    {on ? "✓ Gewählt, weiter mit Schritt 2" : "Variante übernehmen"}
                  </button>
                  <button type="button" className="hs-btn small ghost" onClick={() => onReroll(id)}>Andere Variante</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className="hs-hint">{memNote}</p>
    </section>
  );
}

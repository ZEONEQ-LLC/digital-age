"use client";

// Ablauf-Leiste: 1 Variante waehlen · 2 Anpassen · 3 Uebernehmen und herunterladen.
// step 1..3 = aktueller Schritt, 4 = uebernommen (Schritt 3 erledigt).

const STEPS = [
  { n: 1, title: "Variante wählen", sub: "Vorschläge aus dem Beitrag, auf Wunsch von der KI begründet." },
  { n: 2, title: "Anpassen", sub: "Motiv, Bewegung und Farben, Vorschau in allen Formaten." },
  { n: 3, title: "Übernehmen und herunterladen", sub: "Speichert das Hero am Beitrag. Danach Dateien für Website und Social Media, einzeln oder als ZIP." },
];

export default function HeroFlow({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="hs-flow" aria-label="Ablauf">
      {STEPS.map((s) => {
        const state = s.n < step ? "done" : s.n === step ? "now" : undefined;
        const current = s.n === step || (step === 4 && s.n === 3);
        return (
          <li key={s.n} data-state={state} aria-current={current ? "step" : undefined}>
            <span className="hs-flow-no">{s.n}</span>
            <span className="hs-flow-txt">
              <b>{s.title}</b>
              <small>{s.sub}</small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

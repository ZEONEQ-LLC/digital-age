"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

// Erklaerung der Einordnung (Ali 19.11.2026), seit PR 226 ausklappbar ueber
// der Meldungsliste statt am Ende (Entscheid Ali 22.11.2026): Nach bis zu 141
// Meldungen fand sie niemand. Natives <details>, standardmaessig zu. Gibt die
// Rubrik aus newsTicker/assessment.ts wieder; wer sie aendert, passt diesen
// Text an. Der Link «Was heisst das?» neben jeder Einordnung springt per Anker
// hierher; ein Hash-Wechsel auf #einordnung klappt die Erklaerung auf.

const CSS = `
        .nm { border-top: 1px solid var(--da-border); border-bottom: 1px solid var(--da-border); margin: 0 0 var(--sp-6); scroll-margin-top: calc(var(--nav-h) + 72px); }
        .nm summary {
          display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
          list-style: none; cursor: pointer; padding: 13px 0;
          color: var(--da-text); font-size: 15px; font-weight: 600;
        }
        .nm summary::-webkit-details-marker { display: none; }
        .nm summary:hover { color: var(--da-green); }
        .nm summary:focus-visible { outline: 2px solid var(--da-green); outline-offset: 2px; border-radius: 3px; }
        .nm-arr { color: var(--da-muted); font-weight: 400; flex-shrink: 0; }
        .nm-arr::after { content: "▾"; }
        .nm[open] .nm-arr::after { content: "▴"; }
        /* Etwa 70 Zeichen pro Zeile; Begriff links, Erklaerung rechts. */
        .nm-body { max-width: 66ch; padding: 4px 0 var(--sp-6); }
        .nm-body p { color: #c4c4c4; font-size: 15px; line-height: 1.62; margin: 0 0 14px; }
        .nm-body a { color: var(--da-muted); text-decoration: underline; text-underline-offset: 2px; }
        .nm-body a:hover { color: var(--da-green); }
        .nm-body dl { margin: 6px 0 18px; display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 10px 16px; font-size: 15px; line-height: 1.55; }
        .nm-body dt { color: var(--da-text); font-weight: 600; }
        .nm-body dd { color: #c4c4c4; margin: 0; }
        @media (max-width: 640px) {
          /* Grosse Flaeche zum Antippen; Begriff fett ueber der Erklaerung. */
          .nm summary { padding: 16px 0; }
          .nm-body dl { grid-template-columns: minmax(0, 1fr); gap: 2px; }
          .nm-body dd { margin-bottom: 10px; }
        }
`;

export default function NewsMethod() {
  const ref = useRef<HTMLDetailsElement>(null);

  // «Was heisst das?» bei einer Meldung soll die Erklaerung geoeffnet zeigen.
  useEffect(() => {
    const openOnHash = () => {
      if (window.location.hash === "#einordnung" && ref.current) ref.current.open = true;
    };
    openOnHash();
    window.addEventListener("hashchange", openOnHash);
    return () => window.removeEventListener("hashchange", openOnHash);
  }, []);

  return (
    <details id="einordnung" className="nm" ref={ref}>
      <style>{CSS}</style>
      <summary>
        So ordnen wir ein
        <span className="nm-arr" aria-hidden />
      </summary>
      <div className="nm-body">
        <p>
          Zu jeder Meldung schätzt eine KI vier Felder ein, in Stufen statt in Noten: kein Bezug, gering, mittel, hoch.
          Die Stufen geben eine grobe Orientierung, sie sind keine Messung.
        </p>
        <dl>
          <dt>Wirtschaft</dt>
          <dd>Folgen für Unternehmen, Märkte, Arbeitsplätze und Investitionen.</dd>
          <dt>Gesellschaft</dt>
          <dd>Folgen für Menschen, Bildung, Demokratie, Datenschutz und Sicherheit.</dd>
          <dt>Umwelt</dt>
          <dd>Energie, Ressourcen und Klima. Meist kein Bezug oder gering, ausser die Meldung handelt direkt davon.</dd>
          <dt>Dringlichkeit</dt>
          <dd>Hoch, wenn man jetzt handeln muss, etwa wegen einer Frist, einer Sicherheitslücke oder eines Gesetzes, das in Kraft tritt. Gering bei Ankündigungen, Studien und Trends.</dd>
        </dl>
        <p>
          «Wichtig» steht bei Meldungen, die für Entscheiderinnen und Entscheider in der Schweiz, Deutschland und Österreich zählen.
          Höchstens jede fünfte Meldung soll diese Marke bekommen. Gerüchte, Einzelmeinungen und Produktwerbung erhalten tiefe Stufen.
        </p>
        <p>
          Grundlage ist allein die Meldung der Quelle, die KI recherchiert nicht nach. Liegt eine Einschätzung daneben, korrigiert
          die Redaktion sie; die Meldung trägt dann den Vermerk «Von der Redaktion eingeordnet». <Link href="/ki-transparenz">KI-Transparenz</Link>
        </p>
      </div>
    </details>
  );
}

// Gestaltung der Lesestatistik (/autor/statistiken). Bewusst ohne Karten,
// Pillen und Versalien-Labels: Linien, Schrift und Abstand ordnen die Seite.
// Farben der Marken (zwei Stufen eines Gruens, dunkle Flaeche) sind mit dem
// Palette-Pruefer der Dataviz-Regeln geprueft: gelesen = heller, uebrige
// Aufrufe = dunkler.
export const STAT_COLORS = {
  read: "#32ff7e",
  rest: "#1f8a4c",
  track: "#243a2d",
};

export default function StatsStyles() {
  return (
    <style>{`
      .st { color: var(--da-text-strong); max-width: 1040px; }
      .st a { color: inherit; }

      .st-head { margin-bottom: 28px; }
      .st-title {
        color: var(--da-text); font-family: var(--da-font-display);
        font-size: 34px; font-weight: 700; line-height: 1.1; letter-spacing: -0.01em;
        margin: 0 0 8px;
      }
      .st-title--article { font-size: 28px; line-height: 1.2; max-width: 30ch; }
      .st-sub { color: var(--da-muted); font-size: 14px; line-height: 1.5; margin: 0; }
      .st-sub a { text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--da-border); }
      .st-sub a:hover { color: var(--da-text); text-decoration-color: var(--da-green); }
      .st-back {
        display: inline-block; color: var(--da-muted); font-size: 13px;
        text-decoration: none; margin-bottom: 18px;
      }
      .st-back:hover { color: var(--da-text); }

      /* Zeitraum und Filter: eine Zeile ueber allem, was sie betreffen. */
      .st-controls {
        display: flex; align-items: flex-end; justify-content: space-between;
        gap: 16px 32px; flex-wrap: wrap;
        border-bottom: 1px solid var(--da-border);
        margin-bottom: 32px;
      }
      .st-range { display: flex; gap: 24px; flex-wrap: wrap; }
      .st-range a {
        color: var(--da-muted); font-size: 14px; text-decoration: none;
        padding: 0 0 12px; border-bottom: 2px solid transparent; margin-bottom: -1px;
        white-space: nowrap;
      }
      .st-range a:hover { color: var(--da-text); }
      .st-range a[aria-current="true"] { color: var(--da-text); font-weight: 600; border-bottom-color: var(--da-green); }
      .st-filter { display: flex; align-items: center; gap: 10px; padding-bottom: 10px; font-size: 14px; color: var(--da-muted); }
      .st-filter select {
        background: transparent; color: var(--da-text); font: inherit;
        border: 0; border-bottom: 1px solid var(--da-border); border-radius: 0;
        padding: 2px 22px 3px 0; cursor: pointer; max-width: 240px;
      }
      .st-filter select:focus-visible { outline: 2px solid var(--da-green); outline-offset: 3px; }
      .st-filter option { background: var(--da-card); color: var(--da-text); }

      /* Kennzahlen: Zahlen tragen, keine Kacheln. */
      .st-figures {
        display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 28px 40px; margin: 0 0 44px;
      }
      .st-figure { min-width: 0; }
      .st-figure__value {
        color: var(--da-text); font-family: var(--da-font-display);
        font-size: 40px; font-weight: 700; line-height: 1; letter-spacing: -0.02em;
        white-space: nowrap;
      }
      .st-figure__label { color: var(--da-text-strong); font-size: 14px; margin: 10px 0 0; }
      .st-figure__note { color: var(--da-muted-soft); font-size: 12.5px; line-height: 1.45; margin: 4px 0 0; }

      .st-section { margin: 0 0 48px; }
      .st-h2 {
        color: var(--da-text); font-family: var(--da-font-display);
        font-size: 18px; font-weight: 700; letter-spacing: -0.005em; margin: 0;
      }
      .st-h2row {
        display: flex; align-items: baseline; justify-content: space-between;
        gap: 12px 24px; flex-wrap: wrap; margin-bottom: 16px;
      }
      .st-note { color: var(--da-muted); font-size: 13.5px; line-height: 1.55; margin: 6px 0 0; max-width: 70ch; }

      /* Verlauf */
      .st-legend { display: flex; gap: 18px; flex-wrap: wrap; color: var(--da-muted); font-size: 12.5px; }
      .st-legend span { display: inline-flex; align-items: center; gap: 7px; }
      .st-legend i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
      .st-chart { position: relative; }
      .st-chart svg { display: block; width: 100%; height: auto; overflow: visible; }
      .st-chart__tick { fill: var(--da-muted-soft); font-size: 11px; font-family: var(--da-font-body); font-variant-numeric: tabular-nums; }
      .st-chart__grid { stroke: var(--da-border-soft); stroke-width: 1; }
      .st-chart__base { stroke: var(--da-border); stroke-width: 1; }
      .st-chart__empty { fill: var(--da-muted); font-size: 13px; font-family: var(--da-font-body); }
      .st-tip {
        position: absolute; top: 0; pointer-events: none; z-index: 2;
        background: var(--da-darker); border: 1px solid var(--da-border);
        padding: 9px 12px; min-width: 150px;
        font-size: 12.5px; line-height: 1.5; color: var(--da-muted);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
      }
      .st-tip strong { color: var(--da-text); font-weight: 600; font-variant-numeric: tabular-nums; }
      .st-tip__day { color: var(--da-text-strong); margin-bottom: 4px; }
      .st-tip__row { display: flex; align-items: center; gap: 7px; white-space: nowrap; }
      .st-tip__row i { width: 10px; height: 2px; display: inline-block; flex: none; }
      .st-details { margin-top: 12px; font-size: 13px; color: var(--da-muted); }
      .st-details summary { cursor: pointer; width: fit-content; }
      .st-details summary:hover { color: var(--da-text); }
      .st-details table { margin-top: 10px; border-collapse: collapse; font-variant-numeric: tabular-nums; }
      .st-details th, .st-details td { padding: 4px 22px 4px 0; text-align: right; font-weight: 400; }
      .st-details th:first-child, .st-details td:first-child { text-align: left; }
      .st-details th { color: var(--da-muted-soft); }

      /* Beitraege */
      .st-table { width: 100%; border-collapse: collapse; }
      .st-table th {
        color: var(--da-muted-soft); font-size: 12.5px; font-weight: 400; text-align: right;
        padding: 0 0 10px 20px; border-bottom: 1px solid var(--da-border); white-space: nowrap;
      }
      .st-table th:first-child { text-align: left; padding-left: 0; }
      .st-table td {
        padding: 14px 0 14px 20px; border-bottom: 1px solid var(--da-border-soft);
        text-align: right; font-size: 14.5px; color: var(--da-text-strong);
        font-variant-numeric: tabular-nums; vertical-align: top; white-space: nowrap;
      }
      .st-table td:first-child { text-align: left; padding-left: 0; white-space: normal; }
      .st-table tr:last-child td { border-bottom-color: var(--da-border); }
      .st-table__title { color: var(--da-text); font-weight: 600; text-decoration: none; line-height: 1.35; }
      .st-table__title:hover { text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--da-green); }
      .st-table__meta { color: var(--da-muted-soft); font-size: 12.5px; margin-top: 3px; }
      .st-table__zero td { color: var(--da-muted-soft); }
      .st-table__zero .st-table__title { color: var(--da-text-strong); font-weight: 500; }
      .st-table__strong { color: var(--da-text); font-weight: 600; }

      /* Zwei Listen nebeneinander: Herkunft, Lesetiefe */
      .st-cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 44px 64px; margin: 0 0 48px; }
      .st-bars { list-style: none; margin: 0; padding: 0; }
      .st-bars li {
        display: grid; grid-template-columns: minmax(0, 11.5em) minmax(40px, 1fr) auto;
        align-items: center; gap: 14px; padding: 9px 0;
        border-bottom: 1px solid var(--da-border-soft); font-size: 14px;
      }
      .st-bars li:first-child { border-top: 1px solid var(--da-border); }
      .st-bars__name { color: var(--da-text-strong); }
      .st-bars__track { height: 8px; border-radius: 4px; overflow: hidden; }
      .st-bars__fill { height: 100%; border-radius: 4px; min-width: 2px; }
      .st-bars__num { color: var(--da-muted); font-variant-numeric: tabular-nums; white-space: nowrap; text-align: right; min-width: 6.5em; }
      .st-bars__num strong { color: var(--da-text); font-weight: 600; }

      .st-foot { border-top: 1px solid var(--da-border); padding-top: 22px; }
      .st-foot p { color: var(--da-muted); font-size: 13.5px; line-height: 1.6; margin: 0 0 10px; max-width: 74ch; }
      .st-foot p:last-child { margin-bottom: 0; }

      @media (max-width: 900px) {
        .st-figures { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .st-cols { grid-template-columns: minmax(0, 1fr); }
      }
      @media (max-width: 640px) {
        .st-title { font-size: 28px; }
        .st-title--article { font-size: 23px; }
        .st-figure__value { font-size: 32px; }
        .st-range { gap: 18px; }
        .st-table .st-hide-s { display: none; }
        .st-table th, .st-table td { padding-left: 14px; }
        .st-bars li { grid-template-columns: minmax(0, 1fr) auto; }
        .st-bars__track { grid-column: 1 / -1; grid-row: 2; }
      }
    `}</style>
  );
}

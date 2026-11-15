"use client";

import { useEffect, useRef, useState } from "react";

import { STAT_COLORS } from "@/components/author/stats/StatsStyles";
import {
  bucketLabel,
  bucketTick,
  formatCount,
  formatDuration,
  niceTicks,
  tickIndexes,
  type Bucket,
  type SeriesPoint,
} from "@/lib/stats/summary";

// Verlauf der Aufrufe als gestapelte Saeulen: unten «zu Ende gelesen», oben
// die uebrigen Aufrufe. Eine Achse, zwei Stufen eines Farbtons. Der Zeiger
// muss keine Saeule treffen: Jedes Feld reagiert ueber die ganze Hoehe.
// Dieselben Zahlen stehen ohne Zeiger in der Tabelle darunter.

type Props = {
  series: SeriesPoint[];
  bucket: Bucket;
};

const H = 232;
const M = { top: 14, right: 4, bottom: 26, left: 34 };
const GAP = 2;

export default function StatsChart({ series, bucket }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(920);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => setWidth(Math.max(280, Math.round(el.clientWidth)));
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    const outside = (e: PointerEvent) => {
      if (!el.contains(e.target as Node)) setHover(null);
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      ro.disconnect();
      document.removeEventListener("pointerdown", outside);
    };
  }, []);

  const n = series.length;
  const plotW = width - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const max = series.reduce((m, p) => Math.max(m, p.views), 0);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const y = (v: number) => M.top + plotH - (v / top) * plotH;
  const band = n > 0 ? plotW / n : plotW;
  const gap = band >= 6 ? GAP : 1;
  // Schmale Saeulen: Bei wenigen Feldern bleibt Luft, statt breite Bloecke zu malen.
  const barW = Math.max(1.5, Math.min(16, band - gap));
  const radius = Math.min(4, barW / 2);
  const labelAt = new Set(tickIndexes(n, width < 520 ? 4 : 7));
  const empty = max === 0;

  const active = hover !== null ? series[hover] : null;
  // Angabe neben dem Feld, nicht darueber: Die Saeule bleibt sichtbar. In der
  // rechten Haelfte steht sie links vom Feld.
  const colLeft = hover !== null ? M.left + band * hover : 0;
  const tipStyle =
    hover !== null && colLeft + band / 2 > width * 0.6
      ? { right: Math.max(0, width - colLeft + 8) }
      : { left: colLeft + band + 8 };

  return (
    <div className="st-chart" ref={wrapRef}>
      <svg
        viewBox={`0 0 ${width} ${H}`}
        width={width}
        height={H}
        role="img"
        aria-label={`Aufrufe pro ${bucket === "day" ? "Tag" : bucket === "week" ? "Woche" : "Monat"}. Die Zahlen stehen in der Tabelle darunter.`}
        onPointerLeave={(e) => {
          // Beim Tippen bleibt die Angabe stehen, bis man daneben tippt.
          if (e.pointerType === "mouse") setHover(null);
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? "st-chart__base" : "st-chart__grid"} x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
            <text className="st-chart__tick" x={M.left - 8} y={y(t) + 4} textAnchor="end">
              {formatCount(t)}
            </text>
          </g>
        ))}

        {series.map((p, i) => {
          const x = M.left + band * i + (band - barW) / 2;
          const reads = Math.min(p.reads, p.views);
          const rest = p.views - reads;
          const hRead = (reads / top) * plotH;
          const hRest = (rest / top) * plotH;
          // Luecke in der Flaechenfarbe zwischen den Teilen, wenn beide Platz haben.
          const split = hRead > 3 && hRest > 3 ? GAP : 0;
          const isHover = hover === i;
          return (
            <g key={p.bucket} opacity={hover === null || isHover ? 1 : 0.55}>
              {hRest > 0 && (
                <path
                  d={topRounded(x, y(p.views), barW, Math.max(0.5, hRest - split), hRead > 0 ? Math.min(radius, hRest / 2) : radius)}
                  fill={STAT_COLORS.rest}
                />
              )}
              {hRead > 0 && (
                <path
                  d={topRounded(x, y(reads), barW, hRead, hRest > 0 ? 0 : radius)}
                  fill={STAT_COLORS.read}
                />
              )}
              {labelAt.has(i) && (
                <text
                  className="st-chart__tick"
                  x={M.left + band * i + band / 2}
                  y={H - 7}
                  textAnchor={i === 0 && n > 8 ? "start" : i === n - 1 && n > 8 ? "end" : "middle"}
                >
                  {bucketTick(p.bucket, bucket)}
                </text>
              )}
              <rect
                x={M.left + band * i}
                y={M.top}
                width={band}
                height={plotH}
                fill="transparent"
                onPointerEnter={() => setHover(i)}
                onPointerDown={() => setHover(i)}
              />
            </g>
          );
        })}

        {empty && (
          <text className="st-chart__empty" x={M.left + plotW / 2} y={M.top + plotH / 2} textAnchor="middle">
            Noch keine Aufrufe in diesem Zeitraum.
          </text>
        )}
      </svg>

      {active && (
        <div className="st-tip" style={tipStyle} role="status">
          <div className="st-tip__day">{bucketLabel(active.bucket, bucket)}</div>
          <div className="st-tip__row">
            <i style={{ background: STAT_COLORS.rest }} />
            <span>
              <strong>{formatCount(active.views)}</strong> {active.views === 1 ? "Aufruf" : "Aufrufe"}
            </span>
          </div>
          <div className="st-tip__row">
            <i style={{ background: STAT_COLORS.read }} />
            <span>
              <strong>{formatCount(Math.min(active.reads, active.views))}</strong> zu Ende gelesen
            </span>
          </div>
          {active.views > 0 && (
            <div className="st-tip__row">
              <i />
              <span>
                <strong>{formatDuration(active.seconds / active.views)}</strong> Lesezeit im Mittel
              </span>
            </div>
          )}
        </div>
      )}

      <details className="st-details">
        <summary>Zahlen als Tabelle</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{bucket === "day" ? "Tag" : bucket === "week" ? "Woche" : "Monat"}</th>
              <th scope="col">Aufrufe</th>
              <th scope="col">Gelesen</th>
              <th scope="col">Lesezeit im Mittel</th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((p) => (
              <tr key={p.bucket}>
                <td>{bucketLabel(p.bucket, bucket)}</td>
                <td>{formatCount(p.views)}</td>
                <td>{formatCount(Math.min(p.reads, p.views))}</td>
                <td>{p.views > 0 ? formatDuration(p.seconds / p.views) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

// Rechteck mit runden oberen Ecken (das Datenende), unten gerade.
function topRounded(x: number, yTop: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return [
    `M${x},${yTop + h}`,
    `V${yTop + rr}`,
    `Q${x},${yTop} ${x + rr},${yTop}`,
    `H${x + w - rr}`,
    `Q${x + w},${yTop} ${x + w},${yTop + rr}`,
    `V${yTop + h}`,
    "Z",
  ].join(" ");
}

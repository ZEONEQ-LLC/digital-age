import Link from "next/link";

import { STAT_COLORS } from "@/components/author/stats/StatsStyles";
import {
  RANGES,
  avgSeconds,
  depthFunnel,
  formatCount,
  formatDuration,
  formatPercent,
  readRatio,
  sourceBreakdown,
  SOURCE_HINTS,
  type RangeKey,
  type StatTotals,
} from "@/lib/stats/summary";

// Bausteine der Lesestatistik, ohne Datenzugriff (Uebersicht und Detail).

// Adresse mit Zeitraum und, bei der Redaktion, dem Filter nach Person.
export function statsHref(base: string, range: RangeKey, authorId?: string | null): string {
  const q = new URLSearchParams();
  if (range !== "30") q.set("zeit", range);
  if (authorId) q.set("autor", authorId);
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

export function RangeNav({ base, range, authorId }: { base: string; range: RangeKey; authorId?: string | null }) {
  return (
    <nav className="st-range" aria-label="Zeitraum">
      {RANGES.map((r) => (
        <Link key={r.key} href={statsHref(base, r.key, authorId)} aria-current={r.key === range ? "true" : undefined} prefetch={false}>
          {r.label}
        </Link>
      ))}
    </nav>
  );
}

// single = Zahlen eines einzelnen Beitrags (Detailseite).
export function Figures({ totals, single = false }: { totals: StatTotals; single?: boolean }) {
  const ratio = readRatio(totals);
  return (
    <div className="st-figures">
      <div className="st-figure">
        <div className="st-figure__value">{formatCount(totals.views)}</div>
        <p className="st-figure__label">Aufrufe</p>
        <p className="st-figure__note">{single ? "So oft wurde der Beitrag geöffnet." : "So oft wurde ein Beitrag geöffnet."}</p>
      </div>
      <div className="st-figure">
        <div className="st-figure__value">{formatCount(Math.min(totals.reads, totals.views))}</div>
        <p className="st-figure__label">zu Ende gelesen</p>
        <p className="st-figure__note">Bis zum Schluss gescrollt und lange genug geblieben.</p>
      </div>
      <div className="st-figure">
        <div className="st-figure__value">{formatPercent(ratio)}</div>
        <p className="st-figure__label">Lesequote</p>
        <p className="st-figure__note">Anteil der Aufrufe, die bis zum Ende gehen.</p>
      </div>
      <div className="st-figure">
        <div className="st-figure__value">{formatDuration(avgSeconds(totals))}</div>
        <p className="st-figure__label">Lesezeit im Mittel</p>
        <p className="st-figure__note">Aktive Zeit pro Aufruf.</p>
      </div>
    </div>
  );
}

export function ChartLegend() {
  return (
    <div className="st-legend">
      <span>
        <i style={{ background: STAT_COLORS.read }} />
        zu Ende gelesen
      </span>
      <span>
        <i style={{ background: STAT_COLORS.rest }} />
        übrige Aufrufe
      </span>
    </div>
  );
}

function BarList({ rows }: { rows: { key: string; label: string; count: number; share: number; hint?: string }[] }) {
  return (
    <ul className="st-bars">
      {rows.map((r) => (
        <li key={r.key}>
          <span className="st-bars__name" title={r.hint}>{r.label}</span>
          <span className="st-bars__track" style={{ background: STAT_COLORS.track }} aria-hidden>
            <span className="st-bars__fill" style={{ display: "block", width: `${Math.round(r.share * 1000) / 10}%`, background: STAT_COLORS.read }} />
          </span>
          <span className="st-bars__num">
            <strong>{formatPercent(r.share)}</strong> · {formatCount(r.count)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DepthSection({ totals }: { totals: StatTotals }) {
  const rows = depthFunnel(totals);
  return (
    <section>
      <div className="st-h2row">
        <h2 className="st-h2">Wie weit gelesen wird</h2>
      </div>
      {rows.length === 0 ? (
        <p className="st-note">Noch keine Aufrufe in diesem Zeitraum.</p>
      ) : (
        <>
          <BarList rows={rows} />
          <p className="st-note">
            Von allen Aufrufen: wie viele welche Stelle im Text erreicht haben, auch beim schnellen Überfliegen. «Zu Ende gelesen» verlangt zusätzlich genug Zeit auf der Seite.
          </p>
        </>
      )}
    </section>
  );
}

export function SourceSection({ totals }: { totals: StatTotals }) {
  const rows = sourceBreakdown(totals).map((r) => ({ ...r, hint: SOURCE_HINTS[r.key] }));
  const hasDirect = rows.some((r) => r.key === "direct");
  return (
    <section>
      <div className="st-h2row">
        <h2 className="st-h2">Woher die Aufrufe kommen</h2>
      </div>
      {rows.length === 0 ? (
        <p className="st-note">Noch keine Aufrufe in diesem Zeitraum.</p>
      ) : (
        <>
          <BarList rows={rows} />
          {hasDirect && (
            <p className="st-note">
              «Direkt» heisst: Adresse eingetippt, Lesezeichen oder ein Link aus einer App wie WhatsApp oder einem Mailprogramm. Solche Apps geben nicht mit, woher der Klick kommt.
            </p>
          )}
        </>
      )}
    </section>
  );
}

// Aktionen als Satz, nicht als Kachel.
export function ActionsLine({ totals }: { totals: StatTotals }) {
  if (totals.shares === 0 && totals.listens === 0) return null;
  const parts: string[] = [];
  if (totals.shares > 0) parts.push(`${formatCount(totals.shares)}-mal auf «Teilen» geklickt`);
  if (totals.listens > 0) parts.push(`${formatCount(totals.listens)}-mal «Anhören» gestartet`);
  return <p className="st-note" style={{ margin: "0 0 48px" }}>In diesem Zeitraum: {parts.join(", ")}.</p>;
}

export function CountingNote({ own }: { own: boolean }) {
  return (
    <footer className="st-foot">
      <h2 className="st-h2" style={{ marginBottom: 12 }}>So wird gezählt</h2>
      <p>
        Ein Aufruf ist ein geöffneter Beitrag in einem Browser. Neuladen, Suchmaschinen-Roboter und angemeldete Mitglieder von Redaktion und Autorenschaft zählen nicht
        {own ? ", auch du selbst nicht, solange du angemeldet bist" : ""}. «Zu Ende gelesen» heisst: bis zum Schluss des Textes gescrollt und mindestens ein Viertel der geschätzten Lesezeit aktiv auf der Seite. Die Lesezeit läuft nur, solange der Tab sichtbar ist und sich etwas bewegt.
      </p>
      <p>
        Gezählt wird ohne Cookies und ohne Kennung der Leserinnen und Leser. Die Statistik zeigt deshalb Aufrufe, keine Personen: Wer einen Beitrag am Handy und später am Laptop öffnet, zählt zweimal. Die Zählung läuft seit November 2026, ältere Aufrufe sind nicht erfasst.
      </p>
    </footer>
  );
}

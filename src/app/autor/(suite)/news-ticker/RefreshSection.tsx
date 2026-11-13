"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { triggerRefresh } from "@/lib/newsTickerActions";
import { unwrapAction } from "@/lib/actionResult";
import type { RefreshStats } from "@/lib/newsTicker/stats";

type Props = {
  lastRefreshLabel: string;
  // Gespeicherte Statistik des letzten Laufs (Cron oder Admin), null wenn
  // noch keiner lief. Wird gezeigt, bis hier ein neuer Lauf startet.
  lastStats: RefreshStats | null;
  // Neuester Eintrag im Ticker; stale = laenger als ein paar Tage her.
  latestItem: { label: string; stale: boolean } | null;
};

export default function RefreshSection({ lastRefreshLabel, lastStats, latestItem }: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<RefreshStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRefresh() {
    setError(null);
    setStats(null);
    startTransition(async () => {
      try {
        const result = unwrapAction(await triggerRefresh());
        setStats(result);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Refresh fehlgeschlagen.");
      }
    });
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h2 style={{ color: "var(--da-text)", fontSize: 18, fontWeight: 700 }}>Refresh</h2>
        <span style={{ color: "var(--da-muted)", fontSize: 11, fontFamily: "var(--da-font-mono)", textAlign: "right" }}>
          Letzter Lauf: {lastRefreshLabel}
          <br />
          <span style={{ color: latestItem?.stale ? "var(--da-orange)" : "var(--da-muted)" }}>
            Neuester Eintrag: {latestItem ? latestItem.label : "keiner"}
          </span>
        </span>
      </div>

      <div
        style={{
          background: "var(--da-card)",
          border: "1px solid var(--da-border)",
          borderRadius: 6,
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <p style={{ color: "var(--da-muted)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
          Holt alle aktiven Quellen ab und generiert pro neuem Item einen Ticker-Eintrag via LLM. Duplikate werden anhand
          der Original-URL erkannt und übersprungen.
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={pending}
          style={{
            background: "var(--da-green)",
            color: "var(--da-dark)",
            border: "none",
            borderRadius: 4,
            padding: "14px 22px",
            fontSize: 14,
            fontWeight: 700,
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.7 : 1,
            fontFamily: "inherit",
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {pending
            ? "⏳ Lade Feeds und generiere Items… (kann 1–2 Minuten dauern)"
            : "Jetzt aktualisieren"}
        </button>

        {error && (
          <div
            role="alert"
            style={{
              background: "rgba(255,80,80,0.08)",
              border: "1px solid rgba(255,80,80,0.4)",
              color: "#ff8e8e",
              padding: "10px 14px",
              borderRadius: 4,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {stats ? (
          <StatsBox stats={stats} title="Refresh abgeschlossen" />
        ) : (
          !pending && lastStats && <StatsBox stats={lastStats} title={`Letzter Lauf · ${lastRefreshLabel}`} />
        )}
      </div>
    </section>
  );
}

function StatsBox({ stats, title }: { stats: RefreshStats; title: string }) {
  if (stats.paused) {
    return (
      <div
        style={{
          background: "rgba(255,140,66,0.08)",
          border: "1px solid var(--da-orange)",
          color: "var(--da-orange)",
          padding: "14px 18px",
          borderRadius: 4,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        ⏸ Ticker ist pausiert — kein Refresh ausgeführt.
      </div>
    );
  }
  // Laeufe vor PR 191 kennen items_failed nicht: dort mischt
  // items_skipped_generation Aussortiertes und Fehler.
  const legacy = stats.items_failed === undefined;
  const failed = stats.items_failed ?? 0;
  const warn = failed > 0 || stats.errors.length > 0;
  return (
    <div
      style={{
        background: warn ? "rgba(255,140,66,0.06)" : "rgba(50,255,126,0.06)",
        border: warn ? "1px solid rgba(255,140,66,0.45)" : "1px solid rgba(50,255,126,0.4)",
        borderRadius: 4,
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <p
        style={{
          color: warn ? "var(--da-orange)" : "var(--da-green)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "var(--da-font-mono)",
          margin: 0,
        }}
      >
        {title}
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          <Row label="Quellen geprüft" value={stats.sources_polled} />
          <Row label="Items neu generiert" value={stats.items_generated} accent="green" />
          <Row label="Items übersprungen (Duplikat)" value={stats.items_skipped_dedup} />
          {legacy ? (
            <Row label="Items übersprungen (aussortiert oder Fehler)" value={stats.items_skipped_generation} />
          ) : (
            <>
              <Row label="Items aussortiert (passt nicht)" value={stats.items_skipped_generation} />
              <Row label="Items fehlgeschlagen" value={failed} accent={failed > 0 ? "orange" : undefined} />
            </>
          )}
          {stats.items_assessed !== undefined && (
            <Row label="Einordnung nachgetragen" value={stats.items_assessed} />
          )}
          {(stats.assess_failed ?? 0) > 0 && (
            <Row label="Einordnung fehlgeschlagen" value={stats.assess_failed ?? 0} accent="orange" />
          )}
        </tbody>
      </table>

      {stats.errors.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p
            style={{
              color: "var(--da-orange)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "var(--da-font-mono)",
              margin: 0,
            }}
          >
            Fehler ({stats.errors.length})
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {stats.errors.map((e, i) => (
              <li
                key={i}
                style={{
                  background: "rgba(255,140,66,0.08)",
                  border: "1px solid rgba(255,140,66,0.3)",
                  borderRadius: 3,
                  padding: "8px 10px",
                  fontSize: 12,
                  color: "var(--da-text)",
                  lineHeight: 1.45,
                }}
              >
                <strong style={{ color: "var(--da-orange)" }}>{e.source_name}:</strong>{" "}
                <span style={{ color: "var(--da-muted)" }}>
                  {e.message}
                  {e.count && e.count > 1 ? ` (${e.count}×)` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "green" | "orange";
}) {
  return (
    <tr style={{ borderBottom: "1px solid var(--da-border)" }}>
      <td style={{ padding: "6px 0", color: "var(--da-muted)", fontSize: 13 }}>{label}</td>
      <td
        style={{
          padding: "6px 0",
          textAlign: "right",
          color: accent === "green" ? "var(--da-green)" : accent === "orange" ? "var(--da-orange)" : "var(--da-text)",
          fontWeight: 700,
          fontFamily: "var(--da-font-mono)",
        }}
      >
        {value}
      </td>
    </tr>
  );
}

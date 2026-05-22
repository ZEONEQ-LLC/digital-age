"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { triggerRefresh } from "@/lib/newsTickerActions";

type RefreshError = { source_id: string; source_name: string; message: string };
type RefreshStats = {
  sources_polled: number;
  items_fetched: number;
  items_generated: number;
  items_skipped_dedup: number;
  items_skipped_generation: number;
  errors: RefreshError[];
};

type Props = {
  lastRefreshLabel: string;
};

export default function RefreshSection({ lastRefreshLabel }: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<RefreshStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRefresh() {
    setError(null);
    setStats(null);
    startTransition(async () => {
      try {
        const result = await triggerRefresh();
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
        <span style={{ color: "var(--da-muted)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
          Letzter Lauf: {lastRefreshLabel}
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

        {stats && <StatsBox stats={stats} />}
      </div>
    </section>
  );
}

function StatsBox({ stats }: { stats: RefreshStats }) {
  return (
    <div
      style={{
        background: "rgba(50,255,126,0.06)",
        border: "1px solid rgba(50,255,126,0.4)",
        borderRadius: 4,
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <p
        style={{
          color: "var(--da-green)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "var(--da-font-mono)",
          margin: 0,
        }}
      >
        Refresh abgeschlossen
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          <Row label="Quellen geprüft" value={stats.sources_polled} />
          <Row label="Items neu generiert" value={stats.items_generated} accent="green" />
          <Row label="Items übersprungen (Duplikat)" value={stats.items_skipped_dedup} />
          <Row label="Items übersprungen (Skip oder Fehler)" value={stats.items_skipped_generation} />
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
                <span style={{ color: "var(--da-muted)" }}>{e.message}</span>
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
  accent?: "green";
}) {
  return (
    <tr style={{ borderBottom: "1px solid var(--da-border)" }}>
      <td style={{ padding: "6px 0", color: "var(--da-muted)", fontSize: 13 }}>{label}</td>
      <td
        style={{
          padding: "6px 0",
          textAlign: "right",
          color: accent === "green" ? "var(--da-green)" : "var(--da-text)",
          fontWeight: 700,
          fontFamily: "var(--da-font-mono)",
        }}
      >
        {value}
      </td>
    </tr>
  );
}

"use client";

import { useState, useTransition } from "react";
import { saveTickerSettings, type TickerSettings } from "@/lib/newsTickerActions";

type Props = {
  initial: TickerSettings;
};

const SPEED_LABELS: Record<TickerSettings["ticker_speed"], string> = {
  slow: "Langsam",
  normal: "Normal",
  fast: "Schnell",
};

export default function SettingsSection({ initial }: Props) {
  const [settings, setSettings] = useState<TickerSettings>(initial);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty =
    settings.ticker_speed !== initial.ticker_speed ||
    settings.items_per_source !== initial.items_per_source ||
    settings.is_paused !== initial.is_paused ||
    settings.scheduler_enabled !== initial.scheduler_enabled ||
    settings.scheduled_hour_cet !== initial.scheduled_hour_cet;

  function save(next?: TickerSettings) {
    const toSave = next ?? settings;
    setError(null);
    setSavedHint(null);
    startTransition(async () => {
      try {
        await saveTickerSettings(toSave);
        setSavedHint("Gespeichert");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  // Pause-Toggle und Scheduler-Toggle speichern direkt — bei diesen
  // ist „Save explizit nötig" kontraproduktiv (User erwartet Sofort-Effekt
  // wie bei einem Schalter).
  function togglePaused(checked: boolean) {
    const next = { ...settings, is_paused: checked };
    setSettings(next);
    save(next);
  }

  function toggleScheduler(checked: boolean) {
    const next = { ...settings, scheduler_enabled: checked };
    setSettings(next);
    save(next);
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h2 style={{ color: "var(--da-text)", fontSize: 18, fontWeight: 700 }}>Anzeige & Scheduler</h2>
        {savedHint && (
          <span style={{ color: "var(--da-muted)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
            {savedHint}
          </span>
        )}
      </div>

      {settings.is_paused && (
        <div
          role="status"
          style={{
            background: "rgba(255,140,66,0.1)",
            border: "1px solid var(--da-orange)",
            color: "var(--da-orange)",
            padding: "10px 14px",
            borderRadius: 4,
            fontSize: 13,
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          ⏸ Ticker ist aktuell pausiert — auf der Public-Seite wird nichts angezeigt, Refresh-Läufe werden übersprungen.
        </div>
      )}

      <div
        style={{
          background: "var(--da-card)",
          border: "1px solid var(--da-border)",
          borderRadius: 6,
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {/* Pause-Toggle */}
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={settings.is_paused}
            onChange={(e) => togglePaused(e.target.checked)}
            disabled={pending}
            style={{ marginTop: 3 }}
          />
          <div>
            <p style={{ color: "var(--da-text)", fontSize: 14, fontWeight: 600, margin: 0 }}>
              Ticker pausieren
            </p>
            <p style={{ color: "var(--da-muted)", fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
              Blendet den Ticker auf allen Public-Seiten aus und überspringt Refresh-Läufe (Admin + Cron).
            </p>
          </div>
        </label>

        {/* Geschwindigkeit */}
        <div>
          <p style={{ color: "var(--da-text)", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            Geschwindigkeit
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {(["slow", "normal", "fast"] as const).map((s) => (
              <label key={s} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="ticker_speed"
                  checked={settings.ticker_speed === s}
                  onChange={() => setSettings({ ...settings, ticker_speed: s })}
                  disabled={pending}
                />
                <span style={{ color: "var(--da-text)", fontSize: 13 }}>{SPEED_LABELS[s]}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Items pro Quelle */}
        <div>
          <p style={{ color: "var(--da-text)", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            Items pro Quelle
          </p>
          <p style={{ color: "var(--da-muted)", fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>
            Maximal so viele Items werden beim Refresh pro Feed-Quelle gezogen (1–30).
          </p>
          <input
            type="number"
            min={1}
            max={30}
            value={settings.items_per_source}
            onChange={(e) => {
              const v = parseInt(e.target.value.trim(), 10);
              if (Number.isFinite(v)) {
                setSettings({ ...settings, items_per_source: v });
              }
            }}
            disabled={pending}
            style={{
              ...inputStyle,
              width: 100,
              fontFamily: "var(--da-font-mono)",
              textAlign: "right",
            }}
          />
        </div>

        {/* Scheduler */}
        <div style={{ paddingTop: 18, borderTop: "1px solid var(--da-border)" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 14 }}>
            <input
              type="checkbox"
              checked={settings.scheduler_enabled}
              onChange={(e) => toggleScheduler(e.target.checked)}
              disabled={pending}
              style={{ marginTop: 3 }}
            />
            <div>
              <p style={{ color: "var(--da-text)", fontSize: 14, fontWeight: 600, margin: 0 }}>
                Scheduler aktiv
              </p>
              <p style={{ color: "var(--da-muted)", fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
                Wenn aktiv: automatischer Refresh täglich zur gewählten Uhrzeit (Schweizer Zeit, Sommerzeit-aware).
                Master-Switch <code style={{ background: "var(--da-dark)", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>NEWS_TICKER_CRON_ENABLED</code> über Vercel-Env muss zusätzlich auf <code style={{ background: "var(--da-dark)", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>true</code> stehen.
              </p>
            </div>
          </label>

          <div>
            <p style={{ color: "var(--da-text)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Uhrzeit (Schweizer Zeit)
            </p>
            <select
              value={settings.scheduled_hour_cet}
              onChange={(e) =>
                setSettings({ ...settings, scheduled_hour_cet: parseInt(e.target.value, 10) })
              }
              disabled={pending || !settings.scheduler_enabled}
              style={{ ...inputStyle, width: 120, fontFamily: "var(--da-font-mono)" }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" style={{ color: "#ff8e8e", fontSize: 12, margin: 0 }}>{error}</p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: "1px solid var(--da-border)" }}>
          <button
            type="button"
            onClick={() => save()}
            disabled={pending || !dirty}
            style={{
              background: "var(--da-green)",
              color: "var(--da-dark)",
              border: "none",
              borderRadius: 4,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: pending || !dirty ? "not-allowed" : "pointer",
              opacity: pending || !dirty ? 0.6 : 1,
              fontFamily: "inherit",
            }}
          >
            {pending ? "…" : "Einstellungen speichern"}
          </button>
        </div>
      </div>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--da-dark)",
  color: "var(--da-text)",
  border: "1px solid var(--da-border)",
  borderRadius: 4,
  padding: "9px 12px",
  fontSize: 13,
  fontFamily: "inherit",
};

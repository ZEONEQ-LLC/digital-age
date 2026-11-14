"use client";

import { useId, useState, useTransition } from "react";
import { saveTickerSettings, type TickerSettings } from "@/lib/newsTickerActions";
import { unwrapAction } from "@/lib/actionResult";
import { describeHours, formatHour, toggleHour } from "@/lib/newsTicker/schedule";

type Props = {
  initial: TickerSettings;
};

const SPEEDS = ["slow", "normal", "fast"] as const;

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
  // Eindeutige id pro Instanz (useId), damit Label und Select auch bei
  // mehrfachem Mount zusammenbleiben.
  const speedId = useId();

  // ticker_speed speichert sofort (changeSpeed), zaehlt hier nicht mit.
  const dirty =
    settings.items_per_source !== initial.items_per_source ||
    settings.is_paused !== initial.is_paused ||
    settings.scheduler_enabled !== initial.scheduler_enabled ||
    settings.scheduled_hours_cet.join(",") !== initial.scheduled_hours_cet.join(",");
  const noHours = settings.scheduled_hours_cet.length === 0;

  function save(next?: TickerSettings) {
    const toSave = next ?? settings;
    setError(null);
    setSavedHint(null);
    startTransition(async () => {
      try {
        unwrapAction(await saveTickerSettings(toSave));
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

  // Geschwindigkeit speichert ebenfalls sofort.
  function changeSpeed(value: string) {
    const speed = SPEEDS.find((s) => s === value);
    if (!speed) return;
    const next = { ...settings, ticker_speed: speed };
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
          <label
            htmlFor={speedId}
            style={{ display: "block", color: "var(--da-text)", fontSize: 14, fontWeight: 600, marginBottom: 8 }}
          >
            Geschwindigkeit
          </label>
          <select
            id={speedId}
            value={settings.ticker_speed}
            onChange={(e) => changeSpeed(e.target.value)}
            disabled={pending}
            style={{ ...inputStyle, width: 160 }}
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {SPEED_LABELS[s]}
              </option>
            ))}
          </select>
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
                Wenn aktiv: automatischer Refresh täglich zu den gewählten Uhrzeiten (Schweizer Zeit, Sommerzeit-aware).
                Master-Switch <code style={{ background: "var(--da-dark)", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>NEWS_TICKER_CRON_ENABLED</code> über Vercel-Env muss zusätzlich auf <code style={{ background: "var(--da-dark)", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>true</code> stehen.
              </p>
            </div>
          </label>

          <div>
            <p style={{ color: "var(--da-text)", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              Laufzeiten (Schweizer Zeit)
            </p>
            <p style={{ color: "var(--da-muted)", fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
              Mehrere Stunden wählbar. KI-Kosten entstehen pro neuer Meldung, nicht pro Lauf: Was schon
              übernommen oder aussortiert ist, wird nicht erneut beurteilt.
            </p>
            <div role="group" aria-label="Laufzeiten" className="nt-hours">
              {Array.from({ length: 24 }, (_, h) => {
                const on = settings.scheduled_hours_cet.includes(h);
                return (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${formatHour(h)} Uhr`}
                    className={`nt-hour${on ? " nt-hour--on" : ""}`}
                    disabled={pending || !settings.scheduler_enabled}
                    onClick={() =>
                      setSettings({ ...settings, scheduled_hours_cet: toggleHour(settings.scheduled_hours_cet, h) })
                    }
                  >
                    {String(h).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
            <p
              role={noHours ? "alert" : undefined}
              style={{ color: noHours ? "var(--da-orange)" : "var(--da-muted)", fontSize: 12, marginTop: 10, lineHeight: 1.5 }}
            >
              {noHours
                ? "Bitte mindestens eine Laufzeit wählen."
                : `Läuft täglich um ${describeHours(settings.scheduled_hours_cet)}.`}
            </p>
            <style>{`
              .nt-hours { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px; max-width: 520px; }
              .nt-hour {
                background: var(--da-dark); color: var(--da-muted); border: 1px solid var(--da-border);
                border-radius: 4px; padding: 7px 0; font-family: var(--da-font-mono); font-size: 12px;
                font-variant-numeric: tabular-nums; cursor: pointer; transition: border-color 0.15s, color 0.15s;
              }
              .nt-hour:hover:not(:disabled) { border-color: var(--da-muted); color: var(--da-text); }
              .nt-hour:focus-visible { outline: 2px solid var(--da-green); outline-offset: 2px; }
              .nt-hour--on { background: var(--da-green); border-color: var(--da-green); color: var(--da-dark); font-weight: 700; }
              .nt-hour--on:hover:not(:disabled) { border-color: var(--da-green); color: var(--da-dark); }
              .nt-hour:disabled { cursor: not-allowed; opacity: 0.5; }
              @media (max-width: 560px) { .nt-hours { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
            `}</style>
          </div>
        </div>

        {error && (
          <p role="alert" style={{ color: "#ff8e8e", fontSize: 12, margin: 0 }}>{error}</p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: "1px solid var(--da-border)" }}>
          <button
            type="button"
            onClick={() => save()}
            disabled={pending || !dirty || noHours}
            style={{
              background: "var(--da-green)",
              color: "var(--da-dark)",
              border: "none",
              borderRadius: 4,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: pending || !dirty || noHours ? "not-allowed" : "pointer",
              opacity: pending || !dirty || noHours ? 0.6 : 1,
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

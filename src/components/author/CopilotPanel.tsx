"use client";

import AuthorCard from "./AuthorCard";
import MonoCaption from "./MonoCaption";
import {
  copilotStepLabel,
  summarizeCopilotReport,
  type CopilotReport,
  type CopilotStep,
} from "@/lib/copilot";

type CopilotPanelProps = {
  running: boolean;
  // Live-Schritte des aktuellen/letzten Laufs (leer vor dem ersten Lauf).
  steps: CopilotStep[];
  // Persistierter Report (article.copilot_last_run) beim Laden, oder null.
  lastRun: CopilotReport | null;
  disabled: boolean;
  onRun: () => void;
};

function statusDot(status: CopilotStep["status"] | "running"): string {
  if (status === "ok") return "var(--da-green)";
  if (status === "failed") return "#ff8e8e";
  if (status === "skipped") return "var(--da-muted-soft)";
  return "var(--da-purple, #dcd6f7)"; // running
}

function statusText(status: CopilotStep["status"]): string {
  if (status === "ok") return "ok";
  if (status === "failed") return "fehlgeschlagen";
  return "übersprungen";
}

function formatTime(iso: string): string {
  // Nur Datum + HH:MM, lokal. Kein Date.now-Bedarf.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CopilotPanel({
  running,
  steps,
  lastRun,
  disabled,
  onRun,
}: CopilotPanelProps) {
  const showSteps = running || steps.length > 0;

  return (
    <AuthorCard padding={18}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <MonoCaption>Co-Pilot</MonoCaption>
          <p style={{ color: "var(--da-muted)", fontSize: 12, margin: "2px 0 0", lineHeight: 1.5 }}>
            SEO generieren &amp; setzen, Analyse, Highlights anwenden, Bild-ALT — in einem Lauf.
          </p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={disabled}
          style={{
            background: "var(--da-purple, #dcd6f7)",
            color: "var(--da-dark)",
            border: "none",
            borderRadius: 4,
            padding: "9px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            fontFamily: "inherit",
            flex: "0 0 auto",
          }}
        >
          {running ? "Co-Pilot läuft…" : "Co-Pilot ausführen"}
        </button>
      </div>

      {showSteps && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusDot(s.status), flex: "0 0 auto", alignSelf: "center" }} />
              <span style={{ color: "var(--da-text)", fontSize: 12, fontWeight: 600, minWidth: 130 }}>
                {copilotStepLabel(s.step)}
              </span>
              <span style={{ color: "var(--da-muted-soft)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
                {statusText(s.status)}
                {s.detail ? ` — ${s.detail}` : ""}
              </span>
            </div>
          ))}
          {running && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusDot("running"), flex: "0 0 auto" }} />
              <span style={{ color: "var(--da-muted)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>läuft…</span>
            </div>
          )}
        </div>
      )}

      {!running && !showSteps && lastRun && (
        <p style={{ color: "var(--da-muted-soft)", fontSize: 11, fontFamily: "var(--da-font-mono)", margin: "12px 0 0" }}>
          Letzter Co-Pilot-Lauf: {formatTime(lastRun.finished_at)} — {summarizeCopilotReport(lastRun)}
        </p>
      )}
    </AuthorCard>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unwrapAction } from "@/lib/actionResult";
import { runPromptGenerationNow } from "@/lib/aiJobs/actions";

// Leiste fuer den woechentlichen Job «Prompts der KI-Redaktion» (PR 197).
export default function PromptJobBar({ lastRun }: { lastRun: string | null }) {
  const router = useRouter();
  const [running, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function runNow() {
    if (!window.confirm("Jetzt drei neue Prompts erstellen und sofort veröffentlichen?")) return;
    setMsg(null);
    start(async () => {
      try {
        const r = unwrapAction(await runPromptGenerationNow());
        const text = `${r.created} ${r.created === 1 ? "Prompt" : "Prompts"} veröffentlicht.`;
        setMsg(r.errors.length > 0 ? { ok: r.created > 0, text: `${text} Hinweise: ${r.errors.join(" · ")}` } : { ok: true, text });
        router.refresh();
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "Lauf fehlgeschlagen." });
      }
    });
  }

  return (
    <div className="pjb">
      <style>{`
        .pjb {
          display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
          background: var(--da-card); border: 1px solid var(--da-border); border-radius: 8px;
          padding: 14px 18px; margin-bottom: 20px;
        }
        .pjb__text { flex: 1; min-width: 240px; color: var(--da-text); font-size: 13px; line-height: 1.5; }
        .pjb__meta { display: block; color: var(--da-muted); font-size: 12px; font-family: var(--da-font-mono); margin-top: 2px; }
        .pjb__btn {
          background: transparent; color: var(--da-green); border: 1px solid var(--da-green); border-radius: 4px;
          padding: 7px 14px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
        }
        .pjb__btn:disabled { opacity: 0.6; cursor: wait; }
        .pjb__msg { flex-basis: 100%; font-size: 12px; }
      `}</style>
      <div className="pjb__text">
        <strong>KI-Redaktion:</strong> Jeden Mittwoch früh erscheinen drei neue Prompts, gekennzeichnet und mit echtem Beispiel-Output. Du bekommst eine Mail; Unpassendes hier archivieren.
        <span className="pjb__meta">Letzter Lauf: {lastRun ?? "noch keiner"}</span>
      </div>
      <button type="button" className="pjb__btn" onClick={runNow} disabled={running}>
        {running ? "Erstelle… (bis 3 Minuten)" : "Jetzt erstellen"}
      </button>
      {msg && <span role={msg.ok ? "status" : "alert"} className="pjb__msg" style={{ color: msg.ok ? "var(--da-green)" : "#ff8e8e" }}>{msg.text}</span>}
    </div>
  );
}

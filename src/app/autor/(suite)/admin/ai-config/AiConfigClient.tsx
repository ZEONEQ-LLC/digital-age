"use client";

import { useEffect, useState, useTransition } from "react";
import { saveAiConfig } from "@/lib/ai/configActions";
import type { AiTask } from "@/lib/ai/types";

type Props = {
  initialSystemPrompt: string;
  initialDefaultModel: string;
  initialTaskOverrides: Partial<Record<AiTask, string>>;
  taskLabels: Record<AiTask, string>;
  lastUpdatedAt: string | null;
};

function formatDateTimeDE(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AiConfigClient({
  initialSystemPrompt,
  initialDefaultModel,
  initialTaskOverrides,
  taskLabels,
  lastUpdatedAt,
}: Props) {
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
  const [defaultModel, setDefaultModel] = useState(initialDefaultModel);
  const [overrides, setOverrides] = useState<Partial<Record<AiTask, string>>>(
    initialTaskOverrides,
  );
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function setOverride(task: AiTask, value: string) {
    setOverrides((prev) => ({ ...prev, [task]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveAiConfig({
        systemPrompt,
        defaultModel,
        taskModelOverrides: overrides,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setToast("Konfiguration gespeichert.");
    });
  }

  return (
    <>
      <style>{`
        .aic-form {
          display: flex; flex-direction: column; gap: 24px;
          max-width: 760px;
        }
        .aic-card {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 8px;
          padding: 22px;
        }
        .aic-label {
          display: block;
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .aic-hint {
          color: var(--da-muted-soft);
          font-size: 12px;
          line-height: 1.55;
          margin-top: 8px;
        }
        .aic-textarea, .aic-input {
          width: 100%;
          background: var(--da-dark);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 10px 12px;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          box-sizing: border-box;
        }
        .aic-textarea { min-height: 180px; line-height: 1.55; }
        .aic-task-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 16px;
        }
        @media (max-width: 720px) {
          .aic-task-grid { grid-template-columns: 1fr; }
        }
        .aic-task-row {
          display: flex; flex-direction: column; gap: 4px;
        }
        .aic-task-label {
          color: var(--da-text-strong);
          font-size: 12px;
          font-weight: 600;
        }
        .aic-task-key {
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 10px;
          letter-spacing: 0.06em;
        }
        .aic-meta {
          color: var(--da-muted);
          font-size: 12px;
          font-family: var(--da-font-mono);
        }
        .aic-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .aic-submit {
          background: var(--da-green);
          color: var(--da-dark);
          border: none;
          padding: 10px 18px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }
        .aic-submit:disabled { opacity: 0.55; cursor: wait; }
        .aic-error {
          background: rgba(255,107,107,0.10);
          border: 1px solid #ff6b6b;
          color: #ff8e8e;
          font-size: 13px;
          padding: 10px 14px;
          border-radius: 4px;
        }
      `}</style>

      <form className="aic-form" onSubmit={handleSubmit}>
        <div className="aic-card">
          <label className="aic-label" htmlFor="aic-system-prompt">
            Systemprompt (global)
          </label>
          <textarea
            id="aic-system-prompt"
            className="aic-textarea"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="z.B. Du bist der Redaktions-Assistent von digital-age — schreibe knapp, sachlich, ohne Hype, Schweizer Rechtschreibung."
          />
          <p className="aic-hint">
            Wird jedem AI-Call als System-Message vorangestellt. Der
            aufrufende Code (z.B. ein Button-Handler) hängt seinen
            task-spezifischen Systemtext danach an, getrennt durch zwei
            Zeilenumbrüche.
          </p>
        </div>

        <div className="aic-card">
          <label className="aic-label" htmlFor="aic-default-model">
            Default-Modell
          </label>
          <input
            id="aic-default-model"
            type="text"
            className="aic-input"
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            placeholder="z.B. claude-haiku-4-5"
          />
          <p className="aic-hint">
            Wird verwendet wenn für eine Task kein Override gesetzt ist.
            Beispiele: <code>claude-haiku-4-5</code>,{" "}
            <code>claude-sonnet-4-6</code>, <code>claude-opus-4-7</code>.
          </p>
        </div>

        <div className="aic-card">
          <p
            className="aic-label"
            style={{ marginBottom: 14, color: "var(--da-text-strong)" }}
          >
            Modell-Overrides pro Task
          </p>
          <div className="aic-task-grid">
            {(Object.keys(taskLabels) as AiTask[]).map((task) => (
              <div key={task} className="aic-task-row">
                <span className="aic-task-label">{taskLabels[task]}</span>
                <span className="aic-task-key">{task}</span>
                <input
                  type="text"
                  className="aic-input"
                  value={overrides[task] ?? ""}
                  onChange={(e) => setOverride(task, e.target.value)}
                  placeholder="leer = Default verwenden"
                />
              </div>
            ))}
          </div>
          <p className="aic-hint">
            Leer lassen, wenn diese Task das Default-Modell nutzen soll.
            Unbekannte Werte werden serverseitig defensiv ignoriert.
          </p>
        </div>

        {error && <div className="aic-error">{error}</div>}

        <div className="aic-actions">
          <button type="submit" className="aic-submit" disabled={pending}>
            {pending ? "Speichere…" : "Speichern"}
          </button>
          <span className="aic-meta">
            Zuletzt geändert: {formatDateTimeDE(lastUpdatedAt)}
          </span>
        </div>
      </form>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "var(--da-green)",
            color: "var(--da-dark)",
            padding: "12px 18px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            zIndex: 200,
            fontFamily: "var(--da-font-body)",
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}

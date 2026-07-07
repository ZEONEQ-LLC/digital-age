"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { saveAiConfig } from "@/lib/ai/configActions";
import type { AiTask } from "@/lib/ai/types";
import { KNOWN_MODELS, isKnownModel } from "@/lib/ai/models";

type TaskGroup = { id: string; label: string; tasks: AiTask[] };

type PromptEntry = { id: string; label: string; placeholder: string };

type Props = {
  initialSystemPrompt: string;
  initialDefaultModel: string;
  initialTaskOverrides: Partial<Record<AiTask, string>>;
  taskLabels: Record<AiTask, string>;
  taskGroups: TaskGroup[];
  // Editierbare Strategie-Prompts: id + Label + Code-Default (Placeholder).
  promptEntries: PromptEntry[];
  initialPromptOverrides: Record<string, string>;
  lastUpdatedAt: string | null;
};

// Sentinel-Wert für „Default verwenden" im Override-Dropdown. Wird beim
// Save zu einem leeren String — saveAiConfig droppt leere Strings, der
// JSON-Key fällt damit aus dem Override-Objekt raus (Resolver fällt auf
// default_model zurück). Ein echter Modell-String darf diesen Sentinel
// nicht enthalten.
const USE_DEFAULT = "__use_default__";

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
  taskGroups,
  promptEntries,
  initialPromptOverrides,
  lastUpdatedAt,
}: Props) {
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
  const [defaultModel, setDefaultModel] = useState(initialDefaultModel);
  const [overrides, setOverrides] = useState<Partial<Record<AiTask, string>>>(
    initialTaskOverrides,
  );
  const [promptOverrides, setPromptOverrides] = useState<
    Record<string, string>
  >(initialPromptOverrides);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function setOverride(task: AiTask, value: string) {
    setOverrides((prev) => {
      const next = { ...prev };
      if (value === USE_DEFAULT) {
        delete next[task];
      } else {
        next[task] = value;
      }
      return next;
    });
  }

  // Strategie-Prompt-Override setzen. Leerer String bleibt im State (wird beim
  // Save gedroppt) → Feld leer = Code-Default.
  function setPromptOverride(id: string, value: string) {
    setPromptOverrides((prev) => ({ ...prev, [id]: value }));
  }

  // Alle Modell-Strings, die aktuell irgendwo gesetzt sind (Default oder
  // Overrides) und NICHT in der kuratierten Liste stehen. Werden als
  // zusätzliche Dropdown-Option mit "(unbekannt)"-Suffix angeboten —
  // damit der Editor sieht, dass da ein Altbestand-/Tippfehler-Wert
  // steht, ohne dass er still verschluckt wird.
  const unknownModels = useMemo(() => {
    const acc = new Set<string>();
    if (defaultModel && !isKnownModel(defaultModel)) acc.add(defaultModel);
    for (const v of Object.values(overrides)) {
      if (typeof v === "string" && v !== "" && !isKnownModel(v)) acc.add(v);
    }
    return Array.from(acc);
  }, [defaultModel, overrides]);

  const defaultModelIsUnknown =
    defaultModel !== "" && !isKnownModel(defaultModel);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveAiConfig({
        systemPrompt,
        defaultModel,
        taskModelOverrides: overrides,
        taskPromptOverrides: promptOverrides,
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
        .aic-select {
          width: 100%;
          background: var(--da-dark);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 9px 12px;
          font-size: 13px;
          font-family: inherit;
          box-sizing: border-box;
          cursor: pointer;
        }
        .aic-select:focus { outline: 1px solid var(--da-green); }
        .aic-select--warn {
          border-color: var(--da-orange);
          color: var(--da-orange);
        }
        .aic-group-title {
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin: 18px 0 10px;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--da-border);
        }
        .aic-group-title:first-of-type { margin-top: 0; }
        .aic-warn-line {
          color: var(--da-orange);
          font-size: 11px;
          font-family: var(--da-font-mono);
          margin-top: 2px;
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
        .aic-badge {
          display: inline-block;
          margin-left: 8px;
          color: var(--da-green);
          background: rgba(50,255,126,0.12);
          border: 1px solid var(--da-green);
          font-family: var(--da-font-mono);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 1px 6px;
          border-radius: 3px;
          vertical-align: middle;
        }
        .aic-reset {
          background: transparent;
          color: var(--da-muted-soft);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 4px 10px;
          font-size: 11px;
          font-family: inherit;
          cursor: pointer;
          flex: 0 0 auto;
        }
        .aic-reset:hover:not(:disabled) { color: var(--da-text); }
        .aic-reset:disabled { opacity: 0.4; cursor: not-allowed; }
        .aic-prompt-textarea {
          width: 100%;
          background: var(--da-dark);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 10px 12px;
          font-size: 12px;
          font-family: var(--da-font-mono);
          line-height: 1.5;
          resize: vertical;
          min-height: 150px;
          box-sizing: border-box;
          margin-top: 6px;
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
          <select
            id="aic-default-model"
            className={`aic-select${defaultModelIsUnknown ? " aic-select--warn" : ""}`}
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
          >
            {KNOWN_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
            {defaultModelIsUnknown && (
              <option value={defaultModel}>
                {defaultModel} (unbekannt)
              </option>
            )}
          </select>
          {defaultModelIsUnknown && (
            <p className="aic-warn-line">
              Aktueller Wert nicht in der kuratierten Liste — bitte
              prüfen und ggf. auf ein bekanntes Modell umstellen.
            </p>
          )}
          <p className="aic-hint">
            Wird verwendet, wenn für eine Task kein Override gesetzt ist.
            Die Modell-Liste ist kuratiert in{" "}
            <code>src/lib/ai/models.ts</code> gepflegt — neue Modelle
            werden dort als ein-Zeilen-PR ergänzt.
          </p>
        </div>

        <div className="aic-card">
          <p
            className="aic-label"
            style={{ marginBottom: 14, color: "var(--da-text-strong)" }}
          >
            Modell-Overrides pro Task
          </p>
          {taskGroups.map((group) => (
            <div key={group.id}>
              <p className="aic-group-title">{group.label}</p>
              <div className="aic-task-grid">
                {group.tasks.map((task) => {
                  const current = overrides[task] ?? "";
                  const selectValue = current === "" ? USE_DEFAULT : current;
                  const isUnknown = current !== "" && !isKnownModel(current);
                  return (
                    <div key={task} className="aic-task-row">
                      <span className="aic-task-label">{taskLabels[task]}</span>
                      <span className="aic-task-key">{task}</span>
                      <select
                        className={`aic-select${isUnknown ? " aic-select--warn" : ""}`}
                        value={selectValue}
                        onChange={(e) => setOverride(task, e.target.value)}
                        aria-label={`Modell für ${taskLabels[task]}`}
                      >
                        <option value={USE_DEFAULT}>Default verwenden</option>
                        {KNOWN_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                        {isUnknown && (
                          <option value={current}>
                            {current} (unbekannt)
                          </option>
                        )}
                      </select>
                      {isUnknown && (
                        <span className="aic-warn-line">
                          Nicht in der kuratierten Liste — bitte prüfen.
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {unknownModels.length > 0 && (
            <p className="aic-warn-line" style={{ marginTop: 14 }}>
              {unknownModels.length} unbekannte(r) Modell-Wert(e) in der
              Konfiguration: {unknownModels.join(", ")}
            </p>
          )}
          <p className="aic-hint">
            „Default verwenden“ entfernt den Override und nutzt das
            global gesetzte Default-Modell für diese Task. Speicher-
            Format unverändert (JSON in <code>task_model_overrides</code>).
          </p>
        </div>

        <div className="aic-card">
          <p
            className="aic-label"
            style={{ marginBottom: 6, color: "var(--da-text-strong)" }}
          >
            Task-Prompts (Strategie)
          </p>
          <p className="aic-hint" style={{ marginTop: 0, marginBottom: 16 }}>
            Nur Strategie &amp; Ton bearbeiten. Das Ausgabeformat (JSON) wird
            vom Code erzwungen — Format- oder Sprach-Anweisungen hier können die
            automatische Auswertung stören und zu „Antwort konnte nicht
            ausgelesen werden“ führen. Leeres Feld = Code-Standard (als
            Platzhalter angezeigt).
          </p>
          {promptEntries.map((entry) => {
            const value = promptOverrides[entry.id] ?? "";
            const customized = value.trim() !== "";
            return (
              <div key={entry.id} style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span className="aic-task-label">
                    {entry.label}
                    {customized && <span className="aic-badge">angepasst</span>}
                  </span>
                  <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
                    <button
                      type="button"
                      className="aic-reset"
                      disabled={customized}
                      onClick={() => setPromptOverride(entry.id, entry.placeholder)}
                      title="Kopiert den Code-Default ins Feld — danach editierbar (gilt als Override)."
                    >
                      Default in Feld übernehmen
                    </button>
                    <button
                      type="button"
                      className="aic-reset"
                      disabled={!customized}
                      onClick={() => setPromptOverride(entry.id, "")}
                    >
                      Auf Default zurücksetzen
                    </button>
                  </div>
                </div>
                <span className="aic-task-key">{entry.id}</span>
                <textarea
                  className="aic-prompt-textarea"
                  value={value}
                  placeholder={entry.placeholder}
                  onChange={(e) => setPromptOverride(entry.id, e.target.value)}
                  aria-label={`Strategie-Prompt für ${entry.label}`}
                />
              </div>
            );
          })}
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

"use client";

import { useId, useState, useTransition } from "react";
import { saveGenerationPrompt } from "@/lib/newsTickerActions";
import { saveNewsTickerModel } from "@/lib/ai/configActions";
import { KNOWN_MODELS, isKnownModel } from "@/lib/ai/models";
import { unwrapAction } from "@/lib/actionResult";

type Props = {
  initialPrompt: string;
  lastRefreshLabel: string;
  // Modell-Override fuer news_item_generation ("" = Standard).
  initialModel: string;
  // Standard-Modell der AI-Konfiguration (nur Anzeige).
  defaultModel: string;
};

function modelLabel(id: string): string {
  return KNOWN_MODELS.find((m) => m.id === id)?.label ?? id;
}

export default function PromptSection({ initialPrompt, lastRefreshLabel, initialModel, defaultModel }: Props) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [model, setModel] = useState(initialModel);
  const [modelHint, setModelHint] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelPending, startModelTransition] = useTransition();
  const modelId = useId();
  const modelIsUnknown = model !== "" && !isKnownModel(model);

  // Modell speichert sofort (wie die Geschwindigkeit in den Einstellungen).
  function changeModel(next: string) {
    const previous = model;
    setModel(next);
    setModelError(null);
    setModelHint(null);
    startModelTransition(async () => {
      try {
        unwrapAction(await saveNewsTickerModel(next));
        setModelHint("Gespeichert");
      } catch (e) {
        setModel(previous);
        setModelError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  const dirty = prompt !== initialPrompt;

  function handleSave() {
    setError(null);
    setSavedHint(null);
    startTransition(async () => {
      try {
        unwrapAction(await saveGenerationPrompt(prompt));
        setSavedHint("Gespeichert");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h2 style={{ color: "var(--da-text)", fontSize: 18, fontWeight: 700 }}>Prompt &amp; Modell</h2>
        <span style={{ color: "var(--da-muted)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
          Letztes Refresh: {lastRefreshLabel}
        </span>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label
          htmlFor={modelId}
          style={{ display: "block", color: "var(--da-text)", fontSize: 14, fontWeight: 600, marginBottom: 8 }}
        >
          Modell
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <select
            id={modelId}
            value={model}
            onChange={(e) => changeModel(e.target.value)}
            disabled={modelPending}
            style={{
              background: "var(--da-dark)",
              color: "var(--da-text)",
              border: `1px solid ${modelIsUnknown ? "var(--da-orange)" : "var(--da-border)"}`,
              borderRadius: 4,
              padding: "9px 12px",
              fontSize: 13,
              fontFamily: "inherit",
              maxWidth: "100%",
            }}
          >
            <option value="">
              Standard{defaultModel ? ` (${modelLabel(defaultModel)})` : ""}
            </option>
            {KNOWN_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
            {modelIsUnknown && <option value={model}>{model} (unbekannt)</option>}
          </select>
          {modelHint && !modelPending && (
            <span style={{ color: "var(--da-muted)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>{modelHint}</span>
          )}
        </div>
        <p style={{ color: "var(--da-muted)", fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
          Gilt für jeden Ticker-Eintrag beim nächsten Refresh. «Standard» nimmt das Standard-Modell der AI-Konfiguration.
        </p>
        {modelError && (
          <p role="alert" style={{ color: "#ff8e8e", fontSize: 12, marginTop: 6 }}>{modelError}</p>
        )}
      </div>

      <p style={{ color: "var(--da-muted)", fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
        Anweisung für den KI-Aufruf, der aus jedem RSS-Eintrag einen Ticker-Eintrag macht (Titel, Teaser, Rubrik) oder ihn als unpassend aussortiert.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={18}
        style={{
          width: "100%",
          background: "var(--da-dark)",
          color: "var(--da-text)",
          border: "1px solid var(--da-border)",
          borderRadius: 4,
          padding: "12px 14px",
          fontSize: 13,
          fontFamily: "var(--da-font-mono)",
          lineHeight: 1.55,
          resize: "vertical",
        }}
      />

      {error && (
        <p role="alert" style={{ color: "#ff8e8e", fontSize: 12, marginTop: 8 }}>{error}</p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12, alignItems: "center" }}>
        {savedHint && !dirty && (
          <span style={{ color: "var(--da-muted)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>{savedHint}</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !dirty || prompt.trim() === ""}
          style={{
            background: "var(--da-green)",
            color: "var(--da-dark)",
            border: "none",
            borderRadius: 4,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: pending || !dirty ? "not-allowed" : "pointer",
            opacity: pending || !dirty || prompt.trim() === "" ? 0.6 : 1,
            fontFamily: "inherit",
          }}
        >
          {pending ? "…" : "Prompt speichern"}
        </button>
      </div>
    </section>
  );
}

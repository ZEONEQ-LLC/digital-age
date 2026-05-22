"use client";

import { useState, useTransition } from "react";
import { saveGenerationPrompt } from "@/lib/newsTickerActions";

type Props = {
  initialPrompt: string;
  lastRefreshLabel: string;
};

export default function PromptSection({ initialPrompt, lastRefreshLabel }: Props) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = prompt !== initialPrompt;

  function handleSave() {
    setError(null);
    setSavedHint(null);
    startTransition(async () => {
      try {
        await saveGenerationPrompt(prompt);
        setSavedHint("Gespeichert");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h2 style={{ color: "var(--da-text)", fontSize: 18, fontWeight: 700 }}>Prompt</h2>
        <span style={{ color: "var(--da-muted)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
          Letztes Refresh: {lastRefreshLabel}
        </span>
      </div>

      <p style={{ color: "var(--da-muted)", fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
        Anweisung für den LLM-Call, der RSS-Items in Ticker-Einträge umformt. Wird in Phase 2 aktiv.
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

// TEMPORAER — wird in A1b entfernt.

"use client";

import { useState, useTransition } from "react";
import { runAiSmokeTest } from "@/lib/ai/smokeTest";
import type { AiResult } from "@/lib/ai/types";

export default function AiTestClient() {
  const [result, setResult] = useState<AiResult | null>(null);
  const [pending, startTransition] = useTransition();

  function runTest() {
    setResult(null);
    startTransition(async () => {
      const r = await runAiSmokeTest();
      setResult(r);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={runTest}
        disabled={pending}
        style={{
          background: "var(--da-green)",
          color: "var(--da-dark)",
          border: "none",
          padding: "10px 18px",
          borderRadius: 4,
          fontSize: 14,
          fontWeight: 700,
          cursor: pending ? "wait" : "pointer",
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? "Läuft…" : "Smoke-Test ausführen"}
      </button>

      {result && (
        <div
          style={{
            marginTop: 24,
            background: "var(--da-card)",
            border: `1px solid ${result.ok ? "var(--da-green)" : "#ff6b6b"}`,
            borderRadius: 6,
            padding: 18,
            fontFamily: "var(--da-font-mono)",
            fontSize: 13,
            lineHeight: 1.7,
            color: "var(--da-text)",
          }}
        >
          {result.ok ? (
            <>
              <div style={{ color: "var(--da-green)", marginBottom: 8 }}>
                ✓ Erfolg
              </div>
              <div>
                <strong>Provider:</strong> {result.provider}
              </div>
              <div>
                <strong>Model:</strong> {result.model}
              </div>
              <div>
                <strong>Input-Tokens:</strong> {result.inputTokens}
              </div>
              <div>
                <strong>Output-Tokens:</strong> {result.outputTokens}
              </div>
              <div style={{ marginTop: 12 }}>
                <strong>Antwort:</strong>
              </div>
              <pre
                style={{
                  margin: "6px 0 0",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "var(--da-text-strong)",
                }}
              >
                {result.text}
              </pre>
            </>
          ) : (
            <>
              <div style={{ color: "#ff8e8e", marginBottom: 8 }}>
                ✗ Fehler
              </div>
              <div>
                <strong>Kind:</strong> {result.kind}
              </div>
              <div>
                <strong>Message:</strong> {result.message}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

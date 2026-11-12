"use client";

import { useState, useTransition } from "react";
import { endForwardingByToken } from "@/lib/startupContact/actions";

export default function EndForwardingButton({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function confirm() {
    start(async () => {
      const res = await endForwardingByToken(token);
      setResult(
        res.ok
          ? { ok: true, text: `Erledigt: Anfragen werden nicht mehr an ${res.startupName} weitergeleitet.` }
          : { ok: false, text: res.message },
      );
    });
  }

  if (result?.ok) {
    return (
      <p role="status" style={{ color: "var(--da-green)", fontSize: 16, lineHeight: 1.6, margin: 0 }}>
        {result.text}
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
      <button
        type="button"
        onClick={confirm}
        disabled={pending}
        style={{
          background: "var(--da-green)",
          color: "var(--da-dark)",
          border: "none",
          borderRadius: "var(--r-sm)",
          padding: "13px 26px",
          fontSize: 15,
          fontWeight: 700,
          cursor: pending ? "wait" : "pointer",
          opacity: pending ? 0.7 : 1,
          fontFamily: "inherit",
        }}
      >
        {pending ? "…" : "Weiterleitung beenden"}
      </button>
      {result && !result.ok && (
        <p role="alert" style={{ color: "#ff8e8e", fontSize: 14, margin: 0 }}>{result.text}</p>
      )}
    </div>
  );
}

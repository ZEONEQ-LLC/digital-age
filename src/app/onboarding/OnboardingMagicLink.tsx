"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "loading" | "sent" | "error";

export default function OnboardingMagicLink({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div style={{
        background: "var(--da-dark)", border: "1px solid var(--da-green)",
        borderRadius: 4, padding: 16, color: "var(--da-text)",
      }}>
        <p style={{
          color: "var(--da-green)", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          fontFamily: "var(--da-font-mono)", marginBottom: 8,
        }}>
          Magic Link unterwegs
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>
          Wir haben dir einen Login-Link an <strong>{email}</strong> geschickt. Klick darauf, um den Account zu aktivieren.
          Falls die Mail nicht in der Inbox ist, prüfe den Spam-Ordner.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        background: "var(--da-dark)", border: "1px solid var(--da-border)",
        borderRadius: 4, padding: "12px 14px", marginBottom: 14,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ color: "var(--da-text)", fontSize: 14 }}>{email}</span>
        <span style={{ color: "var(--da-faint)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>aus Einladung</span>
      </div>
      {errorMsg && (
        <p style={{ color: "#ff8080", fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        style={{
          width: "100%", background: "var(--da-green)", color: "var(--da-dark)",
          border: "none", padding: 14, borderRadius: 4,
          fontSize: 15, fontWeight: 700,
          cursor: status === "loading" ? "wait" : "pointer",
          opacity: status === "loading" ? 0.7 : 1,
        }}
      >
        {status === "loading" ? "Sende Magic Link…" : "Magic Link anfordern"}
      </button>
    </form>
  );
}

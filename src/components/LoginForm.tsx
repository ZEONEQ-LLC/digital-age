"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "var(--da-dark)",
  color: "var(--da-text)",
  border: "1px solid var(--da-border)",
  borderRadius: "4px",
  padding: "14px 16px",
  fontSize: "15px",
  fontFamily: "Inter, sans-serif",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "var(--da-text-strong)",
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "8px",
};

type Status = "idle" | "loading" | "sent" | "error";

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>(initialError ? "error" : "idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(
    initialError === "auth_failed"
      ? "Der Magic-Link war ungültig oder abgelaufen. Bitte erneut anfordern."
      : null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setErrorMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
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
      <div
        style={{
          backgroundColor: "var(--da-card)",
          border: "1px solid var(--da-border)",
          borderRadius: "8px",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "var(--da-green)",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "12px",
            fontFamily: "var(--da-font-mono)",
          }}
        >
          Magic Link unterwegs
        </div>
        <h2
          style={{
            color: "var(--da-text)",
            fontSize: "20px",
            fontWeight: 700,
            fontFamily: "Space Grotesk, sans-serif",
            marginBottom: "12px",
          }}
        >
          Check deine Inbox
        </h2>
        <p style={{ color: "var(--da-muted)", fontSize: "14px", lineHeight: 1.6 }}>
          Wir haben dir einen Login-Link an <strong style={{ color: "var(--da-text)" }}>{email}</strong> geschickt.
          Klicke darauf, um dich einzuloggen. Falls die Mail nicht in der Inbox ist, prüfe den Spam-Ordner.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setEmail("");
          }}
          style={{
            marginTop: "20px",
            background: "transparent",
            color: "var(--da-muted)",
            border: "none",
            fontSize: "13px",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Andere E-Mail verwenden
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: "var(--da-card)",
        border: "1px solid var(--da-border)",
        borderRadius: "8px",
        padding: "32px",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <label style={labelStyle} htmlFor="login-email">E-Mail</label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          placeholder="du@beispiel.ch"
          disabled={status === "loading"}
        />
      </div>

      {errorMsg && (
        <p
          style={{
            color: "var(--da-orange, #ff6b00)",
            fontSize: "13px",
            marginBottom: "16px",
            lineHeight: 1.5,
          }}
        >
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading" || !email}
        style={{
          backgroundColor: "var(--da-green)",
          color: "var(--da-dark)",
          border: "none",
          padding: "14px",
          borderRadius: "4px",
          fontSize: "15px",
          fontWeight: 700,
          cursor: status === "loading" ? "wait" : "pointer",
          width: "100%",
          marginBottom: "20px",
          opacity: status === "loading" || !email ? 0.7 : 1,
        }}
      >
        {status === "loading" ? "Sende Magic Link…" : "Magic Link anfordern"}
      </button>

      <p
        style={{
          color: "var(--da-muted-soft)",
          fontSize: "12px",
          lineHeight: 1.5,
          textAlign: "center",
          marginBottom: "20px",
        }}
      >
        Kein Passwort nötig — wir senden dir einen Login-Link per E-Mail.
      </p>

      <div
        style={{
          borderTop: "1px solid var(--da-border)",
          paddingTop: "20px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--da-muted)", fontSize: "14px" }}>
          Du willst Author werden?{" "}
          <a
            href="/artikel-pitchen"
            style={{ color: "var(--da-green)", fontWeight: 600, textDecoration: "none" }}
          >
            Pitch deinen Artikel →
          </a>
        </p>
      </div>
    </form>
  );
}

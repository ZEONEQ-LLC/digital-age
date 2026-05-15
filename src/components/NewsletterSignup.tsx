"use client";

import { useState, useTransition } from "react";
import {
  subscribeToNewsletter,
  type SubscribeSource,
} from "@/lib/newsletter/subscribe";

type Variant = "compact" | "inline" | "full" | "sidebar";

const VARIANT_TO_SOURCE: Record<Variant, SubscribeSource> = {
  compact: "footer",
  inline: "inline",
  full: "full",
  sidebar: "sidebar",
};

// Exakte Wortlaute der Einwilligung — werden beim Insert als consent_text
// mit in die DB geschrieben (DSGVO-Beweispflicht: was hat der User WANN
// wortwörtlich abgesegnet).
const CONSENT_TEXT: Record<Variant, string> = {
  full:
    "Ich willige in den Empfang des digital-age-Newsletters per E-Mail ein und akzeptiere die Datenschutzerklärung. Abmeldung jederzeit möglich.",
  inline:
    "Ich willige in den Empfang des digital-age-Newsletters per E-Mail ein und akzeptiere die Datenschutzerklärung. Abmeldung jederzeit möglich.",
  compact:
    "Ich willige in den Empfang des digital-age-Newsletters per E-Mail ein und akzeptiere die Datenschutzerklärung.",
  sidebar:
    "Ich willige in den Empfang des digital-age-Newsletters per E-Mail ein und akzeptiere die Datenschutzerklärung.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = "idle" | "submitting" | "success" | "error";

export default function NewsletterSignup({ variant = "compact" }: { variant?: Variant }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = emailValid && consent && state !== "submitting";

  // Redirect-Varianten landen nach Erfolg auf /newsletter/danke; compact
  // und sidebar zeigen Inline-Success damit kein Layout-Bruch entsteht
  // (Footer- bzw. Sidebar-Redirect wäre für den User unangenehm).
  const redirectsOnSuccess = variant === "full" || variant === "inline";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setState("submitting");
    startTransition(async () => {
      const result = await subscribeToNewsletter({
        email: email.trim(),
        consent,
        source: VARIANT_TO_SOURCE[variant],
        consentText: CONSENT_TEXT[variant],
        honeypot,
      });
      if (!result.success) {
        setError(result.message);
        setState("error");
        return;
      }
      setState("success");
      if (redirectsOnSuccess) {
        window.location.href = "/newsletter/danke";
      }
    });
  }

  // Hidden Honeypot-Feld in allen Varianten — Browser-Autofill triggert
  // es nicht, Bots oft schon.
  const honeypotField = (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: "-9999px",
        width: "1px",
        height: "1px",
        overflow: "hidden",
      }}
    >
      <label>
        Website
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </label>
    </div>
  );

  // Inline-Success-Message für compact/sidebar.
  const inlineSuccess = (
    <p
      role="status"
      style={{
        color: "var(--da-green)",
        fontSize: 12,
        marginTop: 8,
        fontFamily: "var(--da-font-mono)",
      }}
    >
      ✓ Danke! Wir melden uns sobald der Newsletter losgeht.
    </p>
  );

  const errorMessage =
    state === "error" && error ? (
      <p
        role="alert"
        style={{
          color: "#ff8e8e",
          fontSize: 12,
          marginTop: 8,
        }}
      >
        {error}
      </p>
    ) : null;

  // ---- COMPACT (Footer) ------------------------------------------------
  if (variant === "compact") {
    return (
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 400 }}>
        {honeypotField}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deine@email.ch"
            required
            disabled={state === "submitting" || state === "success"}
            style={{
              flex: 1,
              backgroundColor: "var(--da-dark)",
              color: "var(--da-text)",
              border: "1px solid var(--da-border)",
              borderRadius: 4,
              padding: "10px 14px",
              fontSize: 14,
              fontFamily: "Inter, sans-serif",
            }}
          />
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              backgroundColor: "var(--da-green)",
              color: "var(--da-dark)",
              border: "none",
              padding: "10px 18px",
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
              opacity: canSubmit ? 1 : 0.55,
            }}
          >
            {state === "submitting" ? "…" : "Abonnieren"}
          </button>
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginTop: 10,
            color: "var(--da-muted-soft)",
            fontSize: 11,
            lineHeight: 1.4,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={state === "submitting" || state === "success"}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <span>
            Ich willige ein.{" "}
            <a
              href="/datenschutzerklaerung"
              style={{ color: "var(--da-green)" }}
            >
              Datenschutz
            </a>
          </span>
        </label>
        {state === "success" && inlineSuccess}
        {errorMessage}
      </form>
    );
  }

  // ---- INLINE (Artikel-CTA) -------------------------------------------
  if (variant === "inline") {
    return (
      <div
        style={{
          backgroundColor: "var(--da-card)",
          border: "1px solid var(--da-green)",
          borderRadius: 8,
          padding: 32,
          margin: "48px 0",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "var(--da-green)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Newsletter
        </p>
        <h3
          style={{
            color: "var(--da-text)",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 8,
            fontFamily: "Space Grotesk, sans-serif",
          }}
        >
          Solche Analysen direkt in deine Inbox
        </h3>
        <p
          style={{
            color: "var(--da-muted)",
            fontSize: 15,
            lineHeight: 1.6,
            marginBottom: 24,
            maxWidth: 500,
            margin: "0 auto 24px",
          }}
        >
          Einmal pro Woche — KI & Future Tech für die DACH-Region. Kurz, relevant, ohne Hype.
        </p>
        <form
          onSubmit={handleSubmit}
          style={{ maxWidth: 480, margin: "0 auto" }}
        >
          {honeypotField}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.ch"
              required
              disabled={state === "submitting" || state === "success"}
              style={{
                flex: 1,
                minWidth: 200,
                backgroundColor: "var(--da-dark)",
                color: "var(--da-text)",
                border: "1px solid var(--da-border)",
                borderRadius: 4,
                padding: "12px 16px",
                fontSize: 15,
                fontFamily: "Inter, sans-serif",
              }}
            />
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                backgroundColor: "var(--da-green)",
                color: "var(--da-dark)",
                border: "none",
                padding: "12px 24px",
                borderRadius: 4,
                fontSize: 15,
                fontWeight: 700,
                cursor: canSubmit ? "pointer" : "not-allowed",
                opacity: canSubmit ? 1 : 0.55,
              }}
            >
              {state === "submitting" ? "…" : "Abonnieren"}
            </button>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              color: "var(--da-muted)",
              fontSize: 12,
              lineHeight: 1.5,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={state === "submitting" || state === "success"}
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            <span>
              Ich willige in den Empfang des Newsletters ein und akzeptiere die{" "}
              <a
                href="/datenschutzerklaerung"
                style={{ color: "var(--da-green)" }}
              >
                Datenschutzerklärung
              </a>
              . Abmeldung jederzeit möglich.
            </span>
          </label>
          {errorMessage}
        </form>
      </div>
    );
  }

  // ---- SIDEBAR (TopicListing) -----------------------------------------
  if (variant === "sidebar") {
    return (
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--da-card)",
          border: "1px solid var(--da-green)",
          borderRadius: 8,
          padding: 20,
        }}
      >
        {honeypotField}
        <p
          style={{
            color: "var(--da-green)",
            fontFamily: "var(--da-font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Newsletter
        </p>
        <p
          style={{
            color: "var(--da-text)",
            fontFamily: "var(--da-font-display)",
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.4,
            marginBottom: 6,
          }}
        >
          Wöchentlich in deine Inbox
        </p>
        <p
          style={{
            color: "var(--da-muted)",
            fontSize: 12,
            lineHeight: 1.5,
            marginBottom: 14,
          }}
        >
          Kurz, relevant, ohne Hype.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="deine@email.ch"
          required
          disabled={state === "submitting" || state === "success"}
          style={{
            width: "100%",
            background: "var(--da-dark)",
            color: "var(--da-text)",
            border: "1px solid var(--da-border)",
            borderRadius: 4,
            padding: "9px 12px",
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            marginBottom: 8,
            boxSizing: "border-box",
          }}
        />
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
            color: "var(--da-muted-soft)",
            fontSize: 11,
            lineHeight: 1.4,
            marginBottom: 10,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={state === "submitting" || state === "success"}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <span>
            Ich willige ein.{" "}
            <a
              href="/datenschutzerklaerung"
              style={{ color: "var(--da-green)" }}
            >
              Datenschutz
            </a>
          </span>
        </label>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            width: "100%",
            background: "var(--da-green)",
            color: "var(--da-dark)",
            border: "none",
            padding: 10,
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 700,
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.55,
          }}
        >
          {state === "submitting" ? "…" : "Abonnieren →"}
        </button>
        {state === "success" && inlineSuccess}
        {errorMessage}
      </form>
    );
  }

  // ---- FULL (/newsletter) ----------------------------------------------
  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: "var(--da-card)",
        border: "1px solid var(--da-border)",
        borderRadius: 8,
        padding: 40,
      }}
    >
      {honeypotField}
      <div style={{ marginBottom: 24 }}>
        <label
          style={{
            display: "block",
            color: "var(--da-text-strong)",
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          E-Mail-Adresse *
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="deine@email.ch"
          required
          disabled={state === "submitting" || state === "success"}
          style={{
            width: "100%",
            backgroundColor: "var(--da-dark)",
            color: "var(--da-text)",
            border: "1px solid var(--da-border)",
            borderRadius: 4,
            padding: "14px 16px",
            fontSize: 15,
            fontFamily: "Inter, sans-serif",
            boxSizing: "border-box",
          }}
        />
      </div>
      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          marginBottom: 24,
          color: "var(--da-text-strong)",
          fontSize: 13,
          lineHeight: 1.5,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={state === "submitting" || state === "success"}
          required
          style={{ marginTop: 4, flexShrink: 0 }}
        />
        <span>
          Ich willige in den Empfang des digital-age-Newsletters per E-Mail ein und akzeptiere die{" "}
          <a
            href="/datenschutzerklaerung"
            style={{ color: "var(--da-green)" }}
          >
            Datenschutzerklärung
          </a>
          . Abmeldung jederzeit möglich.
        </span>
      </label>
      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          backgroundColor: "var(--da-green)",
          color: "var(--da-dark)",
          border: "none",
          padding: 14,
          borderRadius: 4,
          fontSize: 15,
          fontWeight: 700,
          cursor: canSubmit ? "pointer" : "not-allowed",
          width: "100%",
          opacity: canSubmit ? 1 : 0.55,
        }}
      >
        {state === "submitting" ? "Sende…" : "Newsletter abonnieren →"}
      </button>
      {errorMessage}
    </form>
  );
}

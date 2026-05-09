"use client";
import { useState } from "react";

type Variant = "compact" | "inline" | "full";

export default function NewsletterSignup({ variant = "compact" }: { variant?: Variant }) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // Placeholder - will connect to Resend via Supabase later.
    // The /newsletter/danke page is the success view, so we redirect there directly.
    setTimeout(() => { window.location.href = "/newsletter/danke"; }, 300);
  };

  if (variant === "compact") {
    return (
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", width: "100%", maxWidth: "400px" }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="deine@email.ch"
          required
          style={{ flex: 1, backgroundColor: "var(--da-dark)", color: "var(--da-text)", border: "1px solid var(--da-border)", borderRadius: "4px", padding: "10px 14px", fontSize: "14px", fontFamily: "Inter, sans-serif" }}
        />
        <button type="submit" style={{ backgroundColor: "var(--da-green)", color: "var(--da-dark)", border: "none", padding: "10px 18px", borderRadius: "4px", fontSize: "14px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          Abonnieren
        </button>
      </form>
    );
  }

  if (variant === "inline") {
    return (
      <div style={{ backgroundColor: "var(--da-card)", border: "1px solid var(--da-green)", borderRadius: "8px", padding: "32px", margin: "48px 0", textAlign: "center" }}>
        <p style={{ color: "var(--da-green)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>📬 Newsletter</p>
        <h3 style={{ color: "var(--da-text)", fontSize: "22px", fontWeight: 700, marginBottom: "8px", fontFamily: "Space Grotesk, sans-serif" }}>
          Solche Analysen direkt in deine Inbox
        </h3>
        <p style={{ color: "var(--da-muted)", fontSize: "15px", lineHeight: 1.6, marginBottom: "24px", maxWidth: "500px", margin: "0 auto 24px" }}>
          Einmal pro Woche — KI & Future Tech für die DACH-Region. Kurz, relevant, ohne Hype.
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", maxWidth: "440px", margin: "0 auto", flexWrap: "wrap" }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="deine@email.ch"
            required
            style={{ flex: 1, minWidth: "200px", backgroundColor: "var(--da-dark)", color: "var(--da-text)", border: "1px solid var(--da-border)", borderRadius: "4px", padding: "12px 16px", fontSize: "15px", fontFamily: "Inter, sans-serif" }}
          />
          <button type="submit" style={{ backgroundColor: "var(--da-green)", color: "var(--da-dark)", border: "none", padding: "12px 24px", borderRadius: "4px", fontSize: "15px", fontWeight: 700, cursor: "pointer" }}>
            Abonnieren
          </button>
        </form>
        <p style={{ color: "var(--da-muted-soft)", fontSize: "12px", marginTop: "16px" }}>Jederzeit kündbar. Kein Spam.</p>
      </div>
    );
  }

  // variant === "full"
  return (
    <form onSubmit={handleSubmit} style={{ backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: "8px", padding: "40px" }}>
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", color: "var(--da-text-strong)", fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>E-Mail-Adresse *</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="deine@email.ch"
          required
          style={{ width: "100%", backgroundColor: "var(--da-dark)", color: "var(--da-text)", border: "1px solid var(--da-border)", borderRadius: "4px", padding: "14px 16px", fontSize: "15px", fontFamily: "Inter, sans-serif", boxSizing: "border-box" }}
        />
      </div>
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "24px" }}>
        <input type="checkbox" required style={{ marginTop: "4px" }} />
        <label style={{ color: "var(--da-text-strong)", fontSize: "13px", lineHeight: 1.5 }}>
          Ich stimme zu, den digital age Newsletter per E-Mail zu erhalten. Abmeldung jederzeit möglich. <a href="/datenschutzerklaerung" style={{ color: "var(--da-green)" }}>Datenschutz</a>
        </label>
      </div>
      <button type="submit" style={{ backgroundColor: "var(--da-green)", color: "var(--da-dark)", border: "none", padding: "14px", borderRadius: "4px", fontSize: "15px", fontWeight: 700, cursor: "pointer", width: "100%" }}>
        Newsletter abonnieren →
      </button>
      <p style={{ color: "var(--da-muted-soft)", fontSize: "12px", lineHeight: 1.5, textAlign: "center", marginTop: "16px" }}>
        Platzhalter – Wird mit Resend verbunden
      </p>
    </form>
  );
}

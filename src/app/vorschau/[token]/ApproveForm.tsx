"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveCampaignByToken } from "@/lib/ads/adActions";

// Freigabe durch den Kunden (G5): Name Pflicht, Bemerkung optional. Kein
// Login, kein Cookie. Nach Erfolg laedt die Seite den Status neu.
export default function ApproveForm({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const field: React.CSSProperties = {
    width: "100%", background: "var(--da-dark)", border: "1px solid var(--da-border)", borderRadius: 4,
    color: "var(--da-text)", padding: "10px 12px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box",
  };
  const label: React.CSSProperties = {
    display: "block", color: "var(--da-faint)", fontSize: 10, fontWeight: 700, fontFamily: "var(--da-font-mono)",
    letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6,
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await approveCampaignByToken(token, name, note);
          if (!res.ok) { setError(res.error); return; }
          router.refresh();
        });
      }}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div>
        <label style={label} htmlFor="ap-name">Ihr Name *</label>
        <input id="ap-name" style={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required placeholder="Vorname Nachname" />
      </div>
      <div>
        <label style={label} htmlFor="ap-note">Bemerkung (optional)</label>
        <textarea id="ap-note" style={{ ...field, minHeight: 72 }} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Hinweise an die Redaktion" />
      </div>
      {error && <p style={{ color: "#ff6b6b", fontSize: 13, margin: 0 }}>{error}</p>}
      <div>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          style={{ padding: "11px 18px", background: "var(--da-green)", color: "var(--da-dark)", border: 0, borderRadius: 6, fontWeight: 700, cursor: "pointer", opacity: pending || !name.trim() ? 0.6 : 1 }}
        >
          {pending ? "Wird gespeichert …" : "Kampagne freigeben"}
        </button>
      </div>
    </form>
  );
}

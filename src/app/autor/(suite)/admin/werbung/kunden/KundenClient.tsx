"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createAdvertiser,
  createContact,
  deleteAdvertiser,
  deleteContact,
  updateAdvertiser,
} from "@/lib/ads/adActions";
import type { AdvertiserInput, AdvertiserWithContacts } from "@/lib/ads/types";

type Props = { initialAdvertisers: AdvertiserWithContacts[] };

const card: React.CSSProperties = { background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: 8, padding: 16 };
const inp: React.CSSProperties = { padding: "8px 10px", background: "var(--da-dark)", color: "var(--da-text)", border: "1px solid var(--da-border)", borderRadius: 6, width: "100%" };
const btn: React.CSSProperties = { padding: "7px 12px", background: "var(--da-green)", color: "var(--da-dark)", border: 0, borderRadius: 6, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "7px 12px", background: "transparent", color: "var(--da-muted)", border: "1px solid var(--da-border)", borderRadius: 6, cursor: "pointer" };
const errStyle: React.CSSProperties = { color: "#ff6b6b", fontSize: 13, margin: 0 };

const emptyAdvertiser: AdvertiserInput = { name: "", uid: "", billing_address: "", billing_email: "", is_agency: false, commission_pct: null, notes: "" };

export default function KundenClient({ initialAdvertisers }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<AdvertiserInput>(emptyAdvertiser);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AdvertiserInput>(emptyAdvertiser);
  // Kontakt-Draft pro Kunde
  const [contactFor, setContactFor] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRole, setContactRole] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) { setError(res.error ?? "Fehler."); return; }
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <p style={errStyle}>{error}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" style={btn} onClick={() => setShowNew((v) => !v)}>
          {showNew ? "Abbrechen" : "+ Neuer Kunde"}
        </button>
      </div>

      {showNew && (
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
          <input style={inp} placeholder="Name / Firma *" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input style={inp} placeholder="UID (z. B. CHE-...)" value={draft.uid ?? ""} onChange={(e) => setDraft({ ...draft, uid: e.target.value })} />
          <input style={inp} placeholder="Rechnungs-E-Mail" value={draft.billing_email ?? ""} onChange={(e) => setDraft({ ...draft, billing_email: e.target.value })} />
          <input style={inp} placeholder="Rechnungsadresse" value={draft.billing_address ?? ""} onChange={(e) => setDraft({ ...draft, billing_address: e.target.value })} />
          <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--da-text)", fontSize: 14 }}>
            <input type="checkbox" checked={draft.is_agency ?? false} onChange={(e) => setDraft({ ...draft, is_agency: e.target.checked })} />
            Agentur
          </label>
          {draft.is_agency && (
            <input style={inp} placeholder="Kommission %" inputMode="decimal" value={draft.commission_pct ?? ""} onChange={(e) => setDraft({ ...draft, commission_pct: e.target.value ? Number(e.target.value) : null })} />
          )}
          <textarea style={{ ...inp, minHeight: 60 }} placeholder="Notizen" value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          <button type="button" style={btn} disabled={pending} onClick={() => run(async () => {
            const res = await createAdvertiser(draft);
            if (res.ok) { setShowNew(false); setDraft(emptyAdvertiser); }
            return res;
          })}>Kunde anlegen</button>
        </div>
      )}

      {initialAdvertisers.length === 0 && <p style={{ color: "var(--da-muted)" }}>Noch keine Kunden.</p>}

      {initialAdvertisers.map((a) => (
        <div key={a.id} style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
          {editId === a.id ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input style={inp} value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} />
              <input style={inp} placeholder="UID" value={editDraft.uid ?? ""} onChange={(e) => setEditDraft({ ...editDraft, uid: e.target.value })} />
              <input style={inp} placeholder="Rechnungs-E-Mail" value={editDraft.billing_email ?? ""} onChange={(e) => setEditDraft({ ...editDraft, billing_email: e.target.value })} />
              <input style={inp} placeholder="Rechnungsadresse" value={editDraft.billing_address ?? ""} onChange={(e) => setEditDraft({ ...editDraft, billing_address: e.target.value })} />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={btn} disabled={pending} onClick={() => run(async () => {
                  const res = await updateAdvertiser(a.id, editDraft);
                  if (res.ok) setEditId(null);
                  return res;
                })}>Speichern</button>
                <button type="button" style={btnGhost} onClick={() => setEditId(null)}>Abbrechen</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "var(--da-text)", fontWeight: 700, fontSize: 16 }}>
                  {a.name} {a.is_agency && <span style={{ color: "var(--da-muted)", fontSize: 12 }}>· Agentur</span>}
                </div>
                <div style={{ color: "var(--da-muted)", fontSize: 13 }}>
                  {[a.uid, a.billing_email].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={btnGhost} onClick={() => { setEditId(a.id); setEditDraft({ name: a.name, uid: a.uid, billing_address: a.billing_address, billing_email: a.billing_email, is_agency: a.is_agency, commission_pct: a.commission_pct, notes: a.notes }); }}>Bearbeiten</button>
                <button type="button" style={btnGhost} disabled={pending} onClick={() => { if (confirm(`Kunde „${a.name}" löschen? Verknüpfte Kampagnen blockieren das Löschen.`)) run(() => deleteAdvertiser(a.id)); }}>Löschen</button>
              </div>
            </div>
          )}

          {/* Kontakte */}
          <div style={{ borderTop: "1px solid var(--da-border)", paddingTop: 10 }}>
            <div style={{ color: "var(--da-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Ansprechpartner</div>
            {a.contacts.length === 0 && <div style={{ color: "var(--da-muted)", fontSize: 13 }}>Keine Kontakte.</div>}
            {a.contacts.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14, color: "var(--da-text-strong)" }}>
                <span>{c.name}{c.role ? ` · ${c.role}` : ""} {c.email && <span style={{ color: "var(--da-muted)" }}>· {c.email}</span>} {c.phone && <span style={{ color: "var(--da-muted)" }}>· {c.phone}</span>}</span>
                <button type="button" style={{ ...btnGhost, padding: "2px 8px" }} disabled={pending} onClick={() => run(() => deleteContact(c.id))}>×</button>
              </div>
            ))}
            {contactFor === a.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <input style={inp} placeholder="Name *" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input style={{ ...inp, flex: 1, minWidth: 120 }} placeholder="Rolle" value={contactRole} onChange={(e) => setContactRole(e.target.value)} />
                  <input style={{ ...inp, flex: 1, minWidth: 120 }} placeholder="E-Mail" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                  <input style={{ ...inp, flex: 1, minWidth: 120 }} placeholder="Telefon" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" style={btn} disabled={pending} onClick={() => run(async () => {
                    const res = await createContact({ advertiser_id: a.id, name: contactName, role: contactRole, email: contactEmail, phone: contactPhone });
                    if (res.ok) { setContactFor(null); setContactName(""); setContactRole(""); setContactEmail(""); setContactPhone(""); }
                    return res;
                  })}>Hinzufügen</button>
                  <button type="button" style={btnGhost} onClick={() => setContactFor(null)}>Abbrechen</button>
                </div>
              </div>
            ) : (
              <button type="button" style={{ ...btnGhost, marginTop: 8 }} onClick={() => setContactFor(a.id)}>+ Kontakt</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

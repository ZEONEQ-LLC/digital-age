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
import { ADVERTISER_LANGUAGES, type AdvertiserInput, type AdvertiserWithContacts } from "@/lib/ads/types";

type Props = { initialAdvertisers: AdvertiserWithContacts[] };

const card: React.CSSProperties = { background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: 8, padding: 16 };
const inp: React.CSSProperties = { padding: "8px 10px", background: "var(--da-dark)", color: "var(--da-text)", border: "1px solid var(--da-border)", borderRadius: 6, width: "100%" };
const btn: React.CSSProperties = { padding: "7px 12px", background: "var(--da-green)", color: "var(--da-dark)", border: 0, borderRadius: 6, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "7px 12px", background: "transparent", color: "var(--da-muted)", border: "1px solid var(--da-border)", borderRadius: 6, cursor: "pointer" };
const errStyle: React.CSSProperties = { color: "#ff6b6b", fontSize: 13, margin: 0 };
const row: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap" };
const lblCol: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, color: "var(--da-muted)", fontSize: 12 };

const emptyAdvertiser: AdvertiserInput = {
  name: "", uid: "", address_addition: "", street: "", house_number: "", post_office_box: "",
  postal_code: "", city: "", country: "CH", language: "de", billing_email: "",
  payment_terms_days: 30, billing_via_agency_id: "", is_agency: false, commission_pct: null, notes: "",
};

function AdvertiserForm({
  draft, setDraft, others,
}: {
  draft: AdvertiserInput;
  setDraft: (d: AdvertiserInput) => void;
  others: { id: string; name: string }[];
}) {
  const set = (patch: Partial<AdvertiserInput>) => setDraft({ ...draft, ...patch });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label style={lblCol}>
        <span>Name / Firma * (max. 70)</span>
        <input style={inp} maxLength={70} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
      </label>
      <label style={lblCol}>
        <span>UID</span>
        <input style={inp} placeholder="CHE123456789 (Punkte/MWST-Suffix egal)" value={draft.uid ?? ""} onChange={(e) => set({ uid: e.target.value })} />
      </label>

      <div style={{ color: "var(--da-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 4 }}>Rechnungsadresse</div>
      <label style={lblCol}>
        <span>Adresszusatz</span>
        <input style={inp} value={draft.address_addition ?? ""} onChange={(e) => set({ address_addition: e.target.value })} />
      </label>
      <div style={row}>
        <label style={{ ...lblCol, flex: 3, minWidth: 160 }}>
          <span>Strasse (max. 70)</span>
          <input style={inp} maxLength={70} value={draft.street ?? ""} onChange={(e) => set({ street: e.target.value })} />
        </label>
        <label style={{ ...lblCol, flex: 1, minWidth: 90 }}>
          <span>Nr. (max. 16)</span>
          <input style={inp} maxLength={16} value={draft.house_number ?? ""} onChange={(e) => set({ house_number: e.target.value })} />
        </label>
      </div>
      <label style={lblCol}>
        <span>Postfach (statt Strasse)</span>
        <input style={inp} value={draft.post_office_box ?? ""} onChange={(e) => set({ post_office_box: e.target.value })} />
      </label>
      <div style={row}>
        <label style={{ ...lblCol, flex: 1, minWidth: 90 }}>
          <span>PLZ (max. 16)</span>
          <input style={inp} maxLength={16} value={draft.postal_code ?? ""} onChange={(e) => set({ postal_code: e.target.value })} />
        </label>
        <label style={{ ...lblCol, flex: 3, minWidth: 160 }}>
          <span>Ort (max. 35)</span>
          <input style={inp} maxLength={35} value={draft.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
        </label>
        <label style={{ ...lblCol, flex: 1, minWidth: 70 }}>
          <span>Land</span>
          <input style={{ ...inp, textTransform: "uppercase" }} maxLength={2} value={draft.country ?? "CH"} onChange={(e) => set({ country: e.target.value })} />
        </label>
      </div>

      <div style={row}>
        <label style={{ ...lblCol, flex: 1, minWidth: 140 }}>
          <span>Sprache</span>
          <select style={inp} value={draft.language ?? "de"} onChange={(e) => set({ language: e.target.value })}>
            {ADVERTISER_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </label>
        <label style={{ ...lblCol, flex: 1, minWidth: 140 }}>
          <span>Zahlungsziel (Tage)</span>
          <input style={inp} inputMode="numeric" value={String(draft.payment_terms_days ?? 30)} onChange={(e) => set({ payment_terms_days: e.target.value ? Number(e.target.value) : 30 })} />
        </label>
      </div>
      <label style={lblCol}>
        <span>Rechnungs-E-Mail</span>
        <input style={inp} value={draft.billing_email ?? ""} onChange={(e) => set({ billing_email: e.target.value })} />
      </label>

      <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--da-text)", fontSize: 14 }}>
        <input type="checkbox" checked={draft.is_agency ?? false} onChange={(e) => set({ is_agency: e.target.checked })} />
        Agentur
      </label>
      {draft.is_agency && (
        <label style={lblCol}>
          <span>Kommission %</span>
          <input style={inp} inputMode="decimal" value={draft.commission_pct ?? ""} onChange={(e) => set({ commission_pct: e.target.value ? Number(e.target.value) : null })} />
        </label>
      )}

      <label style={lblCol}>
        <span>Rechnung über Agentur</span>
        <select style={inp} value={draft.billing_via_agency_id ?? ""} onChange={(e) => set({ billing_via_agency_id: e.target.value })}>
          <option value="">— direkt —</option>
          {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <span style={{ color: "var(--da-faint)", fontSize: 11 }}>Nur als Agentur markierte Kunden.</span>
      </label>

      <label style={lblCol}>
        <span>Notizen</span>
        <textarea style={{ ...inp, minHeight: 60 }} value={draft.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
      </label>
    </div>
  );
}

export default function KundenClient({ initialAdvertisers }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<AdvertiserInput>(emptyAdvertiser);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AdvertiserInput>(emptyAdvertiser);
  const [contactFor, setContactFor] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRole, setContactRole] = useState("");

  // billing_via_agency_id darf nur auf Agenturen zeigen (DB-Trigger enforced es zusätzlich).
  const agencies = initialAdvertisers.filter((a) => a.is_agency).map((a) => ({ id: a.id, name: a.name }));

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
          <AdvertiserForm draft={draft} setDraft={setDraft} others={agencies} />
          <button type="button" style={{ ...btn, alignSelf: "flex-start" }} disabled={pending} onClick={() => run(async () => {
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
              <AdvertiserForm draft={editDraft} setDraft={setEditDraft} others={agencies.filter((o) => o.id !== a.id)} />
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
                  {[a.uid, [a.postal_code, a.city].filter(Boolean).join(" "), a.billing_email].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={btnGhost} onClick={() => {
                  setEditId(a.id);
                  setEditDraft({
                    name: a.name, uid: a.uid, address_addition: a.address_addition, street: a.street,
                    house_number: a.house_number, post_office_box: a.post_office_box, postal_code: a.postal_code,
                    city: a.city, country: a.country, language: a.language, billing_email: a.billing_email,
                    payment_terms_days: a.payment_terms_days, billing_via_agency_id: a.billing_via_agency_id,
                    is_agency: a.is_agency, commission_pct: a.commission_pct, notes: a.notes,
                  });
                }}>Bearbeiten</button>
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
                <label style={lblCol}>
                  <span>Name *</span>
                  <input style={inp} value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </label>
                <div style={row}>
                  <label style={{ ...lblCol, flex: 1, minWidth: 120 }}>
                    <span>Rolle</span>
                    <input style={inp} value={contactRole} onChange={(e) => setContactRole(e.target.value)} />
                  </label>
                  <label style={{ ...lblCol, flex: 1, minWidth: 120 }}>
                    <span>E-Mail</span>
                    <input style={inp} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                  </label>
                  <label style={{ ...lblCol, flex: 1, minWidth: 120 }}>
                    <span>Telefon</span>
                    <input style={inp} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                  </label>
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

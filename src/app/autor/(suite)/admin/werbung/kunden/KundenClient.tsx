"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createAdvertiser, createContact, deleteAdvertiser, deleteContact, lookupUidAction, updateAdvertiser,
} from "@/lib/ads/adActions";
import {
  ADVERTISER_LANGUAGES, normalizeUid, type AdvertiserInput, type AdvertiserWithContacts, type UidLookupHit,
} from "@/lib/ads/types";
import { card, errStyle, help, inputStyle, labelStyle, btnPrimary, btnGhost, btnSmall } from "../formStyles";

type Props = { initialAdvertisers: AdvertiserWithContacts[] };

const COUNTRIES = ["CH", "DE", "AT", "LI", "FR", "IT"];

const emptyAdvertiser: AdvertiserInput = {
  name: "", uid: "", address_addition: "", street: "", house_number: "", post_office_box: "",
  postal_code: "", city: "", country: "CH", language: "de", billing_email: "",
  payment_terms_days: 30, billing_via_agency_id: "", is_agency: false, commission_pct: null, notes: "",
};

// Zaehler "58/70" rechts unter dem Feld, erst ab 80 % der Laenge sichtbar.
function Counter({ len, max }: { len: number; max: number }) {
  if (len < max * 0.8) return null;
  return (
    <p style={{ ...help, textAlign: "right", color: len >= max ? "#ff6b6b" : "var(--da-muted)" }}>{len}/{max}</p>
  );
}

function AdvertiserForm({
  draft, setDraft, agencies, onSubmit, onCancel, submitLabel, pending,
}: {
  draft: AdvertiserInput;
  setDraft: (d: AdvertiserInput) => void;
  agencies: { id: string; name: string }[];
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  pending: boolean;
}) {
  const set = (patch: Partial<AdvertiserInput>) => setDraft({ ...draft, ...patch });
  const [usePob, setUsePob] = useState(!!draft.post_office_box);

  // UID-Register (G6): Suche mit UID-Feld, sonst mit dem Namen. Treffer
  // fuellen die Formularfelder vor; alles bleibt editierbar, nichts wird
  // ausserhalb der Felder gespeichert.
  const [uidBusy, setUidBusy] = useState(false);
  const [uidError, setUidError] = useState<string | null>(null);
  const [uidHits, setUidHits] = useState<UidLookupHit[]>([]);
  const [uidApplied, setUidApplied] = useState(false);
  const uidRaw = (draft.uid ?? "").trim();
  const uidInvalid = uidRaw !== "" && !normalizeUid(uidRaw);

  async function searchUid() {
    const query = uidRaw || draft.name.trim();
    setUidError(null); setUidHits([]);
    if (!query) { setUidError("Bitte UID oder Firmenname eingeben."); return; }
    setUidBusy(true);
    try {
      const res = await lookupUidAction(query);
      if (!res.ok) setUidError(res.error);
      else setUidHits(res.hits);
    } finally {
      setUidBusy(false);
    }
  }

  function applyHit(h: UidLookupHit) {
    if ((draft.name.trim() || (draft.street ?? "").trim()) && !confirm("Bestehende Angaben (Name, Adresse) werden überschrieben. Fortfahren?")) return;
    const hasStreet = !!h.street;
    setUsePob(!hasStreet && !!h.postOfficeBox);
    setDraft({
      ...draft,
      name: h.name.slice(0, 70),
      uid: h.uid,
      street: hasStreet ? (h.street ?? "").slice(0, 70) : "",
      house_number: hasStreet ? (h.houseNumber ?? "").slice(0, 16) : "",
      post_office_box: !hasStreet ? (h.postOfficeBox ?? "") : "",
      postal_code: (h.postalCode ?? "").slice(0, 16),
      city: (h.city ?? "").slice(0, 35),
      country: COUNTRIES.includes(h.country) ? h.country : draft.country,
    });
    setUidHits([]);
    setUidApplied(true);
  }
  // Umschalter leert die jeweils ausgeblendeten Felder, damit der Adress-CHECK nicht anschlaegt.
  function togglePob(next: boolean) {
    setUsePob(next);
    if (next) set({ street: "", house_number: "" });
    else set({ post_office_box: "" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="kd-grid-2-1">
        <div>
          <label style={labelStyle} htmlFor="ad-name">Name / Firma *</label>
          <input id="ad-name" style={inputStyle} maxLength={70} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          <Counter len={draft.name.length} max={70} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="ad-uid">UID</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input id="ad-uid" style={inputStyle} placeholder="CHE123456789" value={draft.uid ?? ""} onChange={(e) => { set({ uid: e.target.value }); setUidApplied(false); }} />
            <button type="button" style={{ ...btnGhost, whiteSpace: "nowrap" }} disabled={uidBusy || pending} onClick={() => void searchUid()}>
              {uidBusy ? "Suche …" : "Im UID-Register suchen"}
            </button>
          </div>
          {uidInvalid && <p style={{ ...errStyle, marginTop: 6 }}>Format CHE123456789 — der Server prüft abschliessend.</p>}
          {uidApplied && !uidInvalid && <p style={{ ...help, color: "var(--da-green)" }}>Übernommen aus dem UID-Register (BFS)</p>}
          {uidError && <p style={{ ...errStyle, marginTop: 6 }}>{uidError}</p>}
        </div>
      </div>
      {uidHits.length > 0 && (
        <div style={{ border: "1px solid var(--da-border)", borderRadius: 6, overflow: "hidden" }}>
          {uidHits.map((h) => (
            <button
              key={h.uid}
              type="button"
              onClick={() => applyHit(h)}
              style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr auto", gap: 12, alignItems: "center", width: "100%", textAlign: "left", padding: "10px 12px", background: "transparent", border: 0, borderBottom: "1px solid var(--da-border)", color: "var(--da-text)", cursor: "pointer", fontSize: 13 }}
            >
              <span style={{ fontWeight: 600 }}>{h.name}</span>
              <span style={{ fontFamily: "var(--da-font-mono)", color: "var(--da-muted)", fontSize: 12 }}>{h.uid}</span>
              <span style={{ color: "var(--da-muted)" }}>{[h.postalCode, h.city].filter(Boolean).join(" ")}</span>
              <span style={{ fontSize: 10, fontFamily: "var(--da-font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: h.active ? "var(--da-green)" : "var(--da-orange)", border: `1px solid ${h.active ? "var(--da-green)" : "var(--da-orange)"}`, borderRadius: 999, padding: "2px 7px" }}>{h.active ? "aktiv" : "inaktiv"}</span>
            </button>
          ))}
          <p style={{ ...help, padding: "6px 12px 8px", margin: 0 }}>Klick übernimmt Name, UID und Adresse in das Formular.</p>
        </div>
      )}

      <span style={{ ...labelStyle, marginBottom: 0, marginTop: 4 }}>Rechnungsadresse</span>
      <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--da-text)", fontSize: 14 }}>
        <input type="checkbox" checked={usePob} onChange={(e) => togglePob(e.target.checked)} />
        Postfach statt Strasse
      </label>
      {usePob ? (
        <div>
          <label style={labelStyle} htmlFor="ad-pob">Postfach</label>
          <input id="ad-pob" style={inputStyle} value={draft.post_office_box ?? ""} onChange={(e) => set({ post_office_box: e.target.value })} />
        </div>
      ) : (
        <div className="kd-grid-2-1">
          <div>
            <label style={labelStyle} htmlFor="ad-street">Strasse</label>
            <input id="ad-street" style={inputStyle} maxLength={70} value={draft.street ?? ""} onChange={(e) => set({ street: e.target.value })} />
            <Counter len={(draft.street ?? "").length} max={70} />
          </div>
          <div>
            <label style={labelStyle} htmlFor="ad-nr">Nr.</label>
            <input id="ad-nr" style={inputStyle} maxLength={16} value={draft.house_number ?? ""} onChange={(e) => set({ house_number: e.target.value })} />
            <Counter len={(draft.house_number ?? "").length} max={16} />
          </div>
        </div>
      )}
      <div>
        <label style={labelStyle} htmlFor="ad-add">Adresszusatz (optional)</label>
        <input id="ad-add" style={inputStyle} value={draft.address_addition ?? ""} onChange={(e) => set({ address_addition: e.target.value })} />
      </div>
      <div className="kd-grid-1-2-1">
        <div>
          <label style={labelStyle} htmlFor="ad-plz">PLZ</label>
          <input id="ad-plz" style={inputStyle} maxLength={16} value={draft.postal_code ?? ""} onChange={(e) => set({ postal_code: e.target.value })} />
          <Counter len={(draft.postal_code ?? "").length} max={16} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="ad-city">Ort</label>
          <input id="ad-city" style={inputStyle} maxLength={35} value={draft.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
          <Counter len={(draft.city ?? "").length} max={35} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="ad-country">Land</label>
          <select id="ad-country" style={inputStyle} value={draft.country ?? "CH"} onChange={(e) => set({ country: e.target.value })}>
            {COUNTRIES.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
          </select>
        </div>
      </div>

      <div className="kd-grid-3">
        <div>
          <label style={labelStyle} htmlFor="ad-lang">Sprache</label>
          <select id="ad-lang" style={inputStyle} value={draft.language ?? "de"} onChange={(e) => set({ language: e.target.value })}>
            {ADVERTISER_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="ad-terms">Zahlungsziel (Tage)</label>
          <input id="ad-terms" style={inputStyle} inputMode="numeric" value={String(draft.payment_terms_days ?? 30)} onChange={(e) => set({ payment_terms_days: e.target.value ? Number(e.target.value) : 30 })} />
        </div>
        <div>
          <label style={labelStyle} htmlFor="ad-email">Rechnungs-E-Mail</label>
          <input id="ad-email" style={inputStyle} value={draft.billing_email ?? ""} onChange={(e) => set({ billing_email: e.target.value })} />
        </div>
      </div>

      <div className="kd-grid-2-1" style={{ alignItems: "end" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--da-text)", fontSize: 14, minHeight: 38 }}>
          <input type="checkbox" checked={draft.is_agency ?? false} onChange={(e) => set({ is_agency: e.target.checked })} />
          Ist Agentur
        </label>
        {draft.is_agency ? (
          <div>
            <label style={labelStyle} htmlFor="ad-comm">Kommission %</label>
            <input id="ad-comm" style={inputStyle} inputMode="decimal" value={draft.commission_pct ?? ""} onChange={(e) => set({ commission_pct: e.target.value ? Number(e.target.value) : null })} />
          </div>
        ) : <div />}
      </div>

      {agencies.length > 0 ? (
        <div>
          <label style={labelStyle} htmlFor="ad-via">Rechnung über Agentur</label>
          <select id="ad-via" style={inputStyle} value={draft.billing_via_agency_id ?? ""} onChange={(e) => set({ billing_via_agency_id: e.target.value })}>
            <option value="">— direkt —</option>
            {agencies.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      ) : (
        <p style={{ ...help, margin: 0 }}>Noch keine Agentur angelegt.</p>
      )}

      <div>
        <label style={labelStyle} htmlFor="ad-notes">Notizen</label>
        <textarea id="ad-notes" style={{ ...inputStyle, minHeight: 60 }} value={draft.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" style={btnGhost} onClick={onCancel}>Abbrechen</button>
        <button type="button" style={btnPrimary} disabled={pending} onClick={onSubmit}>{submitLabel}</button>
      </div>
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
  const [openContacts, setOpenContacts] = useState<Record<string, boolean>>({});
  const [contactFor, setContactFor] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRole, setContactRole] = useState("");

  // billing_via_agency_id darf nur auf Agenturen zeigen (DB-Trigger enforced es zusaetzlich).
  const agencies = initialAdvertisers.filter((a) => a.is_agency).map((a) => ({ id: a.id, name: a.name }));

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) { setError(res.error ?? "Fehler."); return; }
      router.refresh();
    });
  }

  function toDraft(a: AdvertiserWithContacts): AdvertiserInput {
    return {
      name: a.name, uid: a.uid, address_addition: a.address_addition, street: a.street,
      house_number: a.house_number, post_office_box: a.post_office_box, postal_code: a.postal_code,
      city: a.city, country: a.country, language: a.language, billing_email: a.billing_email,
      payment_terms_days: a.payment_terms_days, billing_via_agency_id: a.billing_via_agency_id,
      is_agency: a.is_agency, commission_pct: a.commission_pct, notes: a.notes,
    };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        .kd-grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
        .kd-grid-1-2-1 { display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 16px; }
        .kd-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .kd-row { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1.4fr auto auto; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--da-border); }
        @media (max-width: 1023px) { .kd-row { grid-template-columns: 1fr 1fr auto; } .kd-row .kd-hide-md { display: none; } }
        @media (max-width: 767px) {
          .kd-grid-2-1, .kd-grid-1-2-1, .kd-grid-3 { grid-template-columns: 1fr; }
          .kd-row { grid-template-columns: 1fr; }
        }
      `}</style>
      {error && <p style={errStyle}>{error}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" style={btnPrimary} onClick={() => setShowNew((v) => !v)}>
          {showNew ? "Abbrechen" : "+ Neuer Kunde"}
        </button>
      </div>

      {showNew && (
        <div style={card}>
          <AdvertiserForm
            draft={draft} setDraft={setDraft} agencies={agencies} pending={pending}
            submitLabel="Kunde anlegen"
            onCancel={() => { setShowNew(false); setDraft(emptyAdvertiser); }}
            onSubmit={() => run(async () => {
              const res = await createAdvertiser(draft);
              if (res.ok) { setShowNew(false); setDraft(emptyAdvertiser); }
              return res;
            })}
          />
        </div>
      )}

      {initialAdvertisers.length === 0 && <p style={{ color: "var(--da-muted)" }}>Noch keine Kunden.</p>}

      {initialAdvertisers.length > 0 && (
        <div style={{ ...card, paddingTop: 0, paddingBottom: 0 }}>
          {initialAdvertisers.map((a) => {
            const contactsOpen = !!openContacts[a.id];
            return (
              <div key={a.id}>
                {editId === a.id ? (
                  <div style={{ padding: "16px 0", borderBottom: "1px solid var(--da-border)" }}>
                    <AdvertiserForm
                      key={a.id}
                      draft={editDraft} setDraft={setEditDraft}
                      agencies={agencies.filter((o) => o.id !== a.id)} pending={pending}
                      submitLabel="Speichern"
                      onCancel={() => setEditId(null)}
                      onSubmit={() => run(async () => {
                        const res = await updateAdvertiser(a.id, editDraft);
                        if (res.ok) setEditId(null);
                        return res;
                      })}
                    />
                  </div>
                ) : (
                  <div className="kd-row">
                    <div style={{ color: "var(--da-text)", fontWeight: 700, fontSize: 15 }}>
                      {a.name}
                      {a.is_agency && (
                        <span style={{ marginLeft: 8, fontSize: 10, fontFamily: "var(--da-font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--da-green)", border: "1px solid var(--da-green)", borderRadius: 999, padding: "2px 7px" }}>Agentur</span>
                      )}
                    </div>
                    <div className="kd-hide-md" style={{ color: "var(--da-muted)", fontSize: 13, fontFamily: "var(--da-font-mono)" }}>{a.uid ?? "—"}</div>
                    <div className="kd-hide-md" style={{ color: "var(--da-muted)", fontSize: 13 }}>{[a.postal_code, a.city].filter(Boolean).join(" ") || "—"}</div>
                    <div style={{ color: "var(--da-muted)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis" }}>{a.billing_email ?? "—"}</div>
                    <div style={{ display: "flex", gap: 6, whiteSpace: "nowrap" }}>
                      <button type="button" style={btnSmall} onClick={() => { setEditId(a.id); setEditDraft(toDraft(a)); }}>Bearbeiten</button>
                      <button type="button" style={btnSmall} disabled={pending} onClick={() => { if (confirm(`Kunde „${a.name}" löschen? Verknüpfte Kampagnen blockieren das Löschen.`)) run(() => deleteAdvertiser(a.id)); }}>Löschen</button>
                    </div>
                    <div>
                      <button type="button" style={btnSmall} onClick={() => setOpenContacts((o) => ({ ...o, [a.id]: !contactsOpen }))} aria-expanded={contactsOpen}>
                        Ansprechpartner ({a.contacts.length}) {contactsOpen ? "▴" : "▾"}
                      </button>
                    </div>
                  </div>
                )}

                {contactsOpen && editId !== a.id && (
                  <div style={{ padding: "8px 0 16px", borderBottom: "1px solid var(--da-border)" }}>
                    {a.contacts.length === 0 && <div style={{ color: "var(--da-muted)", fontSize: 13 }}>Keine Kontakte.</div>}
                    {a.contacts.map((ct) => (
                      <div key={ct.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 14, color: "var(--da-text-strong)" }}>
                        <span>{ct.name}{ct.role ? ` · ${ct.role}` : ""} {ct.email && <span style={{ color: "var(--da-muted)" }}>· {ct.email}</span>} {ct.phone && <span style={{ color: "var(--da-muted)" }}>· {ct.phone}</span>}</span>
                        <button type="button" style={btnSmall} disabled={pending} onClick={() => run(() => deleteContact(ct.id))}>Löschen</button>
                      </div>
                    ))}
                    {contactFor === a.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                        <div>
                          <label style={labelStyle} htmlFor="ct-name">Name *</label>
                          <input id="ct-name" style={inputStyle} value={contactName} onChange={(e) => setContactName(e.target.value)} />
                        </div>
                        <div className="kd-grid-3">
                          <div>
                            <label style={labelStyle} htmlFor="ct-role">Rolle</label>
                            <input id="ct-role" style={inputStyle} value={contactRole} onChange={(e) => setContactRole(e.target.value)} />
                          </div>
                          <div>
                            <label style={labelStyle} htmlFor="ct-email">E-Mail</label>
                            <input id="ct-email" style={inputStyle} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                          </div>
                          <div>
                            <label style={labelStyle} htmlFor="ct-phone">Telefon</label>
                            <input id="ct-phone" style={inputStyle} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button type="button" style={btnGhost} onClick={() => setContactFor(null)}>Abbrechen</button>
                          <button type="button" style={btnPrimary} disabled={pending} onClick={() => run(async () => {
                            const res = await createContact({ advertiser_id: a.id, name: contactName, role: contactRole, email: contactEmail, phone: contactPhone });
                            if (res.ok) { setContactFor(null); setContactName(""); setContactRole(""); setContactEmail(""); setContactPhone(""); }
                            return res;
                          })}>Hinzufügen</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" style={{ ...btnGhost, marginTop: 8 }} onClick={() => setContactFor(a.id)}>+ Kontakt</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

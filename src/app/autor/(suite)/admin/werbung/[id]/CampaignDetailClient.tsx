"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createBooking,
  createCreative,
  deleteBooking,
  deleteCampaign,
  deleteCreative,
  setCampaignStatus,
  updateCampaign,
  updateCreative,
} from "@/lib/ads/adActions";
import {
  CAMPAIGN_STATUSES,
  RESSORT_SLUGS,
  SCOPE_KINDS,
  formatPeriod,
  statusLabel,
  type CampaignDetail,
  type CampaignStatus,
  type PlacementRow,
  type ScopeKind,
} from "@/lib/ads/types";

type Props = {
  detail: CampaignDetail;
  advertisers: { id: string; name: string }[];
  placements: PlacementRow[];
};

const card: React.CSSProperties = { background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 12 };
const inp: React.CSSProperties = { padding: "8px 10px", background: "var(--da-dark)", color: "var(--da-text)", border: "1px solid var(--da-border)", borderRadius: 6, width: "100%" };
const btn: React.CSSProperties = { padding: "7px 12px", background: "var(--da-green)", color: "var(--da-dark)", border: 0, borderRadius: 6, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "7px 12px", background: "transparent", color: "var(--da-muted)", border: "1px solid var(--da-border)", borderRadius: 6, cursor: "pointer" };
const label: React.CSSProperties = { color: "var(--da-muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" };
const sectionTitle: React.CSSProperties = { color: "var(--da-text)", fontFamily: "var(--da-font-display)", fontSize: 18, fontWeight: 700 };
const errStyle: React.CSSProperties = { color: "#ff6b6b", fontSize: 13, margin: 0 };

export default function CampaignDetailClient({ detail, advertisers, placements }: Props) {
  const router = useRouter();
  const c = detail.campaign;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Stammdaten
  const [name, setName] = useState(c.name);
  const [isHouse, setIsHouse] = useState(c.is_house);
  const [advertiserId, setAdvertiserId] = useState(c.advertiser_id ?? "");
  const [priceChf, setPriceChf] = useState(c.price_chf != null ? String(c.price_chf) : "");
  const [weight, setWeight] = useState(String(c.weight));
  const [notes, setNotes] = useState(c.notes ?? "");

  // Buchung
  const [bPlacement, setBPlacement] = useState(placements[0]?.id ?? "");
  const [bScope, setBScope] = useState<ScopeKind>("global");
  const [bRessort, setBRessort] = useState(RESSORT_SLUGS[0]?.slug ?? "");
  const [bArticle, setBArticle] = useState("");
  const [bFrom, setBFrom] = useState("");
  const [bTo, setBTo] = useState("");

  // Kreativ
  const [showCreative, setShowCreative] = useState(false);
  const [crId, setCrId] = useState<string | null>(null);
  const [crVariant, setCrVariant] = useState<"desktop" | "mobile">("desktop");
  const [crHeadline, setCrHeadline] = useState("");
  const [crBody, setCrBody] = useState("");
  const [crCta, setCrCta] = useState("");
  const [crUrl, setCrUrl] = useState("");
  const [crActive, setCrActive] = useState(true);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) { setError(res.error ?? "Fehler."); return; }
      after?.();
      router.refresh();
    });
  }

  function resetCreative() {
    setCrId(null); setCrVariant("desktop"); setCrHeadline(""); setCrBody(""); setCrCta(""); setCrUrl(""); setCrActive(true); setShowCreative(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Link href="/autor/admin/werbung" style={{ color: "var(--da-muted)", fontSize: 13, textDecoration: "none" }}>← Alle Kampagnen</Link>
      {error && <p style={errStyle}>{error}</p>}

      {/* Status */}
      <div style={{ ...card, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <span style={label}>Status</span>
        <select
          value={c.status}
          onChange={(e) => run(() => setCampaignStatus(c.id, e.target.value as CampaignStatus))}
          style={{ ...inp, width: "auto" }}
        >
          {CAMPAIGN_STATUSES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
        </select>
        <span style={{ color: "var(--da-muted)", fontSize: 13 }}>aktuell: {statusLabel(c.status)}</span>
        <div style={{ flex: 1 }} />
        <button type="button" style={btnGhost} disabled={pending} onClick={() => { if (confirm("Kampagne löschen? Buchungen und Kreative werden mitgelöscht.")) run(() => deleteCampaign(c.id), () => router.push("/autor/admin/werbung")); }}>Kampagne löschen</button>
      </div>

      {/* Stammdaten */}
      <div style={card}>
        <div style={sectionTitle}>Stammdaten</div>
        <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--da-text)", fontSize: 14 }}>
          <input type="checkbox" checked={isHouse} onChange={(e) => setIsHouse(e.target.checked)} />
          House-Kampagne
        </label>
        {!isHouse && (
          <>
            <div>
              <span style={label}>Kunde</span>
              <select style={inp} value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)}>
                <option value="">— Kunde wählen —</option>
                {advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <input style={inp} placeholder="Preis CHF" inputMode="decimal" value={priceChf} onChange={(e) => setPriceChf(e.target.value)} />
          </>
        )}
        <input style={inp} placeholder="Gewicht 1–10" inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value)} />
        <textarea style={{ ...inp, minHeight: 60 }} placeholder="Notizen" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button type="button" style={{ ...btn, alignSelf: "flex-start" }} disabled={pending} onClick={() => run(() => updateCampaign(c.id, {
          name, is_house: isHouse, advertiser_id: isHouse ? null : advertiserId || null,
          price_chf: isHouse || !priceChf ? null : Number(priceChf), weight: Number(weight) || 1, notes,
        }))}>Stammdaten speichern</button>
      </div>

      {/* Buchungen */}
      <div style={card}>
        <div style={sectionTitle}>Buchungen</div>
        {detail.bookings.length === 0 && <p style={{ color: "var(--da-muted)", fontSize: 14 }}>Keine Buchungen.</p>}
        {detail.bookings.map((b) => (
          <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderTop: "1px solid var(--da-border)", paddingTop: 10 }}>
            <div style={{ fontSize: 14, color: "var(--da-text-strong)" }}>
              <strong style={{ color: "var(--da-text)" }}>{b.placementLabel}</strong>
              {" · "}{b.scope}{b.scope_ref ? ` (${b.scope_ref})` : ""}
              {" · "}<span style={{ color: "var(--da-muted)" }}>{formatPeriod(b.period)}</span>
            </div>
            <button type="button" style={{ ...btnGhost, padding: "2px 8px" }} disabled={pending} onClick={() => run(() => deleteBooking(b.id, c.id))}>×</button>
          </div>
        ))}

        <div style={{ borderTop: "1px solid var(--da-border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={label}>Neue Buchung</span>
          <select style={inp} value={bPlacement} onChange={(e) => setBPlacement(e.target.value)}>
            {placements.map((p) => <option key={p.id} value={p.id}>{p.label}{p.is_sellable ? "" : " (nicht verkäuflich)"}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select style={{ ...inp, flex: 1, minWidth: 140 }} value={bScope} onChange={(e) => setBScope(e.target.value as ScopeKind)}>
              {SCOPE_KINDS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
            {bScope === "ressort" && (
              <select style={{ ...inp, flex: 1, minWidth: 140 }} value={bRessort} onChange={(e) => setBRessort(e.target.value)}>
                {RESSORT_SLUGS.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
              </select>
            )}
            {bScope === "article" && (
              <input style={{ ...inp, flex: 1, minWidth: 140 }} placeholder="Artikel-Slug" value={bArticle} onChange={(e) => setBArticle(e.target.value)} />
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ color: "var(--da-muted)", fontSize: 13 }}>von <input type="date" style={{ ...inp, width: "auto" }} value={bFrom} onChange={(e) => setBFrom(e.target.value)} /></label>
            <label style={{ color: "var(--da-muted)", fontSize: 13 }}>bis <input type="date" style={{ ...inp, width: "auto" }} value={bTo} onChange={(e) => setBTo(e.target.value)} /></label>
            <span style={{ color: "var(--da-faint)", fontSize: 12 }}>leer = unbegrenzt</span>
          </div>
          <button type="button" style={{ ...btn, alignSelf: "flex-start" }} disabled={pending} onClick={() => run(() => createBooking({
            campaign_id: c.id,
            placement_id: bPlacement,
            scope: bScope,
            scope_ref: bScope === "ressort" ? bRessort : bScope === "article" ? bArticle : null,
            from: bFrom ? `${bFrom}T00:00:00.000Z` : "",
            to: bTo ? `${bTo}T23:59:59.000Z` : null,
          }), () => { setBFrom(""); setBTo(""); setBArticle(""); })}>Buchung hinzufügen</button>
        </div>
      </div>

      {/* Kreative */}
      <div style={card}>
        <div style={sectionTitle}>Kreative</div>
        {detail.creatives.length === 0 && <p style={{ color: "var(--da-muted)", fontSize: 14 }}>Keine Kreative.</p>}
        {detail.creatives.map((cr) => (
          <div key={cr.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderTop: "1px solid var(--da-border)", paddingTop: 10 }}>
            <div style={{ fontSize: 14, color: "var(--da-text-strong)" }}>
              <span style={{ color: "var(--da-muted)", fontFamily: "var(--da-font-mono)", fontSize: 12 }}>[{cr.variant}{cr.kind === "image" ? "/Bild" : ""}]</span>{" "}
              <strong style={{ color: "var(--da-text)" }}>{cr.headline}</strong>
              {!cr.is_active && <span style={{ color: "var(--da-faint)", fontSize: 12 }}> · inaktiv</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {cr.kind === "internal" && (
                <button type="button" style={{ ...btnGhost, padding: "2px 8px" }} onClick={() => {
                  setCrId(cr.id); setCrVariant(cr.variant === "mobile" ? "mobile" : "desktop");
                  setCrHeadline(cr.headline ?? ""); setCrBody(cr.body ?? ""); setCrCta(cr.cta_label ?? "");
                  setCrUrl(cr.target_url); setCrActive(cr.is_active); setShowCreative(true);
                }}>Bearb.</button>
              )}
              <button type="button" style={{ ...btnGhost, padding: "2px 8px" }} disabled={pending} onClick={() => run(() => deleteCreative(cr.id, c.id))}>×</button>
            </div>
          </div>
        ))}

        {showCreative ? (
          <div style={{ borderTop: "1px solid var(--da-border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={label}>{crId ? "Kreativ bearbeiten" : "Neues Kreativ"}</span>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ color: "var(--da-text)", fontSize: 14, display: "flex", gap: 6, alignItems: "center" }}>
                Typ
                <select style={{ ...inp, width: "auto" }} value="internal" disabled>
                  <option value="internal">Typografisch</option>
                  <option value="image">Bild — folgt in PR 2</option>
                </select>
              </label>
              <label style={{ color: "var(--da-text)", fontSize: 14, display: "flex", gap: 6, alignItems: "center" }}>
                Variante
                <select style={{ ...inp, width: "auto" }} value={crVariant} onChange={(e) => setCrVariant(e.target.value as "desktop" | "mobile")}>
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                </select>
              </label>
              <label style={{ color: "var(--da-text)", fontSize: 14, display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={crActive} onChange={(e) => setCrActive(e.target.checked)} /> aktiv
              </label>
            </div>
            <input style={inp} placeholder="Headline *" value={crHeadline} onChange={(e) => setCrHeadline(e.target.value)} />
            <textarea style={{ ...inp, minHeight: 50 }} placeholder="Body" value={crBody} onChange={(e) => setCrBody(e.target.value)} />
            <input style={inp} placeholder="CTA-Label" value={crCta} onChange={(e) => setCrCta(e.target.value)} />
            <input style={inp} placeholder="Ziel-URL *" value={crUrl} onChange={(e) => setCrUrl(e.target.value)} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={btn} disabled={pending} onClick={() => run(() => {
                const payload = { variant: crVariant, headline: crHeadline, body: crBody, cta_label: crCta, target_url: crUrl, is_active: crActive };
                return crId
                  ? updateCreative(crId, c.id, payload)
                  : createCreative({ campaign_id: c.id, ...payload });
              }, resetCreative)}>{crId ? "Speichern" : "Hinzufügen"}</button>
              <button type="button" style={btnGhost} onClick={resetCreative}>Abbrechen</button>
            </div>
          </div>
        ) : (
          <button type="button" style={{ ...btnGhost, alignSelf: "flex-start" }} onClick={() => setShowCreative(true)}>+ Kreativ</button>
        )}
      </div>
    </div>
  );
}

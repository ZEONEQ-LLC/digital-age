"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createBooking, createCreative, deleteBooking, deleteCampaign, deleteCreative,
  setCampaignStatus, updateCampaign, updateCreative,
} from "@/lib/ads/adActions";
import {
  CAMPAIGN_STATUSES, RESSORT_SLUGS, SCOPE_KINDS, formatPeriod, statusLabel,
  type CampaignDetail, type CampaignStatus, type PlacementRow, type ScopeKind,
} from "@/lib/ads/types";
import { PLACEMENTS, isPlacementCode } from "@/lib/ads/placements";
import {
  card, errStyle, help, inputStyle, labelStyle, btnPrimary, btnGhost, btnSmall, sectionTitle, th, td, WEIGHTS,
} from "../formStyles";

type Props = {
  detail: CampaignDetail;
  advertisers: { id: string; name: string }[];
  placements: PlacementRow[];
};

const scopeLabel = (code: string) => SCOPE_KINDS.find((s) => s.code === code)?.label ?? code;
const ressortLabel = (slug: string) => RESSORT_SLUGS.find((r) => r.slug === slug)?.label ?? slug;

export default function CampaignDetailClient({ detail, advertisers, placements }: Props) {
  const router = useRouter();
  const c = detail.campaign;
  const isHouse = c.is_house; // E2: nach dem Anlegen unveraenderlich
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Stammdaten
  const [name, setName] = useState(c.name);
  const [advertiserId, setAdvertiserId] = useState(c.advertiser_id ?? "");
  const [priceChf, setPriceChf] = useState(c.price_chf != null ? String(c.price_chf) : "");
  const [weight, setWeight] = useState(String(c.weight));
  const [notes, setNotes] = useState(c.notes ?? "");

  // Buchung — E6: fuer Kundenkampagnen nur verkaeufliche Platzierungen anbieten.
  const bookable = useMemo(() => placements.filter((p) => isHouse || p.is_sellable), [placements, isHouse]);
  const [bPlacement, setBPlacement] = useState(bookable[0]?.id ?? "");
  const [bScope, setBScope] = useState<ScopeKind>("global");
  const [bRessort, setBRessort] = useState(RESSORT_SLUGS[0]?.slug ?? "");
  const [bArticle, setBArticle] = useState("");
  const [bFrom, setBFrom] = useState("");
  const [bTo, setBTo] = useState("");

  const selectedPlacement = bookable.find((p) => p.id === bPlacement);
  const geo = selectedPlacement && isPlacementCode(selectedPlacement.code) ? PLACEMENTS[selectedPlacement.code] : undefined;
  const allowedScopes: ScopeKind[] = geo?.allowedScopes ?? ["global"];
  const allowedRessorts = geo?.allowedRessorts
    ? RESSORT_SLUGS.filter((r) => geo.allowedRessorts!.includes(r.slug))
    : RESSORT_SLUGS;

  function choosePlacement(id: string) {
    setBPlacement(id);
    const p = bookable.find((x) => x.id === id);
    const g = p && isPlacementCode(p.code) ? PLACEMENTS[p.code] : undefined;
    const scopes: ScopeKind[] = g?.allowedScopes ?? ["global"];
    if (!scopes.includes(bScope)) setBScope("global");
    const ressorts = g?.allowedRessorts ? RESSORT_SLUGS.filter((r) => g.allowedRessorts!.includes(r.slug)) : RESSORT_SLUGS;
    if (!ressorts.some((r) => r.slug === bRessort)) setBRessort(ressorts[0]?.slug ?? "");
  }

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

  const hasRef = bScope !== "global";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        .cd-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .cd-row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .cd-booking { display: grid; gap: 16px; align-items: end; }
        .cd-booking--ref   { grid-template-columns: 1.4fr 1fr 1fr auto auto auto; }
        .cd-booking--noref { grid-template-columns: 1.4fr 1fr auto auto auto; }
        @media (max-width: 1023px) {
          .cd-booking--ref, .cd-booking--noref { grid-template-columns: 1fr 1fr 1fr; }
        }
        @media (max-width: 767px) {
          .cd-row2, .cd-row3, .cd-booking--ref, .cd-booking--noref { grid-template-columns: 1fr; }
        }
        .cd-table { width: 100%; border-collapse: collapse; }
      `}</style>

      <Link href="/autor/admin/werbung" style={{ color: "var(--da-muted)", fontSize: 13, textDecoration: "none" }}>← Alle Kampagnen</Link>
      {error && <p style={errStyle}>{error}</p>}

      {/* Status */}
      <div style={{ ...card, display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <span style={{ ...labelStyle, marginBottom: 0 }}>Status</span>
        <select value={c.status} onChange={(e) => run(() => setCampaignStatus(c.id, e.target.value as CampaignStatus))} style={{ ...inputStyle, width: "auto" }}>
          {CAMPAIGN_STATUSES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
        </select>
        <span style={{ color: "var(--da-muted)", fontSize: 13 }}>aktuell: {statusLabel(c.status)}</span>
        <div style={{ flex: 1 }} />
        <button type="button" style={btnGhost} disabled={pending} onClick={() => { if (confirm("Kampagne löschen? Buchungen und Kreative werden mitgelöscht.")) run(() => deleteCampaign(c.id), () => router.push("/autor/admin/werbung")); }}>Kampagne löschen</button>
      </div>

      {/* Stammdaten */}
      <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={sectionTitle}>Stammdaten</div>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Art</span>
          <span style={{ color: "var(--da-text)", fontSize: 14 }}>{isHouse ? "House-Kampagne" : "Kunden-Kampagne"}</span>
          <span style={{ ...help, margin: 0 }}>— nach dem Anlegen nicht änderbar</span>
        </div>
        <div>
          <label style={labelStyle} htmlFor="cd-name">Kampagnen-Name</label>
          <input id="cd-name" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name der Kampagne" />
        </div>
        {isHouse ? (
          <div className="cd-row2">
            <div>
              <label style={labelStyle} htmlFor="cd-weight">Rotationsgewicht</label>
              <select id="cd-weight" style={inputStyle} value={weight} onChange={(e) => setWeight(e.target.value)}>
                {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              <p style={help}>Nur relevant, wenn mehrere Kampagnen dieselbe Fläche belegen.</p>
            </div>
            <div />
          </div>
        ) : advertisers.length === 0 ? (
          <p style={{ color: "var(--da-muted)", fontSize: 13, margin: 0 }}>
            Noch keine Kunden angelegt.{" "}
            <Link href="/autor/admin/werbung/kunden" style={{ color: "var(--da-green)" }}>Kunde anlegen →</Link>
          </p>
        ) : (
          <div className="cd-row3">
            <div>
              <label style={labelStyle} htmlFor="cd-adv">Kunde</label>
              <select id="cd-adv" style={inputStyle} value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)}>
                <option value="">— Kunde wählen —</option>
                {advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="cd-price">Preis CHF</label>
              <input id="cd-price" style={inputStyle} placeholder="z. B. 1500" inputMode="decimal" value={priceChf} onChange={(e) => setPriceChf(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="cd-weight">Rotationsgewicht</label>
              <select id="cd-weight" style={inputStyle} value={weight} onChange={(e) => setWeight(e.target.value)}>
                {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              <p style={help}>Nur relevant, wenn mehrere Kampagnen dieselbe Fläche belegen.</p>
            </div>
          </div>
        )}
        <div>
          <label style={labelStyle} htmlFor="cd-notes">Notizen</label>
          <textarea id="cd-notes" style={{ ...inputStyle, minHeight: 60 }} placeholder="Interne Notizen" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" style={btnPrimary} disabled={pending} onClick={() => run(() => updateCampaign(c.id, {
            name, is_house: isHouse, advertiser_id: isHouse ? null : advertiserId || null,
            price_chf: isHouse || !priceChf ? null : Number(priceChf), weight: Number(weight), notes,
          }))}>Stammdaten speichern</button>
        </div>
      </div>

      {/* Buchungen */}
      <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={sectionTitle}>Buchungen</div>
        {detail.bookings.length === 0 ? (
          <p style={{ color: "var(--da-muted)", fontSize: 14, margin: 0 }}>Keine Buchungen.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="cd-table">
              <thead>
                <tr>
                  <th style={th}>Platzierung</th>
                  <th style={th}>Geltungsbereich</th>
                  <th style={th}>Referenz</th>
                  <th style={th}>Zeitraum</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {detail.bookings.map((b) => (
                  <tr key={b.id}>
                    <td style={{ ...td, color: "var(--da-text)", fontWeight: 600 }}>{b.placementLabel}</td>
                    <td style={td}>{scopeLabel(b.scope)}</td>
                    <td style={td}>{b.scope === "global" ? "—" : b.scope === "ressort" ? ressortLabel(b.scope_ref ?? "") : b.scope_ref}</td>
                    <td style={{ ...td, color: "var(--da-muted)" }}>{formatPeriod(b.period)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button type="button" style={btnSmall} disabled={pending} onClick={() => run(() => deleteBooking(b.id, c.id))}>Löschen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--da-border)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={labelStyle}>Neue Buchung</span>
          {bookable.length === 0 ? (
            <p style={{ color: "var(--da-muted)", fontSize: 13, margin: 0 }}>Keine buchbare Platzierung für diese Kampagne.</p>
          ) : (
            <>
              <div className={`cd-booking ${hasRef ? "cd-booking--ref" : "cd-booking--noref"}`}>
                <div>
                  <label style={labelStyle} htmlFor="bk-placement">Platzierung</label>
                  <select id="bk-placement" style={inputStyle} value={bPlacement} onChange={(e) => choosePlacement(e.target.value)}>
                    {bookable.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="bk-scope">Geltungsbereich</label>
                  <select id="bk-scope" style={inputStyle} value={bScope} onChange={(e) => setBScope(e.target.value as ScopeKind)}>
                    {SCOPE_KINDS.filter((s) => allowedScopes.includes(s.code)).map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
                  </select>
                </div>
                {bScope === "ressort" && (
                  <div>
                    <label style={labelStyle} htmlFor="bk-ressort">Ressort</label>
                    <select id="bk-ressort" style={inputStyle} value={bRessort} onChange={(e) => setBRessort(e.target.value)}>
                      {allowedRessorts.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
                    </select>
                  </div>
                )}
                {bScope === "article" && (
                  <div>
                    <label style={labelStyle} htmlFor="bk-article">Artikel-Slug</label>
                    <input id="bk-article" style={inputStyle} placeholder="z. B. mein-artikel" value={bArticle} onChange={(e) => setBArticle(e.target.value)} />
                  </div>
                )}
                <div>
                  <label style={labelStyle} htmlFor="bk-from">von</label>
                  <input id="bk-from" type="date" style={{ ...inputStyle, width: "auto" }} value={bFrom} onChange={(e) => setBFrom(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="bk-to">bis</label>
                  <input id="bk-to" type="date" style={{ ...inputStyle, width: "auto" }} value={bTo} onChange={(e) => setBTo(e.target.value)} />
                </div>
                <div>
                  <button type="button" style={btnPrimary} disabled={pending} onClick={() => run(() => createBooking({
                    campaign_id: c.id,
                    placement_id: bPlacement,
                    scope: bScope,
                    scope_ref: bScope === "ressort" ? bRessort : bScope === "article" ? bArticle : null,
                    from: bFrom,
                    to: bTo || null,
                  }), () => { setBFrom(""); setBTo(""); setBArticle(""); })}>Hinzufügen</button>
                </div>
              </div>
              <p style={help}>Zürcher Kalendertage, Enddatum inklusiv, leer = unbegrenzt. Die Datumsfelder zeigen das Format deines Betriebssystems.</p>
            </>
          )}
        </div>
      </div>

      {/* Kreative */}
      <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={sectionTitle}>Kreative</div>
        {detail.creatives.length === 0 ? (
          <p style={{ color: "var(--da-muted)", fontSize: 14, margin: 0 }}>Keine Kreative.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="cd-table">
              <thead>
                <tr>
                  <th style={th}>Variante</th>
                  <th style={th}>Headline</th>
                  <th style={th}>Ziel-URL</th>
                  <th style={th}>Aktiv</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {detail.creatives.map((cr) => (
                  <tr key={cr.id}>
                    <td style={{ ...td, fontFamily: "var(--da-font-mono)", fontSize: 12, color: "var(--da-muted)" }}>{cr.variant}{cr.kind === "image" ? " · Bild" : ""}</td>
                    <td style={{ ...td, color: "var(--da-text)", fontWeight: 600 }}>{cr.headline}</td>
                    <td style={{ ...td, color: "var(--da-muted)", fontFamily: "var(--da-font-mono)", fontSize: 12, wordBreak: "break-all" }}>{cr.target_url}</td>
                    <td style={td}>{cr.is_active ? "ja" : "nein"}</td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      {cr.kind === "internal" && (
                        <button type="button" style={{ ...btnSmall, marginRight: 6 }} onClick={() => {
                          setCrId(cr.id); setCrVariant(cr.variant === "mobile" ? "mobile" : "desktop");
                          setCrHeadline(cr.headline ?? ""); setCrBody(cr.body ?? ""); setCrCta(cr.cta_label ?? "");
                          setCrUrl(cr.target_url); setCrActive(cr.is_active); setShowCreative(true);
                        }}>Bearbeiten</button>
                      )}
                      <button type="button" style={btnSmall} disabled={pending} onClick={() => run(() => deleteCreative(cr.id, c.id))}>Löschen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showCreative ? (
          <div style={{ borderTop: "1px solid var(--da-border)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={labelStyle}>{crId ? "Kreativ bearbeiten" : "Neues Kreativ"}</span>
            <div className="cd-row3">
              <div>
                <label style={labelStyle} htmlFor="cr-kind">Typ</label>
                {/* Bild-Option sichtbar, aber deaktiviert — Upload folgt in PR 2. */}
                <select id="cr-kind" style={inputStyle} value="internal" onChange={() => {}}>
                  <option value="internal">Typografisch</option>
                  <option value="image" disabled>Bild (folgt in PR 2)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="cr-variant">Variante</label>
                <select id="cr-variant" style={inputStyle} value={crVariant} onChange={(e) => setCrVariant(e.target.value as "desktop" | "mobile")}>
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                </select>
              </div>
              <div>
                <span style={labelStyle}>Status</span>
                <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--da-text)", fontSize: 14, minHeight: 38 }}>
                  <input type="checkbox" checked={crActive} onChange={(e) => setCrActive(e.target.checked)} /> aktiv
                </label>
              </div>
            </div>
            <div>
              <label style={labelStyle} htmlFor="cr-headline">Headline *</label>
              <input id="cr-headline" style={inputStyle} placeholder="Kurze, prägnante Zeile" value={crHeadline} onChange={(e) => setCrHeadline(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle} htmlFor="cr-body">Body</label>
              <textarea id="cr-body" style={{ ...inputStyle, minHeight: 60 }} placeholder="Optionaler Beschreibungstext" value={crBody} onChange={(e) => setCrBody(e.target.value)} />
            </div>
            <div className="cd-row2">
              <div>
                <label style={labelStyle} htmlFor="cr-cta">CTA-Label</label>
                <input id="cr-cta" style={inputStyle} placeholder="z. B. Jetzt entdecken" value={crCta} onChange={(e) => setCrCta(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="cr-url">Ziel-URL *</label>
                <input id="cr-url" style={inputStyle} placeholder="/newsletter oder https://…" value={crUrl} onChange={(e) => setCrUrl(e.target.value)} />
              </div>
            </div>
            <p style={help}>Aktivierung auf Live verlangt ein aktives Desktop-Kreativ; Mobile zusätzlich, sobald eine gebuchte Platzierung mobil ausliefert.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" style={btnGhost} onClick={resetCreative}>Abbrechen</button>
              <button type="button" style={btnPrimary} disabled={pending} onClick={() => run(() => {
                const payload = { variant: crVariant, headline: crHeadline, body: crBody, cta_label: crCta, target_url: crUrl, is_active: crActive };
                return crId ? updateCreative(crId, c.id, payload) : createCreative({ campaign_id: c.id, ...payload });
              }, resetCreative)}>{crId ? "Speichern" : "Hinzufügen"}</button>
            </div>
          </div>
        ) : (
          <div>
            <button type="button" style={btnGhost} onClick={() => setShowCreative(true)}>+ Kreativ</button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createBooking, createCreative, deleteBooking, deleteCampaign, deleteCreative,
  regeneratePreviewToken, setCampaignStatus, updateCampaign, updateCreative,
} from "@/lib/ads/adActions";
import { deleteCreativeImage } from "@/lib/ads/imageActions";
import { moduleImageUrl } from "@/lib/ads/imagePath";
import {
  CAMPAIGN_STATUSES, CREATIVE_THEMES, RESSORT_SLUGS, SCOPE_KINDS, formatPeriod, statusLabel,
  type BookingShare, type CampaignDetail, type CampaignStatus, type CreativeKind, type PlacementRow, type ScopeKind,
} from "@/lib/ads/types";
import { PLACEMENTS, isPlacementCode, type PlacementCode } from "@/lib/ads/placements";
import { isHex, resolveTheme } from "@/lib/ads/creativeTheme";
import ModuleCard from "@/components/module/ModuleCard";
import CreativeImageUploader, { formatHint, type CreativeImage } from "@/components/module/CreativeImageUploader";
import {
  card, errStyle, help, inputStyle, labelStyle, btnPrimary, btnGhost, btnSmall, sectionTitle, th, td, WEIGHTS,
} from "../formStyles";

type Props = {
  detail: CampaignDetail;
  advertisers: { id: string; name: string }[];
  placements: PlacementRow[];
  previewBase: string;
};

const scopeLabel = (code: string) => SCOPE_KINDS.find((s) => s.code === code)?.label ?? code;
const ressortLabel = (slug: string) => RESSORT_SLUGS.find((r) => r.slug === slug)?.label ?? slug;
const themeLabel = (code: string) => CREATIVE_THEMES.find((t) => t.code === code)?.label ?? code;

const WEIGHT_HELP = "Anteil an der Rotation im Verhältnis zu den anderen Live-Kampagnen auf derselben Fläche. Beispiel: diese Kampagne 3, eine andere 1 → diese erscheint bei 3 von 4 Aufrufen. Allein auf der Fläche: immer, unabhängig vom Wert. House-Kampagnen laufen nur, wenn keine Kundenkampagne live ist.";

function shareText(s: BookingShare): { text: string; orange: boolean } {
  if (s.reason) return { text: `0 % · ${s.reason}`, orange: true };
  if (s.sharePct === 100 && s.othersCount === 0) return { text: "100 % · allein", orange: false };
  return { text: `${s.sharePct} % · neben ${s.othersCount}`, orange: false };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });
}

export default function CampaignDetailClient({ detail, advertisers, placements, previewBase }: Props) {
  const router = useRouter();
  const c = detail.campaign;
  const isHouse = c.is_house; // E2: nach dem Anlegen unveraenderlich
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  // "(gebucht: …)"-Suffix pro Platzierung: welche Scopes diese Kampagne dort schon belegt.
  const bookedByPlacement = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const b of detail.bookings) {
      const label = b.scope === "global" ? "global" : b.scope === "ressort" ? `Ressort ${ressortLabel(b.scope_ref ?? "")}` : `Artikel ${b.scope_ref ?? ""}`;
      const list = m.get(b.placement_id) ?? [];
      if (!list.includes(label)) list.push(label);
      m.set(b.placement_id, list);
    }
    return m;
  }, [detail.bookings]);

  // Platzierungen fuer das Kreativ-Formular: gebuchte zuerst, dann alle anderen.
  const bookedPlacements = useMemo(() => placements.filter((p) => bookedByPlacement.has(p.id)), [placements, bookedByPlacement]);
  const otherPlacements = useMemo(() => placements.filter((p) => !bookedByPlacement.has(p.id)), [placements, bookedByPlacement]);
  const placementById = useMemo(() => new Map(placements.map((p) => [p.id, p])), [placements]);
  const placementLabel = (id: string | null) => (id ? placementById.get(id)?.label ?? "?" : "alle");
  const placementCodeOf = (id: string | null): PlacementCode | null => {
    const code = id ? placementById.get(id)?.code : undefined;
    return code && isPlacementCode(code) ? code : null;
  };

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
  const [crKind, setCrKind] = useState<CreativeKind>("internal");
  const [crVariant, setCrVariant] = useState<"desktop" | "mobile">("desktop");
  const [crPlacementId, setCrPlacementId] = useState<string>("");
  const [crHeadline, setCrHeadline] = useState("");
  const [crBody, setCrBody] = useState("");
  const [crCta, setCrCta] = useState("");
  const [crUrl, setCrUrl] = useState("");
  const [crActive, setCrActive] = useState(true);
  const [crTheme, setCrTheme] = useState("card");
  const [crBg, setCrBg] = useState("#1c1c1e");
  const [crImage, setCrImage] = useState<CreativeImage | null>(null);
  const [crImageOriginal, setCrImageOriginal] = useState<string | null>(null);
  const [crAlt, setCrAlt] = useState("");
  const bgInvalid = crKind === "internal" && crTheme === "custom" && !isHex(crBg);
  const crPlacementCode = placementCodeOf(crPlacementId || null);
  const crLayout = crPlacementCode ? PLACEMENTS[crPlacementCode].layout : "wide";
  const imageIncomplete = crKind === "image" && (!crPlacementId || !crImage || !crAlt.trim());

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
    setCrId(null); setCrKind("internal"); setCrVariant("desktop"); setCrPlacementId("");
    setCrHeadline(""); setCrBody(""); setCrCta(""); setCrUrl("");
    setCrActive(true); setCrTheme("card"); setCrBg("#1c1c1e");
    setCrImage(null); setCrImageOriginal(null); setCrAlt(""); setShowCreative(false);
  }

  // Abbrechen nach Upload ohne Speichern: hochgeladene Datei wieder entfernen.
  async function cancelCreative() {
    if (crImage && crImage.path !== crImageOriginal) {
      try { await deleteCreativeImage(crImage.path); } catch { /* ignore */ }
    }
    resetCreative();
  }

  function copyPreviewLink(url: string) {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function changeStatus(next: CampaignStatus) {
    if (next === "live" && !isHouse && !c.approved_at) {
      if (!confirm("Der Kunde hat noch nicht freigegeben. Trotzdem live schalten?")) return;
    }
    run(() => setCampaignStatus(c.id, next));
  }

  const hasRef = bScope !== "global";
  const shareTitle = `Anteil = Gewicht ${c.weight} / (${c.weight} + Summe der Gewichte der anderen Live-Kampagnen auf derselben Fläche und Ebene, überlappender Zeitraum). Nicht-House schlägt House.`;
  const previewUrl = `${previewBase}/vorschau/${c.preview_token}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        .cd-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .cd-row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .cd-booking { display: grid; gap: 16px; align-items: end; }
        .cd-booking--ref   { grid-template-columns: 1.4fr 1fr 1fr auto auto auto; }
        .cd-booking--noref { grid-template-columns: 1.4fr 1fr auto auto auto; }
        .cd-preview { display: grid; grid-template-columns: 1fr 300px; gap: 16px; align-items: start; }
        @media (max-width: 1023px) {
          .cd-booking--ref, .cd-booking--noref { grid-template-columns: 1fr 1fr 1fr; }
          .cd-preview { grid-template-columns: 1fr; }
        }
        @media (max-width: 767px) {
          .cd-row2, .cd-row3, .cd-booking--ref, .cd-booking--noref { grid-template-columns: 1fr; }
        }
        .cd-table { width: 100%; border-collapse: collapse; }
        .cd-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid var(--da-border); vertical-align: -2px; margin-right: 6px; }
        .cd-thumb { display: block; height: 40px; width: auto; max-width: 160px; border-radius: 4px; border: 1px solid var(--da-border); }
        .cd-link { color: var(--da-green); font-family: var(--da-font-mono); font-size: 12px; word-break: break-all; text-decoration: none; }
        .cd-link:hover { text-decoration: underline; }
      `}</style>

      <Link href="/autor/admin/werbung" style={{ color: "var(--da-muted)", fontSize: 13, textDecoration: "none" }}>← Alle Kampagnen</Link>
      {error && <p style={errStyle}>{error}</p>}

      {/* Status */}
      <div style={{ ...card, display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <span style={{ ...labelStyle, marginBottom: 0 }}>Status</span>
        <select value={c.status} onChange={(e) => changeStatus(e.target.value as CampaignStatus)} style={{ ...inputStyle, width: "auto" }}>
          {CAMPAIGN_STATUSES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
        </select>
        <span style={{ color: "var(--da-muted)", fontSize: 13 }}>aktuell: {statusLabel(c.status)}</span>
        <div style={{ flex: 1 }} />
        <button type="button" style={btnGhost} disabled={pending} onClick={() => { if (confirm("Kampagne löschen? Buchungen und Kreative werden mitgelöscht.")) run(() => deleteCampaign(c.id), () => router.push("/autor/admin/werbung")); }}>Kampagne löschen</button>
      </div>

      {/* Vorschau-Link + Freigabe (G5) — nur Kundenkampagnen */}
      {!isHouse && (
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={sectionTitle}>Vorschau für den Kunden</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <a className="cd-link" href={previewUrl} target="_blank" rel="noopener">{previewUrl}</a>
            <button type="button" style={btnSmall} onClick={() => copyPreviewLink(previewUrl)}>{copied ? "Kopiert" : "Kopieren"}</button>
            <button type="button" style={btnSmall} disabled={pending} onClick={() => { if (confirm("Der alte Link wird ungültig.")) run(() => regeneratePreviewToken(c.id)); }}>Link erneuern</button>
          </div>
          <div style={{ color: c.approved_at ? "var(--da-green)" : "var(--da-muted)", fontSize: 14 }}>
            {c.approved_at ? `Freigegeben am ${formatDate(c.approved_at)} von ${c.approved_by ?? "—"}` : "Noch nicht freigegeben"}
          </div>
          {c.approved_note && <p style={{ color: "var(--da-muted)", fontSize: 13, margin: 0, whiteSpace: "pre-wrap" }}>{c.approved_note}</p>}
          <p style={help}>Der Kunde sieht Kreative und Buchungen, keine Adresse und keinen Preis. Mit ?vorschau=&lt;Token&gt; zeigt jede öffentliche Seite die Kampagne an ihren echten Positionen. Die Freigabe ist Information, kein Gate für live.</p>
        </div>
      )}

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
              <p style={help}>{WEIGHT_HELP}</p>
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
              <p style={help}>{WEIGHT_HELP}</p>
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
                  <th style={th}>Anteil (wenn live)</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {detail.bookings.map((b) => {
                  const s = shareText(b.share);
                  return (
                    <tr key={b.id}>
                      <td style={{ ...td, color: "var(--da-text)", fontWeight: 600 }}>{b.placementLabel}</td>
                      <td style={td}>{scopeLabel(b.scope)}</td>
                      <td style={td}>{b.scope === "global" ? "—" : b.scope === "ressort" ? ressortLabel(b.scope_ref ?? "") : b.scope_ref}</td>
                      <td style={{ ...td, color: "var(--da-muted)" }}>{formatPeriod(b.period)}</td>
                      <td style={{ ...td, color: s.orange ? "var(--da-orange)" : "var(--da-text-strong)", whiteSpace: "nowrap" }} title={shareTitle}>{s.text}</td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <button type="button" style={btnSmall} disabled={pending} onClick={() => run(() => deleteBooking(b.id, c.id))}>Löschen</button>
                      </td>
                    </tr>
                  );
                })}
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
                    {bookable.map((p) => {
                      const booked = bookedByPlacement.get(p.id);
                      return <option key={p.id} value={p.id}>{p.label}{booked ? ` (gebucht: ${booked.join(", ")})` : ""}</option>;
                    })}
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
                  <th style={th}>Platzierung</th>
                  <th style={th}>Headline / Motiv</th>
                  <th style={th}>Gestaltung</th>
                  <th style={th}>Ziel-URL</th>
                  <th style={th}>Aktiv</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {detail.creatives.map((cr) => {
                  const t = resolveTheme(cr.theme, cr.bg_color);
                  return (
                    <tr key={cr.id}>
                      <td style={{ ...td, fontFamily: "var(--da-font-mono)", fontSize: 12, color: "var(--da-muted)" }}>{cr.variant}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{placementLabel(cr.placement_id)}</td>
                      <td style={{ ...td, color: "var(--da-text)", fontWeight: 600 }}>
                        {cr.kind === "image" && cr.image_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="cd-thumb" src={moduleImageUrl(cr.image_path)} alt={cr.alt_text ?? ""} title={`${cr.width ?? "?"} × ${cr.height ?? "?"} px`} />
                        ) : cr.headline}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        {cr.kind === "image" ? (
                          <span style={{ color: "var(--da-muted)" }}>Bild {cr.width && cr.height ? `${cr.width} × ${cr.height}` : ""}</span>
                        ) : (
                          <>
                            <span className="cd-swatch" style={{ background: t.background }} aria-hidden="true" />
                            {themeLabel(cr.theme)}{cr.theme === "custom" && cr.bg_color ? ` ${cr.bg_color}` : ""}
                          </>
                        )}
                      </td>
                      <td style={{ ...td, color: "var(--da-muted)", fontFamily: "var(--da-font-mono)", fontSize: 12, wordBreak: "break-all" }}>{cr.target_url}</td>
                      <td style={td}>{cr.is_active ? "ja" : "nein"}</td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                        <button type="button" style={{ ...btnSmall, marginRight: 6 }} onClick={() => {
                          setCrId(cr.id); setCrKind(cr.kind === "image" ? "image" : "internal");
                          setCrVariant(cr.variant === "mobile" ? "mobile" : "desktop");
                          setCrPlacementId(cr.placement_id ?? "");
                          setCrHeadline(cr.headline ?? ""); setCrBody(cr.body ?? ""); setCrCta(cr.cta_label ?? "");
                          setCrUrl(cr.target_url); setCrActive(cr.is_active);
                          setCrTheme(cr.theme); setCrBg(cr.bg_color ?? "#1c1c1e");
                          const img = cr.kind === "image" && cr.image_path && cr.width && cr.height
                            ? { path: cr.image_path, width: cr.width, height: cr.height } : null;
                          setCrImage(img); setCrImageOriginal(img?.path ?? null); setCrAlt(cr.alt_text ?? "");
                          setShowCreative(true);
                        }}>Bearbeiten</button>
                        <button type="button" style={btnSmall} disabled={pending} onClick={() => run(() => deleteCreative(cr.id, c.id))}>Löschen</button>
                      </td>
                    </tr>
                  );
                })}
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
                <select id="cr-kind" style={inputStyle} value={crKind} onChange={(e) => setCrKind(e.target.value as CreativeKind)}>
                  <option value="internal">Typografisch</option>
                  <option value="image">Bild</option>
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

            {/* Platzierung: bei Bild Pflicht (G1), bei Typografisch optional ("alle"). */}
            <div className="cd-row2">
              <div>
                <label style={labelStyle} htmlFor="cr-placement">Platzierung{crKind === "image" ? " *" : ""}</label>
                <select id="cr-placement" style={inputStyle} value={crPlacementId} onChange={(e) => setCrPlacementId(e.target.value)}>
                  {crKind === "internal" ? <option value="">alle Platzierungen</option> : <option value="">— Platzierung wählen —</option>}
                  {bookedPlacements.length > 0 && (
                    <optgroup label="Gebucht">
                      {bookedPlacements.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </optgroup>
                  )}
                  {otherPlacements.length > 0 && (
                    <optgroup label="Andere …">
                      {otherPlacements.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </optgroup>
                  )}
                </select>
                {crKind === "image" && <p style={help}>Erwartet: {formatHint(crPlacementCode, crVariant)}</p>}
              </div>
              {crKind === "internal" ? (
                <div>
                  <label style={labelStyle} htmlFor="cr-theme">Gestaltung</label>
                  <select id="cr-theme" style={inputStyle} value={crTheme} onChange={(e) => setCrTheme(e.target.value)}>
                    {CREATIVE_THEMES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
                  </select>
                </div>
              ) : <div />}
            </div>

            {crKind === "internal" && crTheme === "custom" && (
              <div className="cd-row2">
                <div>
                  <label style={labelStyle} htmlFor="cr-bg">Hintergrundfarbe</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" aria-label="Hintergrundfarbe wählen" value={isHex(crBg) ? crBg : "#1c1c1e"} onChange={(e) => setCrBg(e.target.value.toLowerCase())} style={{ width: 44, height: 38, padding: 2, border: "1px solid var(--da-border)", borderRadius: 4, background: "var(--da-dark)" }} />
                    <input id="cr-bg" style={{ ...inputStyle, fontFamily: "var(--da-font-mono)" }} placeholder="#1a237e" value={crBg} onChange={(e) => setCrBg(e.target.value.trim().toLowerCase())} />
                  </div>
                  {bgInvalid && <p style={{ ...errStyle, marginTop: 6 }}>Ungültiger HEX-Wert — Format #rrggbb.</p>}
                </div>
                <div />
              </div>
            )}

            {crKind === "image" ? (
              <>
                <div>
                  <label style={labelStyle}>Motiv *</label>
                  <CreativeImageUploader
                    campaignId={c.id}
                    variant={crVariant}
                    placementCode={crPlacementCode}
                    value={crImage}
                    onChange={setCrImage}
                  />
                </div>
                <div className="cd-row2">
                  <div>
                    <label style={labelStyle} htmlFor="cr-alt">Alt-Text *</label>
                    <input id="cr-alt" style={inputStyle} placeholder="Was ist auf dem Motiv zu sehen?" value={crAlt} onChange={(e) => setCrAlt(e.target.value)} maxLength={200} />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="cr-url">Ziel-URL *</label>
                    <input id="cr-url" style={inputStyle} placeholder="https://…" value={crUrl} onChange={(e) => setCrUrl(e.target.value)} />
                  </div>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}

            {/* Live-Vorschau: dasselbe Markup wie die Auslieferung (ModuleCard), nicht klickbar. */}
            <div>
              <span style={labelStyle}>Vorschau</span>
              {crKind === "image" ? (
                crImage ? (
                  <div style={{ display: "flex", width: crLayout === "stacked" ? 300 : "100%", maxWidth: "100%" }}>
                    <ModuleCard layout={crLayout} kind="image" isHouse={isHouse} href="#" src={moduleImageUrl(crImage.path)} w={crImage.width} h={crImage.height} alt={crAlt} eager preview />
                  </div>
                ) : (
                  <p style={{ ...help, margin: 0 }}>Motiv hochladen, um die Vorschau zu sehen.</p>
                )
              ) : (
                <div className="cd-preview">
                  <div style={{ display: "flex", minHeight: 132 }}>
                    <ModuleCard layout="wide" isHouse={isHouse} headline={crHeadline || "Headline"} body={crBody || null} ctaLabel={crCta || null} href="#" theme={crTheme} bg={crBg} preview />
                  </div>
                  <div style={{ display: "flex", minHeight: 168 }}>
                    <ModuleCard layout="stacked" isHouse={isHouse} headline={crHeadline || "Headline"} body={crBody || null} ctaLabel={crCta || null} href="#" theme={crTheme} bg={crBg} preview />
                  </div>
                </div>
              )}
            </div>

            <p style={help}>Aktivierung auf Live verlangt je gebuchter Platzierung ein aktives Desktop-Kreativ (Platzierung passend oder „alle“); Mobile zusätzlich, sobald die Platzierung mobil ausliefert.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" style={btnGhost} onClick={() => void cancelCreative()}>Abbrechen</button>
              <button type="button" style={btnPrimary} disabled={pending || bgInvalid || imageIncomplete} onClick={() => run(() => {
                const payload = {
                  kind: crKind,
                  variant: crVariant,
                  placement_id: crPlacementId || null,
                  headline: crHeadline, body: crBody, cta_label: crCta, target_url: crUrl, is_active: crActive,
                  theme: crTheme, bg_color: crTheme === "custom" ? crBg : null,
                  image_path: crImage?.path ?? null, width: crImage?.width ?? null, height: crImage?.height ?? null,
                  alt_text: crAlt,
                };
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

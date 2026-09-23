"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createBooking, createCreative, deleteBooking, deleteCampaign, deleteCreative, deleteImageCreativePair,
  exportCampaignStatsRows, regeneratePreviewToken, saveImageCreativePair, setCampaignStatus, updateCampaign, updateCreative,
} from "@/lib/ads/adActions";
import type { CampaignStats } from "@/lib/ads/statsApi";
import { COUNT_RULE_DU, formatCount, formatCtr, formatRuntime } from "@/lib/ads/statsFormat";
import StatCell from "@/components/author/StatCell";
import StatsSeries from "@/components/module/StatsSeries";
import { deleteCreativeImage } from "@/lib/ads/imageActions";
import { moduleImageUrl } from "@/lib/ads/imagePath";
import {
  CAMPAIGN_STATUSES, CREATIVE_THEMES, RESSORT_SLUGS, SCOPE_KINDS, formatPeriod, statusLabel,
  type BookingShare, type CampaignDetail, type CampaignStatus, type CreativeKind, type CreativeRow, type PlacementRow, type ScopeKind,
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
  stats: CampaignStats;
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

// Bild-Kreative sind im Admin ein Paar je Platzierung (H1); Datenmodell bleibt
// eine Zeile pro Variante.
type ImagePair = { placementId: string; desktop: CreativeRow | null; mobile: CreativeRow | null };

function toImage(cr: CreativeRow | null): CreativeImage | null {
  return cr && cr.image_path && cr.width && cr.height ? { path: cr.image_path, width: cr.width, height: cr.height } : null;
}

// CSV: Semikolon (Excel CH), UTF-8 mit BOM, Muster AdminNewsletterClient.downloadCsv.
function csvCell(v: string | number): string {
  const t = String(v);
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "kampagne";
}

export default function CampaignDetailClient({ detail, advertisers, placements, previewBase, stats }: Props) {
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

  const bookedPlacements = useMemo(() => placements.filter((p) => bookedByPlacement.has(p.id)), [placements, bookedByPlacement]);
  const otherPlacements = useMemo(() => placements.filter((p) => !bookedByPlacement.has(p.id)), [placements, bookedByPlacement]);
  const placementById = useMemo(() => new Map(placements.map((p) => [p.id, p])), [placements]);
  const placementLabel = (id: string | null) => (id ? placementById.get(id)?.label ?? "?" : "alle");
  const placementCodeOf = (id: string | null): PlacementCode | null => {
    const code = id ? placementById.get(id)?.code : undefined;
    return code && isPlacementCode(code) ? code : null;
  };
  const placementHasMobile = (id: string | null) => (id ? placementById.get(id)?.mobile_size !== null : true);

  // Bild-Paare je Platzierung + typografische Kreative getrennt.
  const imagePairs = useMemo<ImagePair[]>(() => {
    const m = new Map<string, ImagePair>();
    for (const cr of detail.creatives) {
      if (cr.kind !== "image" || !cr.placement_id) continue;
      const pair = m.get(cr.placement_id) ?? { placementId: cr.placement_id, desktop: null, mobile: null };
      if (cr.variant === "mobile") pair.mobile = pair.mobile ?? cr; else pair.desktop = pair.desktop ?? cr;
      m.set(cr.placement_id, pair);
    }
    return Array.from(m.values());
  }, [detail.creatives]);
  const textCreatives = useMemo(() => detail.creatives.filter((cr) => cr.kind !== "image"), [detail.creatives]);

  // H3: Abdeckungs-Luecken je gebuchter Platzierung (client-seitig, Spiegel des DB-Gates).
  const coverageGaps = useMemo<string[]>(() => {
    const gaps: string[] = [];
    const seen = new Set<string>();
    for (const b of detail.bookings) {
      if (seen.has(b.placement_id)) continue;
      seen.add(b.placement_id);
      const p = placementById.get(b.placement_id);
      const label = p?.label ?? b.placementLabel;
      const has = (variant: string) => detail.creatives.some(
        (cr) => cr.is_active && cr.variant === variant && (cr.placement_id === null || cr.placement_id === b.placement_id),
      );
      if (!has("desktop")) gaps.push(`${label}: Desktop-Motiv fehlt — Kampagne kann nicht live gehen.`);
      if (p && p.mobile_size !== null && !has("mobile")) gaps.push(`${label}: Mobile-Motiv fehlt — Kampagne kann nicht live gehen.`);
    }
    return gaps;
  }, [detail.bookings, detail.creatives, placementById]);

  function choosePlacement(id: string) {
    setBPlacement(id);
    const p = bookable.find((x) => x.id === id);
    const g = p && isPlacementCode(p.code) ? PLACEMENTS[p.code] : undefined;
    const scopes: ScopeKind[] = g?.allowedScopes ?? ["global"];
    if (!scopes.includes(bScope)) setBScope("global");
    const ressorts = g?.allowedRessorts ? RESSORT_SLUGS.filter((r) => g.allowedRessorts!.includes(r.slug)) : RESSORT_SLUGS;
    if (!ressorts.some((r) => r.slug === bRessort)) setBRessort(ressorts[0]?.slug ?? "");
  }

  // Kreativ-Formular (gemeinsam fuer Typografisch und Bild-Paar)
  const [showCreative, setShowCreative] = useState(false);
  const [crKind, setCrKind] = useState<CreativeKind>("internal");
  const [crPlacementId, setCrPlacementId] = useState<string>("");
  const [crUrl, setCrUrl] = useState("");
  const [crActive, setCrActive] = useState(true);
  // typografisch
  const [crId, setCrId] = useState<string | null>(null);
  const [crVariant, setCrVariant] = useState<"desktop" | "mobile">("desktop");
  const [crHeadline, setCrHeadline] = useState("");
  const [crBody, setCrBody] = useState("");
  const [crCta, setCrCta] = useState("");
  const [crTheme, setCrTheme] = useState("card");
  const [crBg, setCrBg] = useState("#1c1c1e");
  // Bild-Paar
  const [crDesktop, setCrDesktop] = useState<CreativeImage | null>(null);
  const [crMobile, setCrMobile] = useState<CreativeImage | null>(null);
  const [crDesktopId, setCrDesktopId] = useState<string | null>(null);
  const [crMobileId, setCrMobileId] = useState<string | null>(null);
  const [crSavedPaths, setCrSavedPaths] = useState<string[]>([]); // gespeicherte Pfade: beim Abbrechen nicht loeschen
  const [crAlt, setCrAlt] = useState("");
  const [crNote, setCrNote] = useState<string | null>(null);

  const bgInvalid = crKind === "internal" && crTheme === "custom" && !isHex(crBg);
  const crPlacementCode = placementCodeOf(crPlacementId || null);
  const crLayout = crPlacementCode ? PLACEMENTS[crPlacementCode].layout : "wide";
  const crNeedsMobile = !!crPlacementId && placementHasMobile(crPlacementId);
  const imageIncomplete = crKind === "image" && (!crPlacementId || !crDesktop || !crAlt.trim());

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
    setCrDesktop(null); setCrMobile(null); setCrDesktopId(null); setCrMobileId(null); setCrSavedPaths([]);
    setCrAlt(""); setCrNote(null); setShowCreative(false);
  }

  async function discardUnsaved(images: (CreativeImage | null)[]) {
    for (const img of images) {
      if (img && !crSavedPaths.includes(img.path)) {
        try { await deleteCreativeImage(img.path); } catch { /* ignore */ }
      }
    }
  }

  // Abbrechen nach Upload ohne Speichern: hochgeladene, nicht gespeicherte Dateien entfernen.
  async function cancelCreative() {
    if (crKind === "image") await discardUnsaved([crDesktop, crMobile]);
    resetCreative();
  }

  // Platzierungswechsel nach Upload: Format haengt von der Platzierung ab -> beide Boxen leeren.
  async function changeCreativePlacement(id: string) {
    if (crKind === "image" && (crDesktop || crMobile)) {
      await discardUnsaved([crDesktop, crMobile]);
      setCrDesktop(null); setCrMobile(null);
      setCrNote("Motive gelöscht, Format hängt von der Platzierung ab.");
    }
    setCrPlacementId(id);
  }

  function editPair(pair: ImagePair) {
    const base = pair.desktop ?? pair.mobile!;
    setCrKind("image"); setCrId(null);
    setCrPlacementId(pair.placementId);
    setCrUrl(base.target_url); setCrActive(base.is_active); setCrAlt(base.alt_text ?? "");
    const d = toImage(pair.desktop);
    const m = toImage(pair.mobile);
    setCrDesktop(d); setCrMobile(m);
    setCrDesktopId(pair.desktop?.id ?? null); setCrMobileId(pair.mobile?.id ?? null);
    setCrSavedPaths([d?.path, m?.path].filter((x): x is string => !!x));
    setCrNote(null); setShowCreative(true);
  }

  function editText(cr: CreativeRow) {
    setCrId(cr.id); setCrKind("internal");
    setCrVariant(cr.variant === "mobile" ? "mobile" : "desktop");
    setCrPlacementId(cr.placement_id ?? "");
    setCrHeadline(cr.headline ?? ""); setCrBody(cr.body ?? ""); setCrCta(cr.cta_label ?? "");
    setCrUrl(cr.target_url); setCrActive(cr.is_active);
    setCrTheme(cr.theme); setCrBg(cr.bg_color ?? "#1c1c1e");
    setCrDesktop(null); setCrMobile(null); setCrDesktopId(null); setCrMobileId(null); setCrSavedPaths([]);
    setCrNote(null); setShowCreative(true);
  }

  function copyPreviewLink(url: string) {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function changeStatus(next: CampaignStatus) {
    // H3/d: Luecken im UI abfangen, bevor die Action laeuft (DB-Gate bleibt als Netz).
    if ((next === "live" || next === "confirmed") && !isHouse && coverageGaps.length > 0) {
      setError(coverageGaps.join(" "));
      return;
    }
    if (next === "live" && !isHouse && !c.approved_at) {
      if (!confirm("Der Kunde hat noch nicht freigegeben. Trotzdem live schalten?")) return;
    }
    run(() => setCampaignStatus(c.id, next));
  }

  async function downloadStatsCsv() {
    setError(null);
    const res = await exportCampaignStatsRows(c.id);
    if (!res.ok) { setError(res.error); return; }
    const header = ["Tag", "Platzierung", "Kreativ", "Variante", "Impressionen", "Klicks"];
    const lines = [header.join(";")];
    for (const r of res.rows) {
      lines.push([r.day, r.placement_label, r.creative_label, r.variant, r.impressions, r.clicks].map(csvCell).join(";"));
    }
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(c.name)}-zahlen-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const hasRef = bScope !== "global";
  const shareTitle = `Anteil = Gewicht ${c.weight} / (${c.weight} + Summe der Gewichte der anderen Live-Kampagnen auf derselben Fläche und Ebene, überlappender Zeitraum). Nicht-House schlägt House.`;
  const previewUrl = `${previewBase}/vorschau/${c.preview_token}`;

  const thumb = (cr: CreativeRow | null, missing: string) =>
    cr && cr.image_path ? (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="cd-thumb" src={moduleImageUrl(cr.image_path)} alt={cr.alt_text ?? ""} />
        <span style={{ color: "var(--da-muted)", fontFamily: "var(--da-font-mono)", fontSize: 11, whiteSpace: "nowrap" }}>{cr.width} × {cr.height}</span>
      </span>
    ) : (
      <span style={{ color: missing === "—" ? "var(--da-muted)" : "var(--da-orange)", fontWeight: 600 }}>{missing}</span>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        .cd-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .cd-row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .cd-booking { display: grid; gap: 16px; align-items: end; }
        .cd-booking--ref   { grid-template-columns: 1.4fr 1fr 1fr auto auto auto; }
        .cd-booking--noref { grid-template-columns: 1.4fr 1fr auto auto auto; }
        .cd-preview { display: grid; grid-template-columns: 1fr 300px; gap: 16px; align-items: start; }
        .cd-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .cd-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .cd-pair-preview { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
        @media (max-width: 1023px) {
          .cd-booking--ref, .cd-booking--noref { grid-template-columns: 1fr 1fr 1fr; }
          .cd-preview, .cd-pair { grid-template-columns: 1fr; }
          .cd-stats { grid-template-columns: 1fr 1fr; }
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

      {/* Zahlen (J6) — auch bei House (Eigenreporting) */}
      <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={sectionTitle}>Zahlen</div>
          {(stats.impressions > 0 || stats.clicks > 0) && (
            <button type="button" style={btnSmall} onClick={() => void downloadStatsCsv()}>CSV exportieren</button>
          )}
        </div>
        {stats.impressions === 0 && stats.clicks === 0 ? (
          <p style={{ color: "var(--da-muted)", fontSize: 14, margin: 0 }}>Noch keine Auslieferungen gezählt.</p>
        ) : (
          <>
            <div className="cd-stats">
              <StatCell label="Impressionen" value={formatCount(stats.impressions)} />
              <StatCell label="Klicks" value={formatCount(stats.clicks)} accent="var(--da-green)" />
              <StatCell label="CTR" value={formatCtr(stats.ctr)} />
              <StatCell label="Laufzeit" value={formatRuntime(stats.daysElapsed, stats.daysTotal)} sub="Tage bisher / gesamt" />
            </div>
            <div>
              <span style={labelStyle}>Impressionen · letzte 30 Tage</span>
              <StatsSeries series={stats.series} />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="cd-table">
                <thead>
                  <tr>
                    <th style={th}>Platzierung</th>
                    <th style={{ ...th, textAlign: "right" }}>Impressionen</th>
                    <th style={{ ...th, textAlign: "right" }}>Klicks</th>
                    <th style={{ ...th, textAlign: "right" }}>CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byPlacement.map((p) => (
                    <tr key={p.placementId}>
                      <td style={{ ...td, color: "var(--da-text)", fontWeight: 600 }}>{p.label}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "var(--da-font-mono)" }}>{formatCount(p.impressions)}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "var(--da-font-mono)" }}>{formatCount(p.clicks)}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: "var(--da-font-mono)" }}>{formatCtr(p.ctr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p style={{ ...help, margin: 0 }}>{COUNT_RULE_DU}</p>
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
        {detail.creatives.length === 0 && (
          <p style={{ color: "var(--da-muted)", fontSize: 14, margin: 0 }}>Keine Kreative.</p>
        )}

        {/* Bild-Kreative: eine Zeile pro Platzierung (Paar Desktop/Mobile). */}
        {imagePairs.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="cd-table">
              <thead>
                <tr>
                  <th style={th}>Bild · Platzierung</th>
                  <th style={th}>Desktop</th>
                  <th style={th}>Mobile</th>
                  <th style={th}>Ziel-URL</th>
                  <th style={th}>Aktiv</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {imagePairs.map((pair) => {
                  const base = pair.desktop ?? pair.mobile!;
                  const hasMobile = placementHasMobile(pair.placementId);
                  return (
                    <tr key={pair.placementId}>
                      <td style={{ ...td, color: "var(--da-text)", fontWeight: 600, whiteSpace: "nowrap" }}>{placementLabel(pair.placementId)}</td>
                      <td style={td}>{thumb(pair.desktop, "fehlt")}</td>
                      <td style={td}>{hasMobile ? thumb(pair.mobile, "fehlt") : thumb(null, "—")}</td>
                      <td style={{ ...td, color: "var(--da-muted)", fontFamily: "var(--da-font-mono)", fontSize: 12, wordBreak: "break-all" }}>{base.target_url}</td>
                      <td style={td}>{base.is_active ? "ja" : "nein"}</td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                        <button type="button" style={{ ...btnSmall, marginRight: 6 }} onClick={() => editPair(pair)}>Bearbeiten</button>
                        <button type="button" style={btnSmall} disabled={pending} onClick={() => { if (confirm("Bild-Kreativ (Desktop und Mobile) löschen?")) run(() => deleteImageCreativePair(c.id, pair.placementId)); }}>Löschen</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Typografische Kreative: eine Zeile pro Variante wie bisher. */}
        {textCreatives.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="cd-table">
              <thead>
                <tr>
                  <th style={th}>Variante</th>
                  <th style={th}>Platzierung</th>
                  <th style={th}>Headline</th>
                  <th style={th}>Gestaltung</th>
                  <th style={th}>Ziel-URL</th>
                  <th style={th}>Aktiv</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {textCreatives.map((cr) => {
                  const t = resolveTheme(cr.theme, cr.bg_color);
                  return (
                    <tr key={cr.id}>
                      <td style={{ ...td, fontFamily: "var(--da-font-mono)", fontSize: 12, color: "var(--da-muted)" }}>{cr.variant}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{placementLabel(cr.placement_id)}</td>
                      <td style={{ ...td, color: "var(--da-text)", fontWeight: 600 }}>{cr.headline}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        <span className="cd-swatch" style={{ background: t.background }} aria-hidden="true" />
                        {themeLabel(cr.theme)}{cr.theme === "custom" && cr.bg_color ? ` ${cr.bg_color}` : ""}
                      </td>
                      <td style={{ ...td, color: "var(--da-muted)", fontFamily: "var(--da-font-mono)", fontSize: 12, wordBreak: "break-all" }}>{cr.target_url}</td>
                      <td style={td}>{cr.is_active ? "ja" : "nein"}</td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                        <button type="button" style={{ ...btnSmall, marginRight: 6 }} onClick={() => editText(cr)}>Bearbeiten</button>
                        <button type="button" style={btnSmall} disabled={pending} onClick={() => run(() => deleteCreative(cr.id, c.id))}>Löschen</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* H3: Abdeckungs-Luecken proaktiv anzeigen (nur Kundenkampagnen). */}
        {!isHouse && coverageGaps.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {coverageGaps.map((g) => <p key={g} style={{ color: "var(--da-orange)", fontSize: 13, margin: 0 }}>{g}</p>)}
          </div>
        )}

        {showCreative ? (
          <div style={{ borderTop: "1px solid var(--da-border)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={labelStyle}>{crId || crDesktopId || crMobileId ? "Kreativ bearbeiten" : "Neues Kreativ"}</span>

            {crKind === "image" ? (
              <>
                {/* Bild-Paar: Typ | Platzierung | aktiv — kein Varianten-Select (H1). */}
                <div className="cd-row3">
                  <div>
                    <label style={labelStyle} htmlFor="cr-kind">Typ</label>
                    <select id="cr-kind" style={inputStyle} value={crKind} disabled={!!(crDesktopId || crMobileId)} onChange={(e) => setCrKind(e.target.value as CreativeKind)}>
                      <option value="internal">Typografisch</option>
                      <option value="image">Bild</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="cr-placement">Platzierung *</label>
                    <select id="cr-placement" style={inputStyle} value={crPlacementId} disabled={!!(crDesktopId || crMobileId)} onChange={(e) => void changeCreativePlacement(e.target.value)}>
                      <option value="">— Platzierung wählen —</option>
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
                  </div>
                  <div>
                    <span style={labelStyle}>Status</span>
                    <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--da-text)", fontSize: 14, minHeight: 38 }}>
                      <input type="checkbox" checked={crActive} onChange={(e) => setCrActive(e.target.checked)} /> aktiv
                    </label>
                  </div>
                </div>
                {crNote && <p style={{ ...help, color: "var(--da-orange)", margin: 0 }}>{crNote}</p>}

                <div className="cd-pair">
                  <div>
                    <label style={labelStyle}>Desktop-Motiv *</label>
                    <CreativeImageUploader campaignId={c.id} variant="desktop" placementCode={crPlacementCode} value={crDesktop} onChange={setCrDesktop} />
                  </div>
                  {crNeedsMobile ? (
                    <div>
                      <label style={labelStyle}>Mobile-Motiv *</label>
                      <CreativeImageUploader campaignId={c.id} variant="mobile" placementCode={crPlacementCode} value={crMobile} onChange={setCrMobile} />
                    </div>
                  ) : (
                    <div>
                      {crPlacementId && <p style={{ ...help, margin: "22px 0 0" }}>Diese Platzierung liefert nicht mobil aus — nur ein Desktop-Motiv.</p>}
                    </div>
                  )}
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
                <p style={help}>Alt-Text, Ziel-URL und Status gelten für beide Motive. Format: Desktop {formatHint(crPlacementCode, "desktop")}{crNeedsMobile ? ` · Mobile ${formatHint(crPlacementCode, "mobile")}` : ""}.</p>

                <div>
                  <span style={labelStyle}>Vorschau</span>
                  {crDesktop || crMobile ? (
                    <div className="cd-pair-preview">
                      {crDesktop && (
                        <div style={{ display: "flex", flex: crLayout === "stacked" ? "0 0 300px" : "1 1 480px", maxWidth: crLayout === "stacked" ? 300 : 970, minWidth: 0 }}>
                          <ModuleCard layout={crLayout} kind="image" isHouse={isHouse} href="#" src={moduleImageUrl(crDesktop.path)} w={crDesktop.width} h={crDesktop.height} alt={crAlt} eager preview />
                        </div>
                      )}
                      {crMobile && (
                        <div style={{ display: "flex", flex: "0 0 320px", maxWidth: "100%" }}>
                          <ModuleCard layout="stacked" kind="image" isHouse={isHouse} href="#" src={moduleImageUrl(crMobile.path)} w={crMobile.width} h={crMobile.height} alt={crAlt} eager preview />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ ...help, margin: 0 }}>Motiv hochladen, um die Vorschau zu sehen.</p>
                  )}
                </div>

                <p style={help}>Aktivierung auf Live verlangt je gebuchter Platzierung ein aktives Desktop-Motiv; Mobile zusätzlich, sobald die Platzierung mobil ausliefert.</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" style={btnGhost} onClick={() => void cancelCreative()}>Abbrechen</button>
                  <button type="button" style={btnPrimary} disabled={pending || imageIncomplete} onClick={() => run(() => saveImageCreativePair(c.id, {
                    placement_id: crPlacementId,
                    target_url: crUrl,
                    alt_text: crAlt,
                    is_active: crActive,
                    desktop: { image_path: crDesktop!.path, width: crDesktop!.width, height: crDesktop!.height },
                    mobile: crNeedsMobile && crMobile ? { image_path: crMobile.path, width: crMobile.width, height: crMobile.height } : null,
                    existingDesktopId: crDesktopId,
                    existingMobileId: crMobileId,
                  }), resetCreative)}>{crDesktopId || crMobileId ? "Speichern" : "Hinzufügen"}</button>
                </div>
              </>
            ) : (
              <>
                <div className="cd-row3">
                  <div>
                    <label style={labelStyle} htmlFor="cr-kind">Typ</label>
                    <select id="cr-kind" style={inputStyle} value={crKind} disabled={!!crId} onChange={(e) => setCrKind(e.target.value as CreativeKind)}>
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

                <div className="cd-row2">
                  <div>
                    <label style={labelStyle} htmlFor="cr-placement">Platzierung</label>
                    <select id="cr-placement" style={inputStyle} value={crPlacementId} onChange={(e) => setCrPlacementId(e.target.value)}>
                      <option value="">alle Platzierungen</option>
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
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="cr-theme">Gestaltung</label>
                    <select id="cr-theme" style={inputStyle} value={crTheme} onChange={(e) => setCrTheme(e.target.value)}>
                      {CREATIVE_THEMES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                {crTheme === "custom" && (
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

                {/* Live-Vorschau: dasselbe Markup wie die Auslieferung (ModuleCard), nicht klickbar. */}
                <div>
                  <span style={labelStyle}>Vorschau</span>
                  <div className="cd-preview">
                    <div style={{ display: "flex", minHeight: 132 }}>
                      <ModuleCard layout="wide" isHouse={isHouse} headline={crHeadline || "Headline"} body={crBody || null} ctaLabel={crCta || null} href="#" theme={crTheme} bg={crBg} preview />
                    </div>
                    <div style={{ display: "flex", minHeight: 168 }}>
                      <ModuleCard layout="stacked" isHouse={isHouse} headline={crHeadline || "Headline"} body={crBody || null} ctaLabel={crCta || null} href="#" theme={crTheme} bg={crBg} preview />
                    </div>
                  </div>
                </div>

                <p style={help}>Aktivierung auf Live verlangt je gebuchter Platzierung ein aktives Desktop-Kreativ (Platzierung passend oder „alle“); Mobile zusätzlich, sobald die Platzierung mobil ausliefert.</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" style={btnGhost} onClick={() => void cancelCreative()}>Abbrechen</button>
                  <button type="button" style={btnPrimary} disabled={pending || bgInvalid} onClick={() => run(() => {
                    const payload = {
                      kind: "internal" as const,
                      variant: crVariant,
                      placement_id: crPlacementId || null,
                      headline: crHeadline, body: crBody, cta_label: crCta, target_url: crUrl, is_active: crActive,
                      theme: crTheme, bg_color: crTheme === "custom" ? crBg : null,
                    };
                    return crId ? updateCreative(crId, c.id, payload) : createCreative({ campaign_id: c.id, ...payload });
                  }, resetCreative)}>{crId ? "Speichern" : "Hinzufügen"}</button>
                </div>
              </>
            )}
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

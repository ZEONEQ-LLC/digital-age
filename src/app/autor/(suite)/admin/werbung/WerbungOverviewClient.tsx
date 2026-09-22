"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createCampaign } from "@/lib/ads/adActions";
import { CAMPAIGN_STATUSES, statusLabel, type CampaignOverviewVM } from "@/lib/ads/types";
import { card, errStyle, help, inputStyle, labelStyle, btnPrimary, btnGhost, th, td, WEIGHTS } from "./formStyles";

type Props = {
  initialCampaigns: CampaignOverviewVM[];
  advertisers: { id: string; name: string }[];
};

export default function WerbungOverviewClient({ initialCampaigns, advertisers }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [showNew, setShowNew] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Neue-Kampagne-Formular
  const [name, setName] = useState("");
  const [isHouse, setIsHouse] = useState(false);
  const [advertiserId, setAdvertiserId] = useState("");
  const [priceChf, setPriceChf] = useState("");
  const [weight, setWeight] = useState("1");

  const filtered = useMemo(
    () => (filter === "all" ? initialCampaigns : initialCampaigns.filter((c) => c.status === filter)),
    [filter, initialCampaigns],
  );

  function submitNew() {
    setError(null);
    startTransition(async () => {
      const res = await createCampaign({
        name,
        is_house: isHouse,
        advertiser_id: isHouse ? null : advertiserId || null,
        price_chf: isHouse || !priceChf ? null : Number(priceChf),
        weight: Number(weight),
      });
      if (!res.ok) { setError(res.error); return; }
      router.push(`/autor/admin/werbung/${res.id}`);
    });
  }

  const weightField = (
    <div>
      <label style={labelStyle} htmlFor="nc-weight">Rotationsgewicht</label>
      <select id="nc-weight" style={inputStyle} value={weight} onChange={(e) => setWeight(e.target.value)}>
        {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
      </select>
      <p style={help}>Nur relevant, wenn mehrere Kampagnen dieselbe Fläche belegen.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        .wo-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .wo-row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        @media (max-width: 767px) { .wo-row2, .wo-row3 { grid-template-columns: 1fr; } }
      `}</style>

      {/* Filter + Neu */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="all">Alle Status</option>
          {CAMPAIGN_STATUSES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => setShowNew((v) => !v)} style={btnPrimary}>
          {showNew ? "Abbrechen" : "+ Neue Kampagne"}
        </button>
      </div>

      {showNew && (
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--da-text)", fontSize: 14 }}>
            <input type="checkbox" checked={isHouse} onChange={(e) => setIsHouse(e.target.checked)} />
            House-Kampagne (kein Kunde, kein Preis)
          </label>

          {isHouse ? (
            <div className="wo-row2">
              <div>
                <label style={labelStyle} htmlFor="nc-name">Kampagnen-Name</label>
                <input id="nc-name" style={inputStyle} placeholder="z. B. House: Newsletter" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              {weightField}
            </div>
          ) : (
            <>
              <div>
                <label style={labelStyle} htmlFor="nc-name">Kampagnen-Name</label>
                <input id="nc-name" style={inputStyle} placeholder="z. B. Frühlingskampagne Kunde X" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              {advertisers.length === 0 ? (
                <p style={{ color: "var(--da-muted)", fontSize: 13, margin: 0 }}>
                  Noch keine Kunden angelegt.{" "}
                  <Link href="/autor/admin/werbung/kunden" style={{ color: "var(--da-green)" }}>Kunde anlegen →</Link>
                </p>
              ) : (
                <div className="wo-row3">
                  <div>
                    <label style={labelStyle} htmlFor="nc-adv">Kunde</label>
                    <select id="nc-adv" style={inputStyle} value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)}>
                      <option value="">— Kunde wählen —</option>
                      {advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="nc-price">Preis CHF (optional)</label>
                    <input id="nc-price" style={inputStyle} placeholder="z. B. 1500" inputMode="decimal" value={priceChf} onChange={(e) => setPriceChf(e.target.value)} />
                  </div>
                  {weightField}
                </div>
              )}
            </>
          )}

          {error && <p style={errStyle}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" style={btnGhost} onClick={() => setShowNew(false)}>Abbrechen</button>
            <button type="button" onClick={submitNew} disabled={pending} style={btnPrimary}>
              {pending ? "Speichert…" : "Kampagne anlegen"}
            </button>
          </div>
        </div>
      )}

      {/* Tabelle */}
      <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={th}>Kampagne</th>
              <th style={th}>Kunde</th>
              <th style={th}>Status</th>
              <th style={th}>Laufzeit</th>
              <th style={th}>Platzierungen</th>
              <th style={th}>Preis</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ ...td, color: "var(--da-muted)" }}>Keine Kampagnen.</td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={td}>
                  <Link href={`/autor/admin/werbung/${c.id}`} style={{ color: "var(--da-text)", fontWeight: 600, textDecoration: "none" }}>
                    {c.name}
                  </Link>
                </td>
                <td style={{ ...td, color: "var(--da-muted)" }}>{c.isHouse ? "House" : c.advertiserName ?? "—"}</td>
                <td style={td}><span style={{ color: "var(--da-green)", fontFamily: "var(--da-font-mono)", fontSize: 12 }}>{statusLabel(c.status)}</span></td>
                <td style={{ ...td, color: "var(--da-muted)" }}>{c.periodLabel}</td>
                <td style={{ ...td, color: "var(--da-muted)" }}>{c.placementLabels.join(", ") || "—"}</td>
                <td style={{ ...td, color: "var(--da-muted)" }}>{c.priceChf != null ? `CHF ${c.priceChf}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

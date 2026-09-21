"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createCampaign } from "@/lib/ads/adActions";
import {
  CAMPAIGN_STATUSES,
  statusLabel,
  type CampaignOverviewVM,
} from "@/lib/ads/types";

type Props = {
  initialCampaigns: CampaignOverviewVM[];
  advertisers: { id: string; name: string }[];
};

const card: React.CSSProperties = {
  background: "var(--da-card)",
  border: "1px solid var(--da-border)",
  borderRadius: 8,
  padding: 16,
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
        weight: Number(weight) || 1,
      });
      if (!res.ok) { setError(res.error); return; }
      router.push(`/autor/admin/werbung/${res.id}`);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filter + Neu */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: "8px 10px", background: "var(--da-card)", color: "var(--da-text)", border: "1px solid var(--da-border)", borderRadius: 6 }}
        >
          <option value="all">Alle Status</option>
          {CAMPAIGN_STATUSES.map((s) => (
            <option key={s.code} value={s.code}>{s.label}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <Link href="/autor/admin/werbung/kunden" style={{ color: "var(--da-muted)", fontSize: 13, textDecoration: "none" }}>
          Kunden verwalten →
        </Link>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          style={{ padding: "8px 14px", background: "var(--da-green)", color: "var(--da-dark)", border: 0, borderRadius: 6, fontWeight: 700, cursor: "pointer" }}
        >
          {showNew ? "Abbrechen" : "+ Neue Kampagne"}
        </button>
      </div>

      {showNew && (
        <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={lblCol}>
            <span>Kampagnen-Name</span>
            <input placeholder="z. B. Frühlingskampagne Kunde X" value={name} onChange={(e) => setName(e.target.value)} style={inp} />
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--da-text)", fontSize: 14 }}>
            <input type="checkbox" checked={isHouse} onChange={(e) => setIsHouse(e.target.checked)} />
            House-Kampagne (kein Kunde, kein Preis)
          </label>
          {!isHouse && (
            advertisers.length === 0 ? (
              <p style={{ color: "var(--da-muted)", fontSize: 13, margin: 0 }}>
                Noch keine Kunden angelegt.{" "}
                <Link href="/autor/admin/werbung/kunden" style={{ color: "var(--da-green)" }}>Kunde anlegen →</Link>
              </p>
            ) : (
              <>
                <label style={lblCol}>
                  <span>Kunde</span>
                  <select value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)} style={inp}>
                    <option value="">— Kunde wählen —</option>
                    {advertisers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
                <label style={lblCol}>
                  <span>Preis CHF (optional)</span>
                  <input placeholder="z. B. 1500" value={priceChf} onChange={(e) => setPriceChf(e.target.value)} inputMode="decimal" style={inp} />
                </label>
              </>
            )
          )}
          <label style={lblCol}>
            <span>Gewicht (1-10)</span>
            <input placeholder="1" value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="numeric" style={inp} />
            <span style={help}>Steuert die Rotation bei mehreren gleichzeitigen Kampagnen auf derselben Fläche. Höher = häufiger.</span>
          </label>
          {error && <p style={errStyle}>{error}</p>}
          <button type="button" onClick={submitNew} disabled={pending} style={btnPrimary}>
            {pending ? "Speichert…" : "Kampagne anlegen"}
          </button>
        </div>
      )}

      {/* Tabelle */}
      <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--da-muted)" }}>
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
              <tr key={c.id} style={{ borderTop: "1px solid var(--da-border)" }}>
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

const inp: React.CSSProperties = { padding: "8px 10px", background: "var(--da-dark)", color: "var(--da-text)", border: "1px solid var(--da-border)", borderRadius: 6 };
const btnPrimary: React.CSSProperties = { padding: "8px 14px", background: "var(--da-green)", color: "var(--da-dark)", border: 0, borderRadius: 6, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" };
const th: React.CSSProperties = { padding: "12px 14px", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" };
const td: React.CSSProperties = { padding: "12px 14px" };
const errStyle: React.CSSProperties = { color: "#ff6b6b", fontSize: 13, margin: 0 };
const lblCol: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, color: "var(--da-muted)", fontSize: 12 };
const help: React.CSSProperties = { color: "var(--da-faint)", fontSize: 11, lineHeight: 1.4 };

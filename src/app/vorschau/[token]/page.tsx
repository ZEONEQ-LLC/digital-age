import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ModuleCard from "@/components/module/ModuleCard";
import { moduleImageUrl } from "@/lib/ads/imagePath";
import { PLACEMENTS } from "@/lib/ads/placements";
import { getPreviewCampaign, type PreviewCreative } from "@/lib/ads/previewApi";
import { RESSORT_SLUGS, formatPeriod } from "@/lib/ads/types";
import { getCampaignStats, type CampaignStats } from "@/lib/ads/statsApi";
import { COUNT_RULE_SIE, formatCount, formatCtr, formatRuntime } from "@/lib/ads/statsFormat";
import { createServiceClient } from "@/lib/supabase/service";
import StatsSeries from "@/components/module/StatsSeries";
import ApproveForm from "./ApproveForm";

// Kunden-Vorschau (G5): nur ueber den Token-Link erreichbar, nie indexiert,
// ohne Site-Chrome (Navbar/Ticker/Rails blenden sich auf /vorschau aus).
// Service-Client, force-dynamic. Zeigt Kreative und Buchungen — keine
// Adresse, kein Preis.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vorschau Ihrer Kampagne · digital-age",
  robots: { index: false, follow: false, nocache: true },
};

const TOKEN_RE = /^[0-9a-f]{48}$/;

type PageProps = { params: Promise<{ token: string }> };

function scopeText(scope: string, ref: string | null): string {
  if (scope === "ressort") return `Ressort ${RESSORT_SLUGS.find((r) => r.slug === ref)?.label ?? ref ?? ""}`;
  if (scope === "article") return `Artikel ${ref ?? ""}`;
  return "alle Seiten";
}

function Creative({
  c, layout, isHouse, width,
}: { c: PreviewCreative | null; layout: "wide" | "stacked"; isHouse: boolean; width: number | string }) {
  if (!c) {
    return (
      <div style={{ width, maxWidth: "100%", minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--da-border)", borderRadius: 8, color: "var(--da-muted)", fontSize: 13 }}>
        Kein Kreativ hinterlegt
      </div>
    );
  }
  return (
    <div style={{ width, maxWidth: "100%", display: "flex" }}>
      {c.kind === "image" && c.image_path ? (
        <ModuleCard layout={layout} kind="image" isHouse={isHouse} href={c.target_url} src={moduleImageUrl(c.image_path)} w={c.width} h={c.height} alt={c.alt_text ?? ""} eager preview />
      ) : (
        <ModuleCard layout={layout} isHouse={isHouse} href={c.target_url} headline={c.headline} body={c.body} ctaLabel={c.cta_label} theme={c.theme} bg={c.bg_color} preview />
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });
}

export default async function PreviewPage({ params }: PageProps) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) notFound();
  const c = await getPreviewCampaign(token);
  if (!c) notFound();
  // Zahlen (J6): nur Kundenkampagnen ab live/pausiert/beendet.
  const showStats = !c.isHouse && ["live", "paused", "ended"].includes(c.status);
  let stats: CampaignStats | null = null;
  if (showStats) {
    try { stats = await getCampaignStats(createServiceClient(), c.id); } catch { stats = null; }
  }

  const card: React.CSSProperties = { background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: 10, padding: 20 };
  const overline: React.CSSProperties = { color: "var(--da-faint)", fontSize: 10, fontWeight: 700, fontFamily: "var(--da-font-mono)", letterSpacing: "0.12em", textTransform: "uppercase" };

  return (
    <main style={{ background: "var(--da-dark)", minHeight: "100vh", padding: "48px 24px 64px" }}>
      <style>{`
        .pv-wrap { max-width: 1040px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
        .pv-creatives { display: flex; gap: 24px; align-items: flex-start; flex-wrap: wrap; }
        .pv-desktop { flex: 1 1 480px; min-width: 0; }
        .pv-mobile { flex: 0 0 320px; max-width: 100%; }
        .pv-link { color: var(--da-green); font-size: 14px; font-weight: 600; text-decoration: none; }
        .pv-link:hover { text-decoration: underline; }
        .pv-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        @media (max-width: 767px) { .pv-tiles { grid-template-columns: 1fr 1fr; } }
      `}</style>
      <div className="pv-wrap">
        <header>
          <div style={overline}>digital-age · Vorschau</div>
          <h1 style={{ color: "var(--da-text)", fontFamily: "var(--da-font-display)", fontSize: 32, fontWeight: 700, margin: "8px 0 4px" }}>
            Vorschau Ihrer Kampagne
          </h1>
          <p style={{ color: "var(--da-muted)", fontSize: 16, margin: 0 }}>
            {c.name}{c.advertiserName ? ` · ${c.advertiserName}` : ""}
          </p>
        </header>

        {c.bookings.length === 0 && (
          <div style={card}><p style={{ color: "var(--da-muted)", margin: 0 }}>Noch keine Buchungen hinterlegt.</p></div>
        )}

        {c.bookings.map((b) => {
          const geo = b.placementCode ? PLACEMENTS[b.placementCode] : null;
          const layout = geo?.layout ?? "wide";
          const desktopWidth = layout === "wide" ? "100%" : 300;
          const hasMobile = !!(geo?.imageSize.mobile) && b.mobile !== null;
          return (
            <section key={b.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline", marginBottom: 16 }}>
                <div>
                  <div style={overline}>Platzierung</div>
                  <div style={{ color: "var(--da-text)", fontSize: 18, fontWeight: 700, fontFamily: "var(--da-font-display)" }}>{b.placementLabel}</div>
                  <div style={{ color: "var(--da-muted)", fontSize: 13, marginTop: 2 }}>{scopeText(b.scope, b.scope_ref)} · {formatPeriod(b.period)}</div>
                </div>
                <a className="pv-link" href={b.viewHref} target="_blank" rel="noopener">Auf der Seite ansehen →</a>
              </div>
              <div className="pv-creatives">
                <div className="pv-desktop" style={{ maxWidth: 970 }}>
                  <div style={{ ...overline, marginBottom: 8 }}>Desktop</div>
                  <Creative c={b.desktop} layout={layout} isHouse={c.isHouse} width={desktopWidth} />
                </div>
                {hasMobile && (
                  <div className="pv-mobile">
                    <div style={{ ...overline, marginBottom: 8 }}>Mobile</div>
                    <Creative c={b.mobile} layout="stacked" isHouse={c.isHouse} width={320} />
                  </div>
                )}
              </div>
            </section>
          );
        })}

        {stats && (
          <section style={card}>
            <div style={{ ...overline, marginBottom: 12 }}>Zahlen</div>
            {stats.impressions === 0 && stats.clicks === 0 ? (
              <p style={{ color: "var(--da-muted)", fontSize: 14, margin: 0 }}>Noch keine Auslieferungen gezählt.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="pv-tiles">
                  {[
                    ["Impressionen", formatCount(stats.impressions)],
                    ["Klicks", formatCount(stats.clicks)],
                    ["CTR", formatCtr(stats.ctr)],
                    ["Laufzeit", formatRuntime(stats.daysElapsed, stats.daysTotal)],
                  ].map(([l, v]) => (
                    <div key={l} style={{ background: "var(--da-dark)", border: "1px solid var(--da-border)", borderRadius: 8, padding: 16 }}>
                      <div style={overline}>{l}</div>
                      <div style={{ color: "var(--da-text)", fontFamily: "var(--da-font-display)", fontSize: 26, fontWeight: 700, marginTop: 6 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ ...overline, marginBottom: 8 }}>Impressionen · letzte 30 Tage</div>
                  <StatsSeries series={stats.series} />
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...overline, textAlign: "left", padding: "8px 0", borderBottom: "1px solid var(--da-border)" }}>Platzierung</th>
                      <th style={{ ...overline, textAlign: "right", padding: "8px 0", borderBottom: "1px solid var(--da-border)" }}>Impressionen</th>
                      <th style={{ ...overline, textAlign: "right", padding: "8px 0", borderBottom: "1px solid var(--da-border)" }}>Klicks</th>
                      <th style={{ ...overline, textAlign: "right", padding: "8px 0", borderBottom: "1px solid var(--da-border)" }}>CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byPlacement.map((p) => (
                      <tr key={p.placementId}>
                        <td style={{ color: "var(--da-text)", fontSize: 14, fontWeight: 600, padding: "10px 0", borderBottom: "1px solid var(--da-border)" }}>{p.label}</td>
                        <td style={{ color: "var(--da-text)", fontSize: 14, fontFamily: "var(--da-font-mono)", textAlign: "right", padding: "10px 0", borderBottom: "1px solid var(--da-border)" }}>{formatCount(p.impressions)}</td>
                        <td style={{ color: "var(--da-text)", fontSize: 14, fontFamily: "var(--da-font-mono)", textAlign: "right", padding: "10px 0", borderBottom: "1px solid var(--da-border)" }}>{formatCount(p.clicks)}</td>
                        <td style={{ color: "var(--da-text)", fontSize: 14, fontFamily: "var(--da-font-mono)", textAlign: "right", padding: "10px 0", borderBottom: "1px solid var(--da-border)" }}>{formatCtr(p.ctr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ color: "var(--da-faint)", fontSize: 12, margin: "14px 0 0", lineHeight: 1.5 }}>{COUNT_RULE_SIE}</p>
          </section>
        )}

        {!c.isHouse && (
          <section style={card}>
            <div style={{ ...overline, marginBottom: 10 }}>Freigabe</div>
            {c.approvedAt ? (
              <div>
                <p style={{ color: "var(--da-text)", fontSize: 16, margin: 0 }}>
                  Freigegeben am {formatDate(c.approvedAt)} von {c.approvedBy}
                </p>
                {c.approvedNote && <p style={{ color: "var(--da-muted)", fontSize: 14, margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{c.approvedNote}</p>}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ color: "var(--da-muted)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                  Wenn Motiv, Platzierung und Zeitraum stimmen, geben Sie die Kampagne hier frei. Die Redaktion sieht Ihre Freigabe sofort.
                </p>
                <ApproveForm token={c.token} />
              </div>
            )}
          </section>
        )}

        <footer style={{ color: "var(--da-faint)", fontSize: 12, textAlign: "center" }}>
          Diese Seite ist nur über den Link erreichbar und nicht öffentlich gelistet.
        </footer>
      </div>
    </main>
  );
}

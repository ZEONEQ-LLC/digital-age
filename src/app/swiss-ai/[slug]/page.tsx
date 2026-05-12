import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import { getStartupBySlug } from "@/lib/startupApi";
import {
  lookupSwissStatus,
  lookupEmployeeRange,
  lookupFundingStage,
} from "@/lib/mappers/startupMappers";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const row = await getStartupBySlug(slug);
  if (!row) return { title: "Startup nicht gefunden — digital-age.ch" };
  return {
    title: `${row.name} — Swiss AI · digital-age.ch`,
    description: row.tagline,
  };
}

function formatDate(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("de-CH", { year: "numeric", month: "long" });
}

export default async function StartupDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const row = await getStartupBySlug(slug);
  if (!row) notFound();

  const swiss = lookupSwissStatus(row.swiss_status);
  const empLabel = lookupEmployeeRange(row.employee_range);
  const fundingLabel = row.funding_stage ? lookupFundingStage(row.funding_stage) : null;
  const lastRoundFormatted = formatDate(row.last_round_at);
  const hasInvestorBlock = row.open_to_investment || fundingLabel || row.total_funding_range || lastRoundFormatted || row.pitch_deck_url;
  const isFeatured = row.status === "featured";

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />

      <style>{`
        .sd-shell { max-width: 920px; margin: 0 auto; padding: 48px var(--sp-8) 96px; }
        .sd-crumb {
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
          text-decoration: none;
          margin-bottom: 28px; display: inline-block;
        }
        .sd-crumb:hover { color: var(--da-green); }

        .sd-head { display: flex; gap: 24px; align-items: center; margin-bottom: 28px; flex-wrap: wrap; }
        .sd-logo {
          width: 88px; height: 88px; border-radius: 12px;
          background: var(--da-card); border: 1px solid var(--da-border);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; color: var(--da-muted); font-size: 36px;
          font-family: var(--da-font-display);
          overflow: hidden; flex-shrink: 0;
        }
        .sd-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .sd-head-meta {
          display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;
        }
        .sd-badge {
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 4px 10px; border-radius: var(--r-xs);
        }
        .sd-badge--swiss { background: rgba(50,255,126,0.10); border: 1px solid var(--swiss-color); color: var(--swiss-color); }
        .sd-badge--feat  { background: var(--da-green); color: var(--da-dark); }
        .sd-badge--inv   { background: rgba(255,140,66,0.18); color: var(--da-orange); border: 1px solid rgba(255,140,66,0.5); }

        .sd-name {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: clamp(32px, 4.5vw, 48px); font-weight: 700;
          line-height: 1.05; letter-spacing: -0.02em; margin-bottom: 8px;
        }
        .sd-tagline {
          color: var(--da-muted); font-size: 17px; line-height: 1.5;
        }

        .sd-section { margin-top: 40px; }
        .sd-section__label {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 12px;
        }
        .sd-description {
          color: var(--da-text);
          font-size: 16px; line-height: 1.75;
          white-space: pre-wrap;
        }

        .sd-facts {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px;
          background: var(--da-border); border: 1px solid var(--da-border);
          border-radius: var(--r-lg); overflow: hidden;
        }
        .sd-fact {
          background: var(--da-card); padding: 18px 20px;
        }
        .sd-fact__label {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 6px;
        }
        .sd-fact__value { color: var(--da-text); font-size: 15px; font-weight: 600; }

        .sd-inv {
          background: var(--da-card); border: 1px solid rgba(255,140,66,0.5);
          border-radius: var(--r-lg); padding: 22px 24px;
        }
        .sd-inv__head {
          display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
          color: var(--da-orange);
        }
        .sd-inv__title { font-family: var(--da-font-display); font-size: 15px; font-weight: 700; }
        .sd-inv__list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 20px; }
        .sd-inv__item-label { color: var(--da-faint); font-size: 11px; font-family: var(--da-font-mono); }
        .sd-inv__item-value { color: var(--da-text); font-size: 14px; font-weight: 600; }
        .sd-inv__pitch {
          margin-top: 18px; display: inline-block;
          color: var(--da-orange); font-size: 13px; font-weight: 700;
          padding: 9px 18px; border: 1px solid var(--da-orange);
          border-radius: var(--r-sm); text-decoration: none;
        }
        .sd-inv__pitch:hover { background: var(--da-orange); color: var(--da-dark); }

        .sd-founders {
          color: var(--da-text); font-size: 15px; line-height: 1.6;
        }

        .sd-cta-row {
          margin-top: 40px; display: flex; gap: 12px; flex-wrap: wrap;
        }
        .sd-cta {
          background: var(--da-green); color: var(--da-dark);
          font-size: 14px; font-weight: 700;
          padding: 13px 28px; border-radius: var(--r-sm);
          text-decoration: none;
        }
        .sd-cta--secondary {
          background: none; color: var(--da-muted);
          border: 1px solid var(--da-border);
        }
        .sd-back {
          margin-top: 48px; display: inline-block;
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
          text-decoration: none;
        }
        .sd-back:hover { color: var(--da-green); }

        @media (max-width: 720px) {
          .sd-facts { grid-template-columns: 1fr; }
          .sd-inv__list { grid-template-columns: 1fr; }
        }
      `}</style>

      <section
        className="sd-shell"
        style={{ ["--swiss-color" as string]: swiss.color }}
      >
        <Link href="/swiss-ai" className="sd-crumb">← Swiss AI</Link>

        <div className="sd-head">
          <div className="sd-logo">
            {row.logo_url ? (
              <Image src={row.logo_url} alt="" width={88} height={88} unoptimized />
            ) : (
              row.name.charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sd-head-meta">
              <span className="sd-badge sd-badge--swiss">🇨🇭 {swiss.badge}</span>
              {isFeatured && <span className="sd-badge sd-badge--feat">Spotlight</span>}
              {row.open_to_investment && <span className="sd-badge sd-badge--inv">Investor-Ready</span>}
            </div>
            <h1 className="sd-name">{row.name}</h1>
            <p className="sd-tagline">{row.tagline}</p>
          </div>
        </div>

        <div className="sd-section">
          <p className="sd-section__label">Über das Unternehmen</p>
          <p className="sd-description">{row.description}</p>
        </div>

        <div className="sd-section">
          <p className="sd-section__label">Key Facts</p>
          <div className="sd-facts">
            <div className="sd-fact">
              <p className="sd-fact__label">Branche</p>
              <p className="sd-fact__value">{row.industry}</p>
            </div>
            <div className="sd-fact">
              <p className="sd-fact__label">Sitz</p>
              <p className="sd-fact__value">📍 {row.city}</p>
            </div>
            <div className="sd-fact">
              <p className="sd-fact__label">Gegründet</p>
              <p className="sd-fact__value">{row.founded_year}</p>
            </div>
            <div className="sd-fact">
              <p className="sd-fact__label">Mitarbeitende</p>
              <p className="sd-fact__value">{empLabel}</p>
            </div>
            {fundingLabel && (
              <div className="sd-fact">
                <p className="sd-fact__label">Funding Stage</p>
                <p className="sd-fact__value">{fundingLabel}</p>
              </div>
            )}
            <div className="sd-fact">
              <p className="sd-fact__label">Status</p>
              <p className="sd-fact__value">{swiss.label}</p>
            </div>
          </div>
        </div>

        {hasInvestorBlock && (
          <div className="sd-section">
            <div className="sd-inv">
              <div className="sd-inv__head">
                <span>✦</span>
                <p className="sd-inv__title">{row.open_to_investment ? "Offen für Investoren" : "Investor-Info"}</p>
              </div>
              <div className="sd-inv__list">
                {fundingLabel && (
                  <div>
                    <p className="sd-inv__item-label">Funding Stage</p>
                    <p className="sd-inv__item-value">{fundingLabel}</p>
                  </div>
                )}
                {row.total_funding_range && (
                  <div>
                    <p className="sd-inv__item-label">Total Funding</p>
                    <p className="sd-inv__item-value">{row.total_funding_range}</p>
                  </div>
                )}
                {lastRoundFormatted && (
                  <div>
                    <p className="sd-inv__item-label">Letzte Runde</p>
                    <p className="sd-inv__item-value">{lastRoundFormatted}</p>
                  </div>
                )}
              </div>
              {row.pitch_deck_url && (
                <a href={row.pitch_deck_url} target="_blank" rel="noreferrer noopener" className="sd-inv__pitch">
                  Pitch Deck ansehen →
                </a>
              )}
            </div>
          </div>
        )}

        {row.founder_names && row.founder_names.length > 0 && (
          <div className="sd-section">
            <p className="sd-section__label">Gründer:innen</p>
            <p className="sd-founders">{row.founder_names.join(" · ")}</p>
          </div>
        )}

        <div className="sd-cta-row">
          <a href={row.website} target="_blank" rel="noreferrer noopener" className="sd-cta">
            Website besuchen →
          </a>
        </div>

        <Link href="/swiss-ai" className="sd-back">← Zurück zum Verzeichnis</Link>
      </section>

      <Footer />
    </main>
  );
}

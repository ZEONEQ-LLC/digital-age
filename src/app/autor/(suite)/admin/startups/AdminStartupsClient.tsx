"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { StartupRow, StartupStatus } from "@/lib/startupApi";
import {
  approveStartup,
  rejectStartup,
  toggleStartupFeatured,
  toggleInvestorReady,
  updateStartup,
  archiveStartup,
  restoreStartupToPending,
  restoreStartupToPublished,
  deleteStartup,
} from "@/lib/startupActions";
import {
  SWISS_STATUSES,
  EMPLOYEE_RANGES,
  FUNDING_STAGES,
  INDUSTRIES,
  lookupSwissStatus,
  lookupEmployeeRange,
} from "@/lib/mappers/startupMappers";
import type {
  SwissStatusCode,
  EmployeeRangeCode,
  FundingStageCode,
} from "@/lib/startupApi";

type TabKey = "pending" | "published" | "featured" | "rejected" | "archived";

const tabOrder: TabKey[] = ["pending", "published", "featured", "rejected", "archived"];
const tabLabels: Record<TabKey, string> = {
  pending:   "Pending",
  published: "Published",
  featured:  "Spotlight",
  rejected:  "Rejected",
  archived:  "Archived",
};

const statusStyles: Record<StartupStatus, { bg: string; color: string }> = {
  pending:   { bg: "rgba(255,140,66,0.12)", color: "var(--da-orange)"      },
  published: { bg: "rgba(50,255,126,0.10)", color: "var(--da-green)"       },
  featured:  { bg: "rgba(255,140,66,0.18)", color: "var(--da-orange)"      },
  rejected:  { bg: "rgba(255,85,85,0.10)",  color: "#ff8080"               },
  archived:  { bg: "rgba(85,85,85,0.18)",   color: "var(--da-muted-soft)"  },
};

type EditDraft = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  website: string;
  logo_url: string;
  swiss_status: SwissStatusCode;
  industry: string;
  city: string;
  employee_range: EmployeeRangeCode;
  founded_year: string;
  funding_stage: FundingStageCode | "";
  total_funding_range: string;
  last_round_at: string;
  open_to_investment: boolean;
  pitch_deck_url: string;
  founder_names: string;
};

function startupToDraft(s: StartupRow): EditDraft {
  return {
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    description: s.description,
    website: s.website,
    logo_url: s.logo_url ?? "",
    swiss_status: s.swiss_status,
    industry: s.industry,
    city: s.city,
    employee_range: s.employee_range,
    founded_year: String(s.founded_year),
    funding_stage: s.funding_stage ?? "",
    total_funding_range: s.total_funding_range ?? "",
    last_round_at: s.last_round_at ?? "",
    open_to_investment: s.open_to_investment,
    pitch_deck_url: s.pitch_deck_url ?? "",
    founder_names: s.founder_names ? s.founder_names.join(", ") : "",
  };
}

type Props = {
  initialStartups: StartupRow[];
  initialFeaturedCount: number;
};

export default function AdminStartupsClient({ initialStartups, initialFeaturedCount }: Props) {
  const router = useRouter();
  const startups = initialStartups;
  const [tab, setTab] = useState<TabKey>("pending");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [preview, setPreview] = useState<StartupRow | null>(null);
  const [rejectFor, setRejectFor] = useState<StartupRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [editFor, setEditFor] = useState<StartupRow | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { pending: 0, published: 0, featured: 0, rejected: 0, archived: 0 };
    for (const s of startups) c[s.status as TabKey]++;
    return c;
  }, [startups]);

  const featuredCount = counts.featured || initialFeaturedCount;
  const spotlightFull = featuredCount >= 3;

  const filtered = useMemo(() => startups.filter((s) => s.status === tab), [startups, tab]);

  function wrap<T extends unknown[]>(id: string, fn: (...args: T) => Promise<void>, ...args: T) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      try {
        await fn(...args);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusyId(null);
      }
    });
  }

  function openReject(s: StartupRow) {
    setRejectFor(s);
    setRejectReason("");
  }

  function submitReject() {
    if (!rejectFor) return;
    if (!rejectReason.trim()) return;
    const id = rejectFor.id;
    const reason = rejectReason;
    setRejectFor(null);
    wrap(id, async () => { await rejectStartup(id, reason); });
  }

  function openEdit(s: StartupRow) {
    setEditFor(s);
    setDraft(startupToDraft(s));
  }

  function submitEdit() {
    if (!editFor || !draft) return;
    const id = editFor.id;
    const founders = draft.founder_names
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const year = Number(draft.founded_year);
    setEditFor(null);
    setDraft(null);
    wrap(id, async () => {
      await updateStartup(id, {
        slug: draft.slug,
        name: draft.name,
        tagline: draft.tagline,
        description: draft.description,
        website: draft.website,
        logo_url: draft.logo_url || null,
        swiss_status: draft.swiss_status,
        industry: draft.industry,
        city: draft.city,
        employee_range: draft.employee_range,
        founded_year: year,
        funding_stage: draft.funding_stage || null,
        total_funding_range: draft.total_funding_range || null,
        last_round_at: draft.last_round_at || null,
        open_to_investment: draft.open_to_investment,
        pitch_deck_url: draft.pitch_deck_url || null,
        founder_names: founders.length > 0 ? founders : null,
      });
    });
  }

  function updateDraft<K extends keyof EditDraft>(key: K, val: EditDraft[K]) {
    setDraft((d) => (d ? { ...d, [key]: val } : d));
  }

  return (
    <>
      <style>{`
        .as-tabs {
          display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px;
        }
        .as-chip {
          background: transparent; color: var(--da-muted-soft);
          border: 1px solid var(--da-border);
          padding: 6px 12px; border-radius: 999px;
          font-size: 12px; cursor: pointer; font-family: inherit;
        }
        .as-chip:hover { color: var(--da-text); border-color: var(--da-muted); }
        .as-chip--active {
          background: var(--da-green); color: var(--da-dark);
          border-color: var(--da-green); font-weight: 600;
        }
        .as-spot-meter {
          margin-bottom: 16px; font-family: var(--da-font-mono);
          font-size: 11px; color: var(--da-muted-soft);
          display: flex; align-items: center; gap: 10px;
        }
        .as-spot-meter strong { color: var(--da-orange); font-weight: 700; }
        .as-spot-meter--full strong { color: #ff8080; }
        .as-error {
          background: rgba(255,85,85,0.08); color: #ff8080;
          border: 1px solid rgba(255,85,85,0.3);
          padding: 10px 12px; border-radius: 4px;
          font-size: 12px; margin-bottom: 16px;
        }
        .as-table {
          background: var(--da-darker); border: 1px solid var(--da-border);
          border-radius: 8px; overflow: hidden;
        }
        .as-row {
          display: grid;
          grid-template-columns: 40px minmax(0,1.4fr) 100px 80px 80px 90px minmax(0,300px);
          gap: 12px; padding: 12px 14px;
          border-bottom: 1px solid var(--da-border);
          font-size: 12px; color: var(--da-text); align-items: center;
        }
        .as-row:last-child { border-bottom: none; }
        .as-row--head {
          background: var(--da-dark); color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
          font-weight: 700;
        }
        .as-logo {
          width: 32px; height: 32px; border-radius: 6px;
          background: var(--da-dark); border: 1px solid var(--da-border);
          display: flex; align-items: center; justify-content: center;
          color: var(--da-muted); font-size: 13px; font-weight: 700;
          overflow: hidden;
        }
        .as-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .as-title { color: var(--da-text); font-weight: 600; overflow: hidden; }
        .as-title__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .as-title__sub { color: var(--da-muted); font-size: 11px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .as-empty {
          padding: 36px; text-align: center; color: var(--da-muted-soft); font-size: 13px;
        }
        .as-badge {
          display: inline-block; padding: 3px 8px; border-radius: 999px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
          font-family: var(--da-font-mono); text-transform: uppercase;
        }
        .as-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .as-btn {
          background: transparent; color: var(--da-text);
          border: 1px solid var(--da-border);
          padding: 5px 10px; border-radius: 4px;
          font-size: 11px; cursor: pointer; font-family: inherit;
        }
        .as-btn:hover { border-color: var(--da-muted); }
        .as-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .as-btn--ok { color: var(--da-green); border-color: rgba(50,255,126,0.4); }
        .as-btn--ok:hover { background: rgba(50,255,126,0.08); }
        .as-btn--feat { color: var(--da-orange); border-color: rgba(255,140,66,0.4); }
        .as-btn--feat:hover:not(:disabled) { background: rgba(255,140,66,0.08); }
        .as-btn--danger { color: #ff8080; border-color: rgba(255,85,85,0.4); }
        .as-btn--danger:hover { background: rgba(255,85,85,0.08); }

        .as-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          z-index: 100; display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .as-modal {
          background: var(--da-darker); border: 1px solid var(--da-border);
          border-radius: 8px; max-width: 720px; width: 100%;
          padding: 28px; max-height: 90vh; overflow-y: auto;
        }
        .as-modal h3 { color: var(--da-text); font-family: var(--da-font-display); font-size: 18px; margin-bottom: 8px; }
        .as-modal .meta { color: var(--da-muted); font-size: 12px; margin-bottom: 18px; font-family: var(--da-font-mono); }
        .as-modal__block { margin-bottom: 16px; }
        .as-modal__label { color: var(--da-faint); font-family: var(--da-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px; }
        .as-modal__body { color: var(--da-text); font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; background: var(--da-dark); border: 1px solid var(--da-border); border-radius: 4px; padding: 12px; }
        .as-modal__actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 22px; }
        .as-modal__row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .as-input, .as-textarea, .as-select {
          width: 100%; background: var(--da-dark); color: var(--da-text);
          border: 1px solid var(--da-border); border-radius: 4px;
          padding: 9px 12px; font-size: 13px; font-family: inherit;
          box-sizing: border-box;
        }
        .as-input:focus, .as-textarea:focus, .as-select:focus { outline: none; border-color: var(--da-green); }
        .as-textarea { resize: vertical; min-height: 80px; }
        .as-input--mono { font-family: var(--da-font-mono); font-size: 12px; }
        .as-field-label { display: block; font-size: 11px; font-weight: 600; color: var(--da-text-strong); margin-bottom: 5px; font-family: var(--da-font-mono); text-transform: uppercase; letter-spacing: 0.06em; }
        .as-check-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--da-text); }
        .as-check-row input { accent-color: var(--da-green); }

        @media (max-width: 1100px) {
          .as-row { grid-template-columns: 36px minmax(0,1.4fr) 80px 90px minmax(0,260px); }
          .as-col-industry, .as-col-city { display: none; }
        }
      `}</style>

      {error && <div className="as-error">{error}</div>}

      <div className="as-tabs">
        {tabOrder.map((k) => (
          <button
            key={k}
            className={`as-chip${tab === k ? " as-chip--active" : ""}`}
            onClick={() => setTab(k)}
          >
            {tabLabels[k]} ({counts[k]})
          </button>
        ))}
      </div>

      <div className={`as-spot-meter${spotlightFull ? " as-spot-meter--full" : ""}`}>
        Spotlight: <strong>{featuredCount}/3</strong> belegt
        {spotlightFull && <span>· Limit erreicht — bitte zuerst einen entfernen</span>}
      </div>

      <div className="as-table">
        <div className="as-row as-row--head">
          <span></span>
          <span>Name / Tagline</span>
          <span className="as-col-industry">Branche</span>
          <span className="as-col-city">Stadt</span>
          <span>Status</span>
          <span>Investor</span>
          <span>Aktionen</span>
        </div>
        {filtered.length === 0 ? (
          <div className="as-empty">Keine Startups in „{tabLabels[tab]}“.</div>
        ) : (
          filtered.map((s) => {
            const ss = statusStyles[s.status];
            const swiss = lookupSwissStatus(s.swiss_status);
            const busy = busyId === s.id;
            const featureDisabled = busy || (s.status !== "featured" && spotlightFull);
            return (
              <div className="as-row" key={s.id}>
                <div className="as-logo" aria-hidden>
                  {s.logo_url ? (
                    <Image src={s.logo_url} alt="" width={32} height={32} unoptimized />
                  ) : (
                    s.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="as-title">
                  <div className="as-title__name">{s.name}</div>
                  <div className="as-title__sub">{s.tagline}</div>
                </div>
                <div className="as-col-industry" style={{ color: "var(--da-muted)" }}>{s.industry}</div>
                <div className="as-col-city" style={{ color: "var(--da-muted)" }}>{s.city}</div>
                <span className="as-badge" style={{ background: ss.bg, color: ss.color }}>
                  {tabLabels[s.status as TabKey]}
                </span>
                <span style={{ color: s.open_to_investment ? "var(--da-orange)" : "var(--da-faint)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
                  {s.open_to_investment ? "✓ Ready" : "—"}
                </span>
                <div className="as-actions">
                  <button className="as-btn" onClick={() => setPreview(s)}>Vorschau</button>
                  {s.status === "pending" && (
                    <>
                      <button
                        className="as-btn as-btn--ok"
                        disabled={busy}
                        onClick={() => wrap(s.id, async () => { await approveStartup(s.id); })}
                      >
                        Approve
                      </button>
                      <button
                        className="as-btn as-btn--feat"
                        disabled={featureDisabled}
                        title={spotlightFull ? "Spotlight-Limit erreicht" : ""}
                        onClick={() => wrap(s.id, async () => { await approveStartup(s.id, { feature: true }); })}
                      >
                        + Feature
                      </button>
                      <button className="as-btn as-btn--danger" disabled={busy} onClick={() => openReject(s)}>Reject</button>
                    </>
                  )}
                  {(s.status === "published" || s.status === "featured") && (
                    <>
                      <button
                        className="as-btn as-btn--feat"
                        disabled={s.status === "published" && spotlightFull ? true : busy}
                        title={s.status === "published" && spotlightFull ? "Spotlight-Limit erreicht" : ""}
                        onClick={() => wrap(s.id, async () => { await toggleStartupFeatured(s.id); })}
                      >
                        {s.status === "featured" ? "Unfeature" : "Feature"}
                      </button>
                      <button className="as-btn" disabled={busy} onClick={() => wrap(s.id, async () => { await toggleInvestorReady(s.id); })}>
                        {s.open_to_investment ? "✕ Investor" : "✓ Investor"}
                      </button>
                      <button className="as-btn" disabled={busy} onClick={() => openEdit(s)}>Edit</button>
                      <button className="as-btn" disabled={busy} onClick={() => wrap(s.id, async () => { await archiveStartup(s.id); })}>Archive</button>
                    </>
                  )}
                  {s.status === "rejected" && (
                    <>
                      <button className="as-btn" disabled={busy} onClick={() => wrap(s.id, async () => { await restoreStartupToPending(s.id); })}>Re-Open</button>
                      <button className="as-btn as-btn--danger" disabled={busy} onClick={() => {
                        if (!confirm(`Startup „${s.name}" endgültig löschen?`)) return;
                        wrap(s.id, async () => { await deleteStartup(s.id); });
                      }}>Löschen</button>
                    </>
                  )}
                  {s.status === "archived" && (
                    <>
                      <button className="as-btn as-btn--ok" disabled={busy} onClick={() => wrap(s.id, async () => { await restoreStartupToPublished(s.id); })}>Restore</button>
                      <button className="as-btn as-btn--danger" disabled={busy} onClick={() => {
                        if (!confirm(`Startup „${s.name}" endgültig löschen?`)) return;
                        wrap(s.id, async () => { await deleteStartup(s.id); });
                      }}>Löschen</button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {preview && (
        <div className="as-overlay" onClick={() => setPreview(null)}>
          <div className="as-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{preview.name}</h3>
            <p className="meta">
              {lookupSwissStatus(preview.swiss_status).label} · {preview.industry} · {preview.city} · gegründet {preview.founded_year} · {lookupEmployeeRange(preview.employee_range)} MA
            </p>

            <div className="as-modal__block">
              <p className="as-modal__label">Tagline</p>
              <div className="as-modal__body">{preview.tagline}</div>
            </div>
            <div className="as-modal__block">
              <p className="as-modal__label">Beschreibung</p>
              <div className="as-modal__body">{preview.description}</div>
            </div>
            <div className="as-modal__block">
              <p className="as-modal__label">Website</p>
              <div className="as-modal__body">
                <a href={preview.website} target="_blank" rel="noreferrer" style={{ color: "var(--da-green)" }}>{preview.website}</a>
              </div>
            </div>
            {preview.submitter_name && (
              <div className="as-modal__block">
                <p className="as-modal__label">Submitter</p>
                <div className="as-modal__body">
                  {preview.submitter_name}
                  {preview.submitter_email && <> · {preview.submitter_email}</>}
                  {preview.submitter_role && <> · {preview.submitter_role}</>}
                </div>
              </div>
            )}
            {preview.rejection_reason && (
              <div className="as-modal__block">
                <p className="as-modal__label">Rejection-Grund</p>
                <div className="as-modal__body" style={{ color: "#ff8080" }}>{preview.rejection_reason}</div>
              </div>
            )}
            <div className="as-modal__actions">
              <button className="as-btn" onClick={() => setPreview(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {rejectFor && (
        <div className="as-overlay" onClick={() => setRejectFor(null)}>
          <div className="as-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Startup ablehnen</h3>
            <p className="meta">{rejectFor.name}</p>
            <div className="as-modal__block">
              <p className="as-modal__label">Grund (intern, wird gespeichert)</p>
              <textarea
                className="as-textarea"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="z.B. Nicht Schweiz-relevant, qualitativ zu dünn, …"
              />
            </div>
            <div className="as-modal__actions">
              <button className="as-btn" onClick={() => setRejectFor(null)}>Abbrechen</button>
              <button className="as-btn as-btn--danger" onClick={submitReject} disabled={!rejectReason.trim()}>Ablehnen</button>
            </div>
          </div>
        </div>
      )}

      {editFor && draft && (
        <div className="as-overlay" onClick={() => { setEditFor(null); setDraft(null); }}>
          <div className="as-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Startup bearbeiten</h3>
            <p className="meta">{editFor.name}</p>

            <div className="as-modal__row" style={{ marginBottom: 14 }}>
              <div>
                <label className="as-field-label">Slug</label>
                <input className="as-input as-input--mono" value={draft.slug} onChange={(e) => updateDraft("slug", e.target.value)} />
              </div>
              <div>
                <label className="as-field-label">Name</label>
                <input className="as-input" maxLength={80} value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} />
              </div>
            </div>

            <div className="as-modal__block">
              <label className="as-field-label">Tagline (max 100)</label>
              <input className="as-input" maxLength={100} value={draft.tagline} onChange={(e) => updateDraft("tagline", e.target.value)} />
            </div>

            <div className="as-modal__block">
              <label className="as-field-label">Beschreibung</label>
              <textarea className="as-textarea" rows={5} value={draft.description} onChange={(e) => updateDraft("description", e.target.value)} />
            </div>

            <div className="as-modal__row" style={{ marginBottom: 14 }}>
              <div>
                <label className="as-field-label">Website</label>
                <input className="as-input" value={draft.website} onChange={(e) => updateDraft("website", e.target.value)} />
              </div>
              <div>
                <label className="as-field-label">Logo URL</label>
                <input className="as-input" value={draft.logo_url} onChange={(e) => updateDraft("logo_url", e.target.value)} />
              </div>
            </div>

            <div className="as-modal__row" style={{ marginBottom: 14 }}>
              <div>
                <label className="as-field-label">Swiss Status</label>
                <select className="as-select" value={draft.swiss_status} onChange={(e) => updateDraft("swiss_status", e.target.value as SwissStatusCode)}>
                  {SWISS_STATUSES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="as-field-label">Branche</label>
                <select className="as-select" value={draft.industry} onChange={(e) => updateDraft("industry", e.target.value)}>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>

            <div className="as-modal__row" style={{ marginBottom: 14 }}>
              <div>
                <label className="as-field-label">Stadt</label>
                <input className="as-input" value={draft.city} onChange={(e) => updateDraft("city", e.target.value)} />
              </div>
              <div>
                <label className="as-field-label">Mitarbeitende</label>
                <select className="as-select" value={draft.employee_range} onChange={(e) => updateDraft("employee_range", e.target.value as EmployeeRangeCode)}>
                  {EMPLOYEE_RANGES.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <div className="as-modal__row" style={{ marginBottom: 14 }}>
              <div>
                <label className="as-field-label">Gegründet</label>
                <input className="as-input" type="number" min={1990} max={2030} value={draft.founded_year} onChange={(e) => updateDraft("founded_year", e.target.value)} />
              </div>
              <div>
                <label className="as-field-label">Funding Stage</label>
                <select className="as-select" value={draft.funding_stage} onChange={(e) => updateDraft("funding_stage", e.target.value as FundingStageCode | "")}>
                  <option value="">—</option>
                  {FUNDING_STAGES.map((f) => <option key={f.code} value={f.code}>{f.label}</option>)}
                </select>
              </div>
            </div>

            <div className="as-modal__row" style={{ marginBottom: 14 }}>
              <div>
                <label className="as-field-label">Total Funding</label>
                <input className="as-input" value={draft.total_funding_range} onChange={(e) => updateDraft("total_funding_range", e.target.value)} placeholder="CHF 5–10M" />
              </div>
              <div>
                <label className="as-field-label">Letzte Runde</label>
                <input className="as-input" type="date" value={draft.last_round_at} onChange={(e) => updateDraft("last_round_at", e.target.value)} />
              </div>
            </div>

            <div className="as-modal__block">
              <label className="as-field-label">Pitch Deck URL</label>
              <input className="as-input" value={draft.pitch_deck_url} onChange={(e) => updateDraft("pitch_deck_url", e.target.value)} />
            </div>

            <div className="as-modal__block">
              <label className="as-field-label">Gründer:innen (kommagetrennt)</label>
              <input className="as-input" value={draft.founder_names} onChange={(e) => updateDraft("founder_names", e.target.value)} placeholder="Anna Muster, Beat Beispiel" />
            </div>

            <div className="as-modal__block">
              <label className="as-check-row">
                <input type="checkbox" checked={draft.open_to_investment} onChange={(e) => updateDraft("open_to_investment", e.target.checked)} />
                Offen für Investorengespräche
              </label>
            </div>

            <div className="as-modal__actions">
              <button className="as-btn" onClick={() => { setEditFor(null); setDraft(null); }}>Abbrechen</button>
              <button className="as-btn as-btn--ok" onClick={submitEdit}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

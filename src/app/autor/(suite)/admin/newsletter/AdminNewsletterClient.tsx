"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { unsubscribeSubscriber } from "@/lib/newsletter/unsubscribe";

export type StatusFilter = "all" | "pending" | "confirmed" | "unsubscribed";
type SortKey = "created_at" | "email" | "status";

export type SubscriberRow = {
  id: string;
  email: string;
  emailDomain: string | null;
  status: "pending" | "confirmed" | "unsubscribed";
  source: "footer" | "inline" | "full" | "sidebar";
  consentAt: string;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
  confirmationExpiresAt: string;
};

type Props = {
  rows: SubscriberRow[];
  counts: Record<StatusFilter, number>;
  activeStatus: StatusFilter;
  activeSort: SortKey;
};

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "Alle",
  pending: "Pending",
  confirmed: "Confirmed",
  unsubscribed: "Unsubscribed",
};

const STATUS_BADGE_COLOR: Record<SubscriberRow["status"], string> = {
  pending: "var(--da-orange)",
  confirmed: "var(--da-green)",
  unsubscribed: "var(--da-muted-soft)",
};

function formatDateDE(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Relativer Expiry-Status für Pending-Rows. Abgelaufen / „X Tage" / „heute".
function formatExpiry(iso: string, status: SubscriberRow["status"]): {
  label: string;
  color: string;
} {
  if (status !== "pending") return { label: "—", color: "var(--da-muted-soft)" };
  const expires = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = expires - now;
  if (diffMs <= 0) return { label: "Abgelaufen", color: "#ff6b6b" };
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return { label: "<24h", color: "var(--da-orange)" };
  if (diffDays === 1) return { label: "1 Tag", color: "var(--da-orange)" };
  if (diffDays <= 2) return { label: `${diffDays} Tage`, color: "var(--da-orange)" };
  return { label: `${diffDays} Tage`, color: "var(--da-muted)" };
}

function csvEscape(value: string): string {
  if (value === "" || (!value.includes(",") && !value.includes('"') && !value.includes("\n"))) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadCsv(rows: SubscriberRow[], status: StatusFilter): void {
  const header = [
    "email",
    "email_domain",
    "status",
    "source",
    "created_at",
    "consent_at",
    "confirmation_expires_at",
    "confirmed_at",
    "unsubscribed_at",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.email),
        csvEscape(r.emailDomain ?? ""),
        csvEscape(r.status),
        csvEscape(r.source),
        csvEscape(r.createdAt),
        csvEscape(r.consentAt),
        csvEscape(r.confirmationExpiresAt),
        csvEscape(r.confirmedAt ?? ""),
        csvEscape(r.unsubscribedAt ?? ""),
      ].join(","),
    );
  }
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `newsletter-subscribers-${today}-${status}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminNewsletterClient({
  rows,
  counts,
  activeStatus,
  activeSort,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  function handleUnsubscribe(row: SubscriberRow) {
    if (row.status === "unsubscribed") return;
    if (!confirm(`„${row.email}" als unsubscribed markieren?`)) return;
    setPendingId(row.id);
    startTransition(async () => {
      try {
        const result = await unsubscribeSubscriber(row.id);
        if (!result.success) {
          setToast(result.message);
        } else {
          setToast("Status auf unsubscribed gesetzt.");
          router.refresh();
        }
      } catch (e) {
        setToast(e instanceof Error ? e.message : String(e));
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <>
      <style>{`
        .nl-adm-tabs { display: flex; gap: 4px; margin-bottom: 18px; flex-wrap: wrap; }
        .nl-adm-tab {
          background: var(--da-card);
          color: var(--da-muted);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 7px 12px;
          font-size: 12px;
          font-family: var(--da-font-mono);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .nl-adm-tab:hover { color: var(--da-text); }
        .nl-adm-tab--active {
          color: var(--da-text);
          border-color: var(--da-green);
        }
        .nl-adm-tab__count {
          color: var(--da-faint);
          font-size: 11px;
        }
        .nl-adm-tab--active .nl-adm-tab__count { color: var(--da-green); }

        .nl-adm-toolbar {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .nl-adm-sort {
          background: var(--da-card);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 7px 10px;
          font-size: 12px;
          font-family: var(--da-font-body);
        }
        .nl-adm-export {
          margin-left: auto;
          background: var(--da-green);
          color: var(--da-dark);
          border: none;
          border-radius: 4px;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .nl-adm-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 6px;
          overflow: hidden;
        }
        .nl-adm-th {
          text-align: left;
          font-family: var(--da-font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--da-muted);
          padding: 12px 14px;
          background: var(--da-dark);
          border-bottom: 1px solid var(--da-border);
          white-space: nowrap;
        }
        .nl-adm-td {
          padding: 11px 14px;
          font-size: 13px;
          color: var(--da-text);
          border-bottom: 1px solid var(--da-border);
          vertical-align: middle;
        }
        .nl-adm-tr:last-child .nl-adm-td { border-bottom: none; }
        .nl-adm-td--mono {
          font-family: var(--da-font-mono);
          font-size: 12px;
          color: var(--da-muted);
        }
        .nl-adm-td--date {
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 11px;
          white-space: nowrap;
        }
        .nl-adm-status {
          font-family: var(--da-font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 3px;
          background: var(--da-dark);
        }
        .nl-adm-source {
          font-family: var(--da-font-mono);
          font-size: 11px;
          color: var(--da-muted-soft);
        }
        .nl-adm-action {
          background: transparent;
          color: var(--da-muted-soft);
          border: 1px solid var(--da-border);
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-family: var(--da-font-mono);
          cursor: pointer;
        }
        .nl-adm-action:hover:not(:disabled) {
          color: #ff8e8e;
          border-color: #ff6b6b;
        }
        .nl-adm-action:disabled { opacity: 0.4; cursor: not-allowed; }
        .nl-adm-empty {
          padding: 40px 20px;
          text-align: center;
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 13px;
        }

        .nl-adm-cards { display: none; }
        @media (max-width: 768px) {
          .nl-adm-table-wrap { display: none; }
          .nl-adm-cards { display: flex; flex-direction: column; gap: 10px; }
          .nl-adm-card {
            background: var(--da-card);
            border: 1px solid var(--da-border);
            border-radius: 6px;
            padding: 14px;
          }
          .nl-adm-card__row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 6px;
            font-size: 12px;
          }
          .nl-adm-card__email {
            color: var(--da-text);
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 6px;
            word-break: break-all;
          }
        }
      `}</style>

      <div className="nl-adm-tabs">
        {(["all", "pending", "confirmed", "unsubscribed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={`nl-adm-tab${s === activeStatus ? " nl-adm-tab--active" : ""}`}
            onClick={() => setParam("status", s)}
          >
            {STATUS_LABEL[s]}
            <span className="nl-adm-tab__count">{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="nl-adm-toolbar">
        <label
          style={{
            color: "var(--da-muted)",
            fontSize: 12,
            fontFamily: "var(--da-font-mono)",
          }}
        >
          Sortierung:
        </label>
        <select
          className="nl-adm-sort"
          value={activeSort}
          onChange={(e) => setParam("sort", e.target.value)}
        >
          <option value="created_at">Datum (neueste zuerst)</option>
          <option value="email">E-Mail (A–Z)</option>
          <option value="status">Status</option>
        </select>
        <button
          type="button"
          className="nl-adm-export"
          onClick={() => downloadCsv(rows, activeStatus)}
          disabled={rows.length === 0}
        >
          CSV exportieren ({rows.length})
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="nl-adm-empty">Noch keine Anmeldungen.</div>
      ) : (
        <>
          <div className="nl-adm-table-wrap">
            <table className="nl-adm-table">
              <thead>
                <tr>
                  <th className="nl-adm-th">E-Mail</th>
                  <th className="nl-adm-th">Domain</th>
                  <th className="nl-adm-th">Status</th>
                  <th className="nl-adm-th">Source</th>
                  <th className="nl-adm-th">Erstellt</th>
                  <th className="nl-adm-th">Consent</th>
                  <th className="nl-adm-th">Expiry</th>
                  <th className="nl-adm-th" style={{ textAlign: "right" }}>
                    Aktion
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="nl-adm-tr">
                    <td className="nl-adm-td" style={{ wordBreak: "break-all" }}>
                      {r.email}
                    </td>
                    <td className="nl-adm-td nl-adm-td--mono">
                      {r.emailDomain ?? "—"}
                    </td>
                    <td className="nl-adm-td">
                      <span
                        className="nl-adm-status"
                        style={{ color: STATUS_BADGE_COLOR[r.status] }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="nl-adm-td nl-adm-source">{r.source}</td>
                    <td className="nl-adm-td nl-adm-td--date">
                      {formatDateDE(r.createdAt)}
                    </td>
                    <td className="nl-adm-td nl-adm-td--date">
                      {formatDateDE(r.consentAt)}
                    </td>
                    {(() => {
                      const exp = formatExpiry(
                        r.confirmationExpiresAt,
                        r.status,
                      );
                      return (
                        <td
                          className="nl-adm-td nl-adm-td--date"
                          style={{ color: exp.color }}
                        >
                          {exp.label}
                        </td>
                      );
                    })()}
                    <td className="nl-adm-td" style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="nl-adm-action"
                        onClick={() => handleUnsubscribe(r)}
                        disabled={r.status === "unsubscribed" || pendingId === r.id}
                      >
                        {pendingId === r.id ? "…" : "Unsubscribe"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="nl-adm-cards">
            {rows.map((r) => (
              <div key={r.id} className="nl-adm-card">
                <div className="nl-adm-card__email">{r.email}</div>
                <div className="nl-adm-card__row">
                  <span style={{ color: "var(--da-muted-soft)" }}>
                    {r.emailDomain ?? "—"}
                  </span>
                  <span
                    className="nl-adm-status"
                    style={{ color: STATUS_BADGE_COLOR[r.status] }}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="nl-adm-card__row">
                  <span style={{ color: "var(--da-muted)" }}>
                    {r.source} · {formatDateDE(r.createdAt)}
                  </span>
                </div>
                {r.status === "pending" &&
                  (() => {
                    const exp = formatExpiry(
                      r.confirmationExpiresAt,
                      r.status,
                    );
                    return (
                      <div className="nl-adm-card__row">
                        <span style={{ color: exp.color }}>
                          Expiry: {exp.label}
                        </span>
                      </div>
                    );
                  })()}
                <button
                  type="button"
                  className="nl-adm-action"
                  onClick={() => handleUnsubscribe(r)}
                  disabled={r.status === "unsubscribed" || pendingId === r.id}
                  style={{ marginTop: 8 }}
                >
                  {pendingId === r.id ? "…" : "Unsubscribe"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "var(--da-green)",
            color: "var(--da-dark)",
            padding: "12px 18px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            zIndex: 200,
            fontFamily: "var(--da-font-body)",
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}

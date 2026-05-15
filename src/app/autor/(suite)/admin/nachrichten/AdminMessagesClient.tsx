"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  updateContactNotes,
  updateContactStatus,
} from "@/lib/contact/adminActions";

export type StatusFilter = "all" | "new" | "replied" | "archived";

export type MessageRow = {
  id: string;
  name: string;
  email: string;
  topic: string;
  organization: string | null;
  message: string;
  status: "new" | "replied" | "archived";
  createdAt: string;
  repliedAt: string | null;
  notes: string | null;
};

type Props = {
  rows: MessageRow[];
  counts: Record<StatusFilter, number>;
  activeStatus: StatusFilter;
  focusId: string | null;
};

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "Alle",
  new: "Neu",
  replied: "Beantwortet",
  archived: "Archiviert",
};

const STATUS_COLOR: Record<MessageRow["status"], string> = {
  new: "var(--da-orange)",
  replied: "var(--da-green)",
  archived: "var(--da-muted-soft)",
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

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export default function AdminMessagesClient({
  rows,
  counts,
  activeStatus,
  focusId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(focusId);
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setOpenId(focusId);
  }, [focusId]);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value === null) params.delete(key);
    else params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  const openRow = openId ? rows.find((r) => r.id === openId) ?? null : null;

  function handleStatus(id: string, status: MessageRow["status"]) {
    startTransition(async () => {
      const result = await updateContactStatus(id, status);
      if (!result.ok) {
        setToast(result.message);
      } else {
        setToast(`Status: ${STATUS_LABEL[status as StatusFilter] ?? status}`);
        router.refresh();
      }
    });
  }

  function handleNotes(id: string, notes: string) {
    startTransition(async () => {
      const result = await updateContactNotes(id, notes);
      if (!result.ok) {
        setToast(result.message);
      } else {
        setToast("Notiz gespeichert.");
        router.refresh();
      }
    });
  }

  return (
    <>
      <style>{`
        .ko-adm-tabs { display: flex; gap: 4px; margin-bottom: 18px; flex-wrap: wrap; }
        .ko-adm-tab {
          background: var(--da-card);
          color: var(--da-muted);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 7px 12px;
          font-size: 12px;
          font-family: var(--da-font-mono);
          cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .ko-adm-tab:hover { color: var(--da-text); }
        .ko-adm-tab--active { color: var(--da-text); border-color: var(--da-green); }
        .ko-adm-tab__count { color: var(--da-faint); font-size: 11px; }
        .ko-adm-tab--active .ko-adm-tab__count { color: var(--da-green); }

        .ko-adm-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 6px;
          overflow: hidden;
        }
        .ko-adm-th {
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
        .ko-adm-td {
          padding: 11px 14px;
          font-size: 13px;
          color: var(--da-text);
          border-bottom: 1px solid var(--da-border);
          vertical-align: middle;
          cursor: pointer;
        }
        .ko-adm-tr:hover .ko-adm-td { background: rgba(255,255,255,0.02); }
        .ko-adm-tr:last-child .ko-adm-td { border-bottom: none; }
        .ko-adm-td--date {
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 11px;
          white-space: nowrap;
        }
        .ko-adm-status {
          font-family: var(--da-font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 3px;
          background: var(--da-dark);
        }
        .ko-adm-empty {
          padding: 40px 20px;
          text-align: center;
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 13px;
        }

        .ko-adm-modal-bg {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 80;
          display: flex; align-items: flex-start; justify-content: center;
          padding: 60px 20px;
          overflow-y: auto;
        }
        .ko-adm-modal {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 8px;
          width: 100%;
          max-width: 680px;
          padding: 28px 28px 24px;
          font-family: var(--da-font-body);
        }
        .ko-adm-modal__close {
          background: transparent;
          color: var(--da-muted);
          border: none;
          cursor: pointer;
          font-size: 20px;
          float: right;
          padding: 0;
          line-height: 1;
        }
        .ko-adm-modal__heading {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 4px;
        }
        .ko-adm-modal__sub {
          color: var(--da-muted);
          font-size: 12px;
          font-family: var(--da-font-mono);
          margin-bottom: 18px;
        }
        .ko-adm-modal__meta {
          background: var(--da-dark);
          border-radius: 6px;
          padding: 14px 16px;
          margin-bottom: 16px;
          font-size: 13px;
          line-height: 1.6;
        }
        .ko-adm-modal__msg {
          background: var(--da-dark);
          border-radius: 6px;
          padding: 14px 16px;
          font-size: 14px;
          line-height: 1.65;
          color: var(--da-text);
          white-space: pre-wrap;
          margin-bottom: 18px;
        }
        .ko-adm-modal__notes {
          width: 100%;
          background: var(--da-dark);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 10px 12px;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
          margin-bottom: 14px;
        }
        .ko-adm-modal__actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ko-adm-btn {
          padding: 8px 14px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--da-border);
          background: transparent;
          color: var(--da-text);
          font-family: inherit;
        }
        .ko-adm-btn:hover { border-color: var(--da-muted-soft); }
        .ko-adm-btn--primary {
          background: var(--da-green);
          color: var(--da-dark);
          border-color: var(--da-green);
        }
        .ko-adm-btn--danger:hover {
          color: #ff8e8e;
          border-color: #ff6b6b;
        }
      `}</style>

      <div className="ko-adm-tabs">
        {(["all", "new", "replied", "archived"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={`ko-adm-tab${s === activeStatus ? " ko-adm-tab--active" : ""}`}
            onClick={() => setParam("status", s)}
          >
            {STATUS_LABEL[s]}
            <span className="ko-adm-tab__count">{counts[s]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="ko-adm-empty">Noch keine Anmeldungen.</div>
      ) : (
        <table className="ko-adm-table">
          <thead>
            <tr>
              <th className="ko-adm-th">Datum</th>
              <th className="ko-adm-th">Von</th>
              <th className="ko-adm-th">Anliegen</th>
              <th className="ko-adm-th">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="ko-adm-tr"
                onClick={() => setOpenId(r.id)}
              >
                <td className="ko-adm-td ko-adm-td--date">
                  {formatDateDE(r.createdAt)}
                </td>
                <td className="ko-adm-td">
                  {r.name}{" "}
                  <span style={{ color: "var(--da-muted-soft)", fontSize: 12 }}>
                    {r.email}
                  </span>
                </td>
                <td className="ko-adm-td">
                  <span style={{ color: "var(--da-muted)", fontFamily: "var(--da-font-mono)", fontSize: 11, marginRight: 8 }}>
                    {r.topic}
                  </span>
                  {truncate(r.message, 60)}
                </td>
                <td className="ko-adm-td">
                  <span
                    className="ko-adm-status"
                    style={{ color: STATUS_COLOR[r.status] }}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {openRow && (
        <div
          className="ko-adm-modal-bg"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenId(null);
          }}
        >
          <div className="ko-adm-modal">
            <button
              type="button"
              className="ko-adm-modal__close"
              onClick={() => setOpenId(null)}
              aria-label="Schliessen"
            >
              ×
            </button>
            <h2 className="ko-adm-modal__heading">{openRow.topic}</h2>
            <p className="ko-adm-modal__sub">
              {formatDateDE(openRow.createdAt)} ·{" "}
              <span style={{ color: STATUS_COLOR[openRow.status] }}>
                {openRow.status}
              </span>
            </p>

            <div className="ko-adm-modal__meta">
              <div>
                <strong style={{ color: "var(--da-muted)", fontSize: 12, fontFamily: "var(--da-font-mono)", letterSpacing: "0.08em" }}>
                  VON
                </strong>
                <br />
                {openRow.name}{" "}
                <a
                  href={`mailto:${openRow.email}?subject=${encodeURIComponent(
                    `Re: ${openRow.topic}`,
                  )}`}
                  style={{ color: "var(--da-green)", textDecoration: "underline" }}
                >
                  {openRow.email}
                </a>
              </div>
              {openRow.organization && (
                <div style={{ marginTop: 8 }}>
                  <strong style={{ color: "var(--da-muted)", fontSize: 12, fontFamily: "var(--da-font-mono)", letterSpacing: "0.08em" }}>
                    ORGANISATION
                  </strong>
                  <br />
                  {openRow.organization}
                </div>
              )}
            </div>

            <div className="ko-adm-modal__msg">{openRow.message}</div>

            <label
              style={{
                display: "block",
                color: "var(--da-muted)",
                fontSize: 12,
                fontFamily: "var(--da-font-mono)",
                marginBottom: 6,
                letterSpacing: "0.08em",
              }}
            >
              NOTIZEN
            </label>
            <textarea
              className="ko-adm-modal__notes"
              defaultValue={openRow.notes ?? ""}
              onBlur={(e) => {
                if ((openRow.notes ?? "") !== e.target.value) {
                  handleNotes(openRow.id, e.target.value);
                }
              }}
              placeholder="Interne Notizen — gespeichert beim Verlassen des Feldes."
            />

            <div className="ko-adm-modal__actions">
              <a
                href={`mailto:${openRow.email}?subject=${encodeURIComponent(
                  `Re: ${openRow.topic}`,
                )}`}
                className="ko-adm-btn ko-adm-btn--primary"
                style={{ textDecoration: "none", display: "inline-block" }}
              >
                Antworten via E-Mail
              </a>
              <button
                type="button"
                className="ko-adm-btn"
                onClick={() => handleStatus(openRow.id, "replied")}
                disabled={openRow.status === "replied"}
              >
                Als beantwortet markieren
              </button>
              <button
                type="button"
                className="ko-adm-btn ko-adm-btn--danger"
                onClick={() => handleStatus(openRow.id, "archived")}
                disabled={openRow.status === "archived"}
              >
                Archivieren
              </button>
              {openRow.status !== "new" && (
                <button
                  type="button"
                  className="ko-adm-btn"
                  onClick={() => handleStatus(openRow.id, "new")}
                >
                  Auf neu zurücksetzen
                </button>
              )}
            </div>
          </div>
        </div>
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

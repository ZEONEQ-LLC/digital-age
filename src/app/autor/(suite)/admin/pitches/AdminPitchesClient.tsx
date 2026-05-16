"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  updatePitchNotes,
  updatePitchStatus,
} from "@/lib/pitch/adminActions";

export type StatusFilter = "all" | "new" | "reviewing" | "accepted" | "rejected";

export type PitchRow = {
  id: string;
  title: string;
  excerpt: string;
  category: string | null;
  bodyMd: string;
  authorName: string;
  authorEmail: string;
  authorRole: string | null;
  authorBio: string;
  authorWebsite: string | null;
  status: "new" | "reviewing" | "accepted" | "rejected";
  createdAt: string;
  reviewedAt: string | null;
  editorNotes: string | null;
};

type Props = {
  rows: PitchRow[];
  counts: Record<StatusFilter, number>;
  activeStatus: StatusFilter;
  focusId: string | null;
};

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "Alle",
  new: "Neu",
  reviewing: "In Review",
  accepted: "Akzeptiert",
  rejected: "Abgelehnt",
};

const STATUS_COLOR: Record<PitchRow["status"], string> = {
  new: "var(--da-orange)",
  reviewing: "var(--da-purple)",
  accepted: "var(--da-green)",
  rejected: "#ff6b6b",
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

export default function AdminPitchesClient({
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

  function handleStatus(id: string, status: PitchRow["status"]) {
    startTransition(async () => {
      const result = await updatePitchStatus(id, status);
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
      const result = await updatePitchNotes(id, notes);
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
        .pi-adm-tabs { display: flex; gap: 4px; margin-bottom: 18px; flex-wrap: wrap; }
        .pi-adm-tab {
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
        .pi-adm-tab:hover { color: var(--da-text); }
        .pi-adm-tab--active { color: var(--da-text); border-color: var(--da-green); }
        .pi-adm-tab__count { color: var(--da-faint); font-size: 11px; }
        .pi-adm-tab--active .pi-adm-tab__count { color: var(--da-green); }

        .pi-adm-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 6px;
          overflow: hidden;
        }
        .pi-adm-th {
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
        .pi-adm-td {
          padding: 11px 14px;
          font-size: 13px;
          color: var(--da-text);
          border-bottom: 1px solid var(--da-border);
          vertical-align: middle;
          cursor: pointer;
        }
        .pi-adm-tr:hover .pi-adm-td { background: rgba(255,255,255,0.02); }
        .pi-adm-tr:last-child .pi-adm-td { border-bottom: none; }
        .pi-adm-td--date {
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 11px;
          white-space: nowrap;
        }
        .pi-adm-status {
          font-family: var(--da-font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 3px;
          background: var(--da-dark);
        }
        .pi-adm-empty {
          padding: 40px 20px;
          text-align: center;
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 13px;
        }

        .pi-adm-modal-bg {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 80;
          display: flex; align-items: flex-start; justify-content: center;
          padding: 60px 20px;
          overflow-y: auto;
        }
        .pi-adm-modal {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 8px;
          width: 100%;
          max-width: 760px;
          padding: 28px 28px 24px;
          font-family: var(--da-font-body);
        }
        .pi-adm-modal__close {
          background: transparent; color: var(--da-muted);
          border: none; cursor: pointer;
          font-size: 20px; float: right; padding: 0; line-height: 1;
        }
        .pi-adm-modal__heading {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 22px;
          font-weight: 700;
          margin: 0 0 4px;
        }
        .pi-adm-modal__sub {
          color: var(--da-muted);
          font-size: 12px;
          font-family: var(--da-font-mono);
          margin-bottom: 18px;
        }
        .pi-adm-modal__meta {
          background: var(--da-dark);
          border-radius: 6px;
          padding: 14px 16px;
          margin-bottom: 16px;
          font-size: 13px;
          line-height: 1.6;
        }
        .pi-adm-modal__label {
          color: var(--da-muted);
          font-size: 11px;
          font-family: var(--da-font-mono);
          letter-spacing: 0.08em;
          margin-bottom: 6px;
          margin-top: 14px;
        }
        .pi-adm-modal__block {
          background: var(--da-dark);
          border-radius: 6px;
          padding: 12px 14px;
          font-size: 13px;
          line-height: 1.65;
          color: var(--da-text);
          white-space: pre-wrap;
        }
        .pi-adm-modal__notes {
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
        .pi-adm-modal__actions {
          display: flex; gap: 8px; flex-wrap: wrap;
        }
        .pi-adm-btn {
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
        .pi-adm-btn:hover { border-color: var(--da-muted-soft); }
        .pi-adm-btn--primary { background: var(--da-green); color: var(--da-dark); border-color: var(--da-green); }
        .pi-adm-btn--danger:hover { color: #ff8e8e; border-color: #ff6b6b; }
      `}</style>

      <div className="pi-adm-tabs">
        {(["all", "new", "reviewing", "accepted", "rejected"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={`pi-adm-tab${s === activeStatus ? " pi-adm-tab--active" : ""}`}
            onClick={() => setParam("status", s)}
          >
            {STATUS_LABEL[s]}
            <span className="pi-adm-tab__count">{counts[s]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="pi-adm-empty">Noch keine Pitches.</div>
      ) : (
        <table className="pi-adm-table">
          <thead>
            <tr>
              <th className="pi-adm-th">Datum</th>
              <th className="pi-adm-th">Von</th>
              <th className="pi-adm-th">Titel</th>
              <th className="pi-adm-th">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="pi-adm-tr"
                onClick={() => setOpenId(r.id)}
              >
                <td className="pi-adm-td pi-adm-td--date">
                  {formatDateDE(r.createdAt)}
                </td>
                <td className="pi-adm-td">
                  {r.authorName}{" "}
                  <span style={{ color: "var(--da-muted-soft)", fontSize: 12 }}>
                    {r.authorEmail}
                  </span>
                </td>
                <td className="pi-adm-td">{truncate(r.title, 70)}</td>
                <td className="pi-adm-td">
                  <span
                    className="pi-adm-status"
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
          className="pi-adm-modal-bg"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenId(null);
          }}
        >
          <div className="pi-adm-modal">
            <button
              type="button"
              className="pi-adm-modal__close"
              onClick={() => setOpenId(null)}
              aria-label="Schliessen"
            >
              ×
            </button>
            <h2 className="pi-adm-modal__heading">{openRow.title}</h2>
            <p className="pi-adm-modal__sub">
              {formatDateDE(openRow.createdAt)} ·{" "}
              <span style={{ color: STATUS_COLOR[openRow.status] }}>
                {openRow.status}
              </span>
              {openRow.category && (
                <>
                  {" · "}
                  <span>{openRow.category}</span>
                </>
              )}
            </p>

            <div className="pi-adm-modal__meta">
              <div>
                <strong style={{ color: "var(--da-muted)", fontSize: 12, fontFamily: "var(--da-font-mono)", letterSpacing: "0.08em" }}>
                  AUTHOR
                </strong>
                <br />
                {openRow.authorName}{" "}
                <a
                  href={`mailto:${openRow.authorEmail}?subject=${encodeURIComponent(
                    `Dein Pitch: ${openRow.title}`,
                  )}`}
                  style={{ color: "var(--da-green)", textDecoration: "underline" }}
                >
                  {openRow.authorEmail}
                </a>
                {openRow.authorRole && (
                  <>
                    <br />
                    <span style={{ color: "var(--da-muted-soft)", fontSize: 12 }}>
                      {openRow.authorRole}
                    </span>
                  </>
                )}
                {openRow.authorWebsite && (
                  <>
                    <br />
                    <a
                      href={openRow.authorWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--da-green)",
                        textDecoration: "underline",
                        fontSize: 12,
                        fontFamily: "var(--da-font-mono)",
                        wordBreak: "break-all",
                      }}
                    >
                      {openRow.authorWebsite}
                    </a>
                  </>
                )}
              </div>
            </div>

            <p className="pi-adm-modal__label">BIO</p>
            <div className="pi-adm-modal__block">{openRow.authorBio}</div>

            <p className="pi-adm-modal__label">ABSTRACT</p>
            <div className="pi-adm-modal__block">{openRow.excerpt}</div>

            <p className="pi-adm-modal__label">VOLLTEXT (MARKDOWN)</p>
            <div
              className="pi-adm-modal__block"
              style={{
                fontFamily: "var(--da-font-mono)",
                fontSize: 12,
                maxHeight: 360,
                overflowY: "auto",
              }}
            >
              {openRow.bodyMd}
            </div>

            <p className="pi-adm-modal__label">NOTIZEN</p>
            <textarea
              className="pi-adm-modal__notes"
              defaultValue={openRow.editorNotes ?? ""}
              onBlur={(e) => {
                if ((openRow.editorNotes ?? "") !== e.target.value) {
                  handleNotes(openRow.id, e.target.value);
                }
              }}
              placeholder="Editor-Notizen (max. 2000 Zeichen). Wird beim Verlassen des Feldes gespeichert."
            />

            <div className="pi-adm-modal__actions">
              <button
                type="button"
                className="pi-adm-btn"
                onClick={() => handleStatus(openRow.id, "reviewing")}
                disabled={openRow.status === "reviewing"}
              >
                In Review setzen
              </button>
              <button
                type="button"
                className="pi-adm-btn pi-adm-btn--primary"
                onClick={() => handleStatus(openRow.id, "accepted")}
                disabled={openRow.status === "accepted"}
              >
                Akzeptieren
              </button>
              <button
                type="button"
                className="pi-adm-btn pi-adm-btn--danger"
                onClick={() => handleStatus(openRow.id, "rejected")}
                disabled={openRow.status === "rejected"}
              >
                Ablehnen
              </button>
              {openRow.status !== "new" && (
                <button
                  type="button"
                  className="pi-adm-btn"
                  onClick={() => handleStatus(openRow.id, "new")}
                >
                  Auf neu zurücksetzen
                </button>
              )}
              <a
                href={`mailto:${openRow.authorEmail}?subject=${encodeURIComponent(
                  `Dein Pitch: ${openRow.title}`,
                )}`}
                className="pi-adm-btn"
                style={{ textDecoration: "none", display: "inline-block" }}
              >
                Antworten via E-Mail
              </a>
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

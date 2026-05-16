"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PromptWithAuthor, PromptStatus } from "@/lib/promptApi";
import {
  approvePrompt,
  rejectPrompt,
  toggleFeatured,
  archivePromptAsEditor,
  restoreToPending,
  deletePrompt,
} from "@/lib/promptActions";
import { PROMPT_CATEGORIES, PROMPT_TESTED_WITH } from "@/lib/mappers/promptMappers";

type Props = { initialPrompts: PromptWithAuthor[] };

type TabKey = "pending" | "published" | "featured" | "rejected" | "archived";

const tabOrder: TabKey[] = ["pending", "published", "featured", "rejected", "archived"];
const tabLabels: Record<TabKey, string> = {
  pending:   "Pending",
  published: "Published",
  featured:  "Featured",
  rejected:  "Rejected",
  archived:  "Archived",
};

const statusStyles: Record<PromptStatus, { bg: string; color: string }> = {
  pending:   { bg: "rgba(255,140,66,0.12)", color: "var(--da-orange)"      },
  published: { bg: "rgba(50,255,126,0.10)", color: "var(--da-green)"       },
  featured:  { bg: "rgba(255,140,66,0.18)", color: "var(--da-orange)"      },
  rejected:  { bg: "rgba(255,85,85,0.10)",  color: "#ff8080"               },
  archived:  { bg: "rgba(85,85,85,0.18)",   color: "var(--da-muted-soft)"  },
};

export default function AdminPromptsClient({ initialPrompts }: Props) {
  const router = useRouter();
  const prompts = initialPrompts;
  const [tab, setTab] = useState<TabKey>("pending");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [preview, setPreview] = useState<PromptWithAuthor | null>(null);
  const [rejectFor, setRejectFor] = useState<PromptWithAuthor | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { pending: 0, published: 0, featured: 0, rejected: 0, archived: 0 };
    for (const p of prompts) c[p.status as TabKey]++;
    return c;
  }, [prompts]);

  const filtered = useMemo(() => prompts.filter((p) => p.status === tab), [prompts, tab]);

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

  function openReject(p: PromptWithAuthor) {
    setRejectFor(p);
    setRejectReason("");
  }

  function submitReject() {
    if (!rejectFor) return;
    const id = rejectFor.id;
    // Reason ist jetzt optional — leerer Wert wird auf null normalisiert
    // und der Submitter bekommt einen generischen Text in der Mail.
    const reason = rejectReason.trim();
    setRejectFor(null);
    wrap(id, async () => { await rejectPrompt(id, reason || null); });
  }

  return (
    <>
      <style>{`
        .ap-tabs {
          display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px;
        }
        .ap-chip {
          background: transparent; color: var(--da-muted-soft);
          border: 1px solid var(--da-border);
          padding: 6px 12px; border-radius: 999px;
          font-size: 12px; cursor: pointer; font-family: inherit;
        }
        .ap-chip:hover { color: var(--da-text); border-color: var(--da-muted); }
        .ap-chip--active {
          background: var(--da-green); color: var(--da-dark);
          border-color: var(--da-green); font-weight: 600;
        }
        .ap-error {
          background: rgba(255,85,85,0.08); color: #ff8080;
          border: 1px solid rgba(255,85,85,0.3);
          padding: 10px 12px; border-radius: 4px;
          font-size: 12px; margin-bottom: 16px;
        }
        .ap-table {
          background: var(--da-darker); border: 1px solid var(--da-border);
          border-radius: 8px; overflow: hidden;
        }
        .ap-row {
          display: grid;
          grid-template-columns: minmax(0,1.6fr) minmax(0,1fr) 100px 80px 90px 70px minmax(0,260px);
          gap: 12px; padding: 12px 14px;
          border-bottom: 1px solid var(--da-border);
          font-size: 12px; color: var(--da-text); align-items: center;
        }
        .ap-row:last-child { border-bottom: none; }
        .ap-row--head {
          background: var(--da-dark); color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
          font-weight: 700;
        }
        .ap-title { color: var(--da-text); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ap-author { color: var(--da-muted); }
        .ap-empty {
          padding: 36px; text-align: center; color: var(--da-muted-soft); font-size: 13px;
        }
        .ap-badge {
          display: inline-block; padding: 3px 8px; border-radius: 999px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
          font-family: var(--da-font-mono); text-transform: uppercase;
        }
        .ap-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .ap-btn {
          background: transparent; color: var(--da-text);
          border: 1px solid var(--da-border);
          padding: 5px 10px; border-radius: 4px;
          font-size: 11px; cursor: pointer; font-family: inherit;
        }
        .ap-btn:hover { border-color: var(--da-muted); }
        .ap-btn--ok { color: var(--da-green); border-color: rgba(50,255,126,0.4); }
        .ap-btn--ok:hover { background: rgba(50,255,126,0.08); }
        .ap-btn--feat { color: var(--da-orange); border-color: rgba(255,140,66,0.4); }
        .ap-btn--feat:hover { background: rgba(255,140,66,0.08); }
        .ap-btn--danger { color: #ff8080; border-color: rgba(255,85,85,0.4); }
        .ap-btn--danger:hover { background: rgba(255,85,85,0.08); }

        .ap-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          z-index: 100; display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .ap-modal {
          background: var(--da-darker); border: 1px solid var(--da-border);
          border-radius: 8px; max-width: 560px; width: 100%;
          padding: 28px; max-height: 80vh; overflow-y: auto;
        }
        .ap-modal h3 { color: var(--da-text); font-family: var(--da-font-display); font-size: 18px; margin-bottom: 8px; }
        .ap-modal .meta { color: var(--da-muted); font-size: 12px; margin-bottom: 18px; font-family: var(--da-font-mono); }
        .ap-modal__block { margin-bottom: 16px; }
        .ap-modal__label { color: var(--da-faint); font-family: var(--da-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px; }
        .ap-modal__body { color: var(--da-text); font-family: var(--da-font-mono); font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; background: var(--da-dark); border: 1px solid var(--da-border); border-radius: 4px; padding: 12px; }
        .ap-modal__actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 22px; }
        .ap-textarea {
          width: 100%; background: var(--da-dark); color: var(--da-text);
          border: 1px solid var(--da-border); border-radius: 4px;
          padding: 10px 12px; font-size: 13px; font-family: inherit;
          box-sizing: border-box; resize: vertical;
        }
        @media (max-width: 1100px) {
          .ap-row { grid-template-columns: minmax(0,1.4fr) 90px 70px minmax(0,260px); }
          .ap-col-author, .ap-col-cat, .ap-col-uses { display: none; }
        }
      `}</style>

      {error && <div className="ap-error">{error}</div>}

      <div className="ap-tabs">
        {tabOrder.map((k) => (
          <button
            key={k}
            className={`ap-chip${tab === k ? " ap-chip--active" : ""}`}
            onClick={() => setTab(k)}
          >
            {tabLabels[k]} ({counts[k]})
          </button>
        ))}
      </div>

      <div className="ap-table">
        <div className="ap-row ap-row--head">
          <span>Titel</span>
          <span className="ap-col-author">Author / Submitter</span>
          <span className="ap-col-cat">Kategorie</span>
          <span>Tool</span>
          <span>Status</span>
          <span className="ap-col-uses">Uses</span>
          <span>Aktionen</span>
        </div>
        {filtered.length === 0 ? (
          <div className="ap-empty">Keine Prompts in „{tabLabels[tab]}“.</div>
        ) : (
          filtered.map((p) => {
            const ss = statusStyles[p.status];
            const cat = PROMPT_CATEGORIES.find((c) => c.code === p.category)?.label ?? p.category;
            const tool = PROMPT_TESTED_WITH.find((c) => c.code === p.tested_with)?.label ?? p.tested_with;
            const authorLabel = p.author ? p.author.display_name : (p.submitter_name ?? "Anonym");
            const isExternal = !p.author;
            const busy = busyId === p.id;
            return (
              <div className="ap-row" key={p.id}>
                <div className="ap-title">{p.title}</div>
                <div className="ap-author ap-col-author">
                  {authorLabel}
                  {isExternal && <span style={{ marginLeft: 6, color: "var(--da-faint)", fontSize: 10 }}>(extern)</span>}
                </div>
                <div className="ap-col-cat" style={{ color: "var(--da-muted)" }}>{cat}</div>
                <div style={{ color: "var(--da-muted)" }}>{tool}</div>
                <span className="ap-badge" style={{ background: ss.bg, color: ss.color }}>{tabLabels[p.status as TabKey]}</span>
                <span className="ap-col-uses" style={{ color: "var(--da-muted)", fontFamily: "var(--da-font-mono)" }}>{p.uses_count}</span>
                <div className="ap-actions">
                  <button className="ap-btn" onClick={() => setPreview(p)}>Vorschau</button>
                  {p.status === "pending" && (
                    <>
                      <button className="ap-btn ap-btn--ok" disabled={busy} onClick={() => wrap(p.id, async () => { await approvePrompt(p.id); })}>Approve</button>
                      <button className="ap-btn ap-btn--feat" disabled={busy} onClick={() => wrap(p.id, async () => { await approvePrompt(p.id, { feature: true }); })}>Approve + Feature</button>
                      <button className="ap-btn ap-btn--danger" disabled={busy} onClick={() => openReject(p)}>Reject</button>
                    </>
                  )}
                  {(p.status === "published" || p.status === "featured") && (
                    <>
                      <button className="ap-btn ap-btn--feat" disabled={busy} onClick={() => wrap(p.id, async () => { await toggleFeatured(p.id); })}>
                        {p.status === "featured" ? "Unfeature" : "Feature"}
                      </button>
                      <button className="ap-btn" disabled={busy} onClick={() => wrap(p.id, async () => { await archivePromptAsEditor(p.id); })}>Archive</button>
                    </>
                  )}
                  {(p.status === "rejected" || p.status === "archived") && (
                    <>
                      {p.status === "rejected" && (
                        <button className="ap-btn" disabled={busy} onClick={() => wrap(p.id, async () => { await restoreToPending(p.id); })}>Re-Open</button>
                      )}
                      <button className="ap-btn ap-btn--danger" disabled={busy} onClick={() => {
                        if (!confirm(`Prompt „${p.title}" endgültig löschen?`)) return;
                        wrap(p.id, async () => { await deletePrompt(p.id); });
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
        <div className="ap-overlay" onClick={() => setPreview(null)}>
          <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{preview.title}</h3>
            <p className="meta">
              {preview.author ? preview.author.display_name : (preview.submitter_name ?? "Anonym")}
              {!preview.author && preview.submitter_email && <> · {preview.submitter_email}</>}
              {preview.submitter_url && <> · <a href={preview.submitter_url} target="_blank" rel="noreferrer" style={{ color: "var(--da-green)" }}>{preview.submitter_url}</a></>}
            </p>

            <div className="ap-modal__block">
              <p className="ap-modal__label">Kontext</p>
              <div className="ap-modal__body">{preview.context}</div>
            </div>
            <div className="ap-modal__block">
              <p className="ap-modal__label">Prompt-Text</p>
              <div className="ap-modal__body">{preview.prompt_text}</div>
            </div>
            {preview.example_output && (
              <div className="ap-modal__block">
                <p className="ap-modal__label">Beispiel-Output</p>
                <div className="ap-modal__body">{preview.example_output}</div>
              </div>
            )}
            {preview.rejection_reason && (
              <div className="ap-modal__block">
                <p className="ap-modal__label">Rejection-Grund</p>
                <div className="ap-modal__body" style={{ color: "#ff8080" }}>{preview.rejection_reason}</div>
              </div>
            )}
            <div className="ap-modal__actions">
              <button className="ap-btn" onClick={() => setPreview(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {rejectFor && (
        <div className="ap-overlay" onClick={() => setRejectFor(null)}>
          <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Prompt ablehnen</h3>
            <p className="meta">{rejectFor.title}</p>
            <div className="ap-modal__block">
              <p className="ap-modal__label">
                Grund — wird dem Submitter in der Mail mitgeteilt (optional)
              </p>
              <textarea
                className="ap-textarea"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Optionaler Grund für den Submitter — leer lassen für Standard-Text."
                maxLength={500}
              />
            </div>
            <div className="ap-modal__actions">
              <button className="ap-btn" onClick={() => setRejectFor(null)}>Abbrechen</button>
              <button
                className="ap-btn ap-btn--danger"
                onClick={submitReject}
                disabled={busyId !== null}
              >
                Ablehnen &amp; benachrichtigen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

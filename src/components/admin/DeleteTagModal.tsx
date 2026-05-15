"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteTag } from "@/lib/admin/tagOperations";

type Props = {
  tag: { id: string; name: string; articleCount: number };
  onClose: () => void;
  onDone: (info: { affectedCount: number }) => void;
};

export default function DeleteTagModal({ tag, onClose, onDone }: Props) {
  const [confirmInput, setConfirmInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const matches = confirmInput === tag.name;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  function submit() {
    if (!matches) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteTag(tag.id);
        onDone({ affectedCount: result.affectedCount });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <>
      <style>{`
        .tagmod-backdrop {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .tagmod-card {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 8px;
          padding: 28px;
          max-width: 520px;
          width: 100%;
          font-family: var(--da-font-body);
        }
        .tagmod-title {
          color: var(--da-text);
          font-size: 18px;
          font-weight: 700;
          font-family: var(--da-font-display);
          margin-bottom: 14px;
        }
        .tagmod-body {
          color: var(--da-muted);
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 18px;
        }
        .tagmod-warn-strong {
          background: rgba(255,107,107,0.10);
          border: 1px solid #ff6b6b;
          border-radius: 4px;
          padding: 12px 14px;
          color: var(--da-text);
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 18px;
        }
        .tagmod-label {
          display: block;
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .tagmod-label code {
          font-family: var(--da-font-mono);
          background: var(--da-dark);
          padding: 1px 5px;
          border-radius: 2px;
          color: var(--da-text);
          font-size: 12px;
          font-weight: 600;
          text-transform: none;
          letter-spacing: 0;
        }
        .tagmod-input {
          width: 100%;
          background: var(--da-dark);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: var(--da-font-mono);
          margin-bottom: 18px;
        }
        .tagmod-input:focus { outline: none; border-color: #ff6b6b; }
        .tagmod-error {
          background: rgba(255,107,107,0.10);
          border: 1px solid #ff6b6b;
          border-radius: 4px;
          padding: 10px 14px;
          color: #ff8e8e;
          font-size: 13px;
          margin-bottom: 18px;
        }
        .tagmod-actions {
          display: flex; gap: 10px; justify-content: flex-end;
        }
        .tagmod-btn {
          padding: 9px 18px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          border: none;
        }
        .tagmod-btn--ghost {
          background: transparent;
          color: var(--da-muted-soft);
          border: 1px solid var(--da-border);
        }
        .tagmod-btn--ghost:hover { color: var(--da-text); }
        .tagmod-btn--danger {
          background: #ff6b6b;
          color: var(--da-dark);
        }
        .tagmod-btn--danger:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
      <div
        className="tagmod-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget && !pending) onClose();
        }}
      >
        <div className="tagmod-card" role="dialog" aria-modal="true">
          <h2 className="tagmod-title">Tag löschen</h2>
          <div className="tagmod-warn-strong">
            <strong>{tag.articleCount}</strong> Artikel verlieren diesen Tag.
            Die Operation ist nicht rückgängig zu machen (Audit-Log bleibt
            erhalten, aber kein automatisches Restore).
          </div>

          <p className="tagmod-body">
            Zur Bestätigung tippe den Tag-Namen exakt ein:
          </p>

          <label className="tagmod-label" htmlFor="delete-confirm">
            <code>{tag.name}</code>
          </label>
          <input
            id="delete-confirm"
            type="text"
            className="tagmod-input"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={tag.name}
            autoFocus
            disabled={pending}
            autoComplete="off"
          />

          {error && <div className="tagmod-error">{error}</div>}

          <div className="tagmod-actions">
            <button
              type="button"
              className="tagmod-btn tagmod-btn--ghost"
              onClick={onClose}
              disabled={pending}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="tagmod-btn tagmod-btn--danger"
              onClick={submit}
              disabled={pending || !matches}
            >
              {pending ? "Lösche…" : "Endgültig löschen"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

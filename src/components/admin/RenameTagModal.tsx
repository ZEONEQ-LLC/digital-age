"use client";

import { useEffect, useState, useTransition } from "react";
import { renameTag } from "@/lib/admin/tagOperations";
import { slugifyTag } from "@/lib/tagSlug";

type Props = {
  tag: { id: string; name: string; slug: string };
  onClose: () => void;
  onDone: () => void;
};

export default function RenameTagModal({ tag, onClose, onDone }: Props) {
  const [newName, setNewName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmed = newName.trim();
  const newSlug = slugifyTag(trimmed);
  const slugChanges = newSlug !== tag.slug && newSlug.length > 0;
  const nameChanged = trimmed !== tag.name && trimmed.length > 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  function submit() {
    if (!nameChanged) {
      setError("Name unverändert.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await renameTag(tag.id, trimmed);
        onDone();
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
          margin-bottom: 6px;
        }
        .tagmod-sub {
          color: var(--da-muted);
          font-size: 13px;
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
        .tagmod-input {
          width: 100%;
          background: var(--da-dark);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: inherit;
          margin-bottom: 14px;
        }
        .tagmod-input:focus { outline: none; border-color: var(--da-green); }
        .tagmod-slug-preview {
          font-family: var(--da-font-mono);
          font-size: 12px;
          color: var(--da-muted-soft);
          background: var(--da-dark);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 8px 12px;
          margin-bottom: 16px;
        }
        .tagmod-warn {
          background: rgba(255,140,66,0.10);
          border: 1px solid var(--da-orange);
          border-radius: 4px;
          padding: 12px 14px;
          color: var(--da-text);
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 18px;
        }
        .tagmod-warn code {
          background: var(--da-dark);
          padding: 1px 5px;
          border-radius: 2px;
          font-family: var(--da-font-mono);
          font-size: 12px;
        }
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
        .tagmod-btn--primary {
          background: var(--da-green);
          color: var(--da-dark);
        }
        .tagmod-btn--primary:disabled {
          opacity: 0.5;
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
          <h2 className="tagmod-title">Tag umbenennen</h2>
          <p className="tagmod-sub">
            Aktueller Name: <strong>{tag.name}</strong>
          </p>

          <label className="tagmod-label" htmlFor="rename-input">
            Neuer Name
          </label>
          <input
            id="rename-input"
            className="tagmod-input"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            disabled={pending}
          />

          <span className="tagmod-label">Neuer Slug (automatisch)</span>
          <div className="tagmod-slug-preview">
            {newSlug || <span style={{ color: "#ff8e8e" }}>—</span>}
          </div>

          {slugChanges && (
            <div className="tagmod-warn">
              Die URL ändert sich von <code>/tag/{tag.slug}</code> zu{" "}
              <code>/tag/{newSlug}</code>. Bestehende Links auf den alten Slug
              werden 404 zurückgeben.
            </div>
          )}

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
              className="tagmod-btn tagmod-btn--primary"
              onClick={submit}
              disabled={pending || !nameChanged || newSlug.length === 0}
            >
              {pending ? "Speichere…" : "Umbenennen"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

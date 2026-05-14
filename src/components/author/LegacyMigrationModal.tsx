"use client";

type Props = {
  onCancel: () => void;
  onConfirm: () => void;
};

// Modal beim ersten Markdown → Visual-Wechsel auf einem Legacy-Artikel
// (body_blocks IS NULL, body_md nicht leer). Erklärt User, dass Visual ab
// jetzt massgeblich wird und Markdown nur noch lesend nutzbar bleibt.
//
// Schweizer Rechtschreibung: massgeblich (statt maßgeblich).
export default function LegacyMigrationModal({ onCancel, onConfirm }: Props) {
  return (
    <>
      <style>{`
        .lmm-backdrop {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .lmm-card {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 8px;
          padding: 28px;
          max-width: 480px;
          width: 100%;
          font-family: var(--da-font-body);
        }
        .lmm-title {
          color: var(--da-text);
          font-size: 18px;
          font-weight: 700;
          font-family: var(--da-font-display);
          margin-bottom: 14px;
        }
        .lmm-body {
          color: var(--da-muted);
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 22px;
        }
        .lmm-body p { margin-bottom: 12px; }
        .lmm-body p:last-child { margin-bottom: 0; }
        .lmm-actions {
          display: flex; gap: 10px; justify-content: flex-end;
        }
        .lmm-btn {
          padding: 9px 18px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
        }
        .lmm-btn--ghost {
          background: transparent;
          color: var(--da-muted-soft);
          border: 1px solid var(--da-border);
        }
        .lmm-btn--ghost:hover { color: var(--da-text); }
        .lmm-btn--primary {
          background: var(--da-green);
          color: var(--da-dark);
          border: none;
        }
      `}</style>
      <div
        className="lmm-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lmm-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onCancel();
        }}
      >
        <div className="lmm-card">
          <h2 id="lmm-title" className="lmm-title">Wechsel in Visual-Modus</h2>
          <div className="lmm-body">
            <p>
              Der Markdown-Inhalt wird in strukturierte Blocks konvertiert.
              Ab jetzt ist der Visual-Editor massgeblich für diesen Artikel.
            </p>
            <p>
              Du kannst weiterhin in den Markdown-Modus wechseln, aber dort
              nur lesen. Änderungen müssen im Visual-Editor erfolgen.
            </p>
          </div>
          <div className="lmm-actions">
            <button type="button" className="lmm-btn lmm-btn--ghost" onClick={onCancel}>
              Abbrechen
            </button>
            <button type="button" className="lmm-btn lmm-btn--primary" onClick={onConfirm}>
              Verstanden, weiter
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

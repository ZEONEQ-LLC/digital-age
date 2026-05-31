"use client";

import { useEffect, useRef, useState } from "react";

// Modal mit Textarea-Input für den MD-Cleanup. Direktes Paste in den
// Tiptap-Body geht verloren (HTML-Pfad in ProseMirror kollabiert
// Linebreaks zu Whitespace), deshalb leiten wir die Eingabe durch eine
// Plain-`<textarea>` — die bewahrt `\n` bytegenau, weil kein DOMParser
// dazwischen liegt. Pipeline danach unverändert.
type Props = {
  open: boolean;
  bodyHasContent: boolean;
  onClose: () => void;
  onApply: (markdown: string) => void;
};

export default function MdCleanupModal({
  open,
  bodyHasContent,
  onClose,
  onApply,
}: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset + Autofocus bei Open. Klassisches "synchronise external state
  // in effect"-Pattern (siehe SourcePicker.tsx für dieselbe Begründung).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setValue("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) return null;

  function handleApply() {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (bodyHasContent) {
      const ok = window.confirm(
        "Der bestehende Body-Inhalt wird ersetzt. Fortfahren? (Undo mit Strg+Z möglich.)",
      );
      if (!ok) return;
    }
    onApply(value);
  }

  return (
    <>
      <style>{`
        .mdc-backdrop {
          position: fixed; inset: 0; z-index: 110;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 80px 24px 24px;
        }
        .mdc-card {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 8px;
          width: 100%;
          max-width: 720px;
          font-family: var(--da-font-body);
          display: flex; flex-direction: column;
          max-height: 80vh;
          overflow: hidden;
        }
        .mdc-header {
          padding: 16px 18px;
          border-bottom: 1px solid var(--da-border);
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
        }
        .mdc-title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }
        .mdc-body { padding: 14px 18px 16px; overflow-y: auto; }
        .mdc-hint {
          color: var(--da-muted-soft);
          font-size: 12px;
          line-height: 1.5;
          margin: 0 0 10px;
        }
        .mdc-textarea {
          width: 100%;
          min-height: 320px;
          background: var(--da-darker);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 12px 14px;
          font-family: var(--da-font-mono);
          font-size: 13px;
          line-height: 1.55;
          resize: vertical;
          outline: none;
        }
        .mdc-footer {
          display: flex; justify-content: flex-end; gap: 8px;
          padding: 12px 18px;
          border-top: 1px solid var(--da-border);
        }
        .mdc-btn {
          background: transparent;
          color: var(--da-muted-soft);
          border: 1px solid var(--da-border);
          padding: 9px 16px;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
        }
        .mdc-btn--primary {
          background: var(--da-green);
          color: var(--da-dark);
          border-color: var(--da-green);
          font-weight: 700;
        }
        .mdc-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
      <div
        className="mdc-backdrop"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="mdc-card" role="dialog" aria-modal="true" aria-labelledby="mdc-title">
          <div className="mdc-header">
            <h2 id="mdc-title" className="mdc-title">Markdown bereinigen</h2>
            <button type="button" className="mdc-btn" onClick={onClose}>
              Schliessen
            </button>
          </div>
          <div className="mdc-body">
            <p className="mdc-hint">
              Markdown-Text hier einfügen — Header, Quellen-Sektion und
              Referenzen werden automatisch umgewandelt.
            </p>
            <textarea
              ref={textareaRef}
              className="mdc-textarea"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="## Titel&#10;&#10;Absatz mit **bold**, *kursiv* und Quellen-Ref [1].&#10;&#10;Sources&#10;[1] Titel der Quelle https://example.com"
              spellCheck={false}
            />
          </div>
          <div className="mdc-footer">
            <button type="button" className="mdc-btn" onClick={onClose}>
              Abbrechen
            </button>
            <button
              type="button"
              className="mdc-btn mdc-btn--primary"
              onClick={handleApply}
              disabled={!value.trim()}
            >
              Bereinigen &amp; einfügen
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

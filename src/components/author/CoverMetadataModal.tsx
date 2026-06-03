"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Modal für die drei Hero-Cover-Metadaten-Felder (ALT, Caption, Bildquelle).
// Aus Platzgründen ausgelagert in ein Modal statt inline in der Sidebar.
//
// Pflicht-Charakter von ALT wird visuell signalisiert (Label, Hinweis-Text),
// aber in dieser PR NICHT technisch erzwungen — alle drei Felder sind
// nullable in der DB und das Modal lässt einen leeren Save zu. Der Pre-
// Publish-Gate kommt in einem späteren PR.

type Props = {
  open: boolean;
  initialAlt: string;
  initialCaption: string;
  initialSource: string;
  onSave: (next: { alt: string; caption: string; source: string }) => void;
  onClose: () => void;
};

const ALT_SOFT_LIMIT = 125;

export default function CoverMetadataModal({
  open,
  initialAlt,
  initialCaption,
  initialSource,
  onSave,
  onClose,
}: Props) {
  const [alt, setAlt] = useState(initialAlt);
  const [caption, setCaption] = useState(initialCaption);
  const [source, setSource] = useState(initialSource);

  // Initial-Sync beim Oeffnen: drei Felder von den aktuellen Article-
  // Werten neu seeden, damit ein vorheriges Abbrechen einer Edit-Session
  // beim naechsten Open nicht den verworfenen Stand zeigt.
  // setState-in-effect ist hier der bewusste Pattern fuer Modal-Reset;
  // eine `key`-Prop-Variante am Caller wuerde das Modal zerstoeren und
  // den Inline-Animations-Pfad brechen.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAlt(initialAlt);
      setCaption(initialCaption);
      setSource(initialSource);
    }
  }, [open, initialAlt, initialCaption, initialSource]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  // SSR-Guard: createPortal an document.body funktioniert nur im Client.
  // EditorSeoPanel rendert das Modal eh nur, wenn der User die Bild-
  // Details-Button klickt — bis dahin ist `open=false` und wir kehren oben
  // schon zurueck.
  if (typeof document === "undefined") return null;

  const altLength = alt.length;
  const altOverLimit = altLength > ALT_SOFT_LIMIT;

  function handleSave() {
    onSave({
      alt: alt.trim(),
      caption: caption.trim(),
      source: source.trim(),
    });
  }

  return createPortal(
    <>
      <style>{`
        .cmm-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0, 0, 0, 0.6);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 80px 24px 24px;
        }
        .cmm-card {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 8px;
          width: 100%;
          max-width: 560px;
          font-family: var(--da-font-body);
          display: flex; flex-direction: column;
          max-height: calc(100vh - 120px);
          overflow: hidden;
        }
        .cmm-header {
          padding: 18px 22px;
          border-bottom: 1px solid var(--da-border);
        }
        .cmm-title {
          color: var(--da-faint); font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .cmm-headline {
          color: var(--da-text-strong);
          font-size: 18px; font-weight: 600;
          margin-top: 4px;
        }
        .cmm-body {
          padding: 18px 22px;
          overflow-y: auto;
          display: flex; flex-direction: column; gap: 18px;
        }
        .cmm-field { display: flex; flex-direction: column; gap: 6px; }
        .cmm-label-row {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 8px;
        }
        .cmm-label {
          color: var(--da-text-strong);
          font-size: 13px; font-weight: 600;
        }
        .cmm-pflicht {
          color: var(--da-orange);
          font-size: 11px;
          font-family: var(--da-font-mono);
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .cmm-optional {
          color: var(--da-muted-soft);
          font-size: 11px;
          font-family: var(--da-font-mono);
          letter-spacing: 0.06em;
        }
        .cmm-counter {
          color: var(--da-muted);
          font-size: 11px;
          font-family: var(--da-font-mono);
        }
        .cmm-counter--warn { color: var(--da-orange); }
        .cmm-input, .cmm-textarea {
          background: var(--da-dark);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 9px 12px;
          font-size: 13px;
          font-family: inherit;
          width: 100%;
          box-sizing: border-box;
          resize: vertical;
        }
        .cmm-input:focus, .cmm-textarea:focus { outline: 1px solid var(--da-green); }
        .cmm-hint {
          color: var(--da-muted-soft);
          font-size: 11px;
          line-height: 1.5;
        }
        .cmm-footer {
          padding: 14px 22px;
          border-top: 1px solid var(--da-border);
          display: flex; gap: 10px; justify-content: flex-end;
          background: var(--da-card);
        }
        .cmm-btn {
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 13px; font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          border: none;
        }
        .cmm-btn--save { background: var(--da-green); color: var(--da-dark); }
        .cmm-btn--cancel {
          background: transparent; color: var(--da-muted-soft);
          border: 1px solid var(--da-border);
        }
      `}</style>
      <div
        className="cmm-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="cmm-card" role="dialog" aria-modal="true" aria-label="Bild-Details bearbeiten">
          <div className="cmm-header">
            <div className="cmm-title">Hero-Cover</div>
            <div className="cmm-headline">Bild-Details</div>
          </div>
          <div className="cmm-body">
            <div className="cmm-field">
              <div className="cmm-label-row">
                <label className="cmm-label" htmlFor="cmm-alt">Alt-Text</label>
                <span className="cmm-pflicht">Pflicht beim Publish</span>
              </div>
              <textarea
                id="cmm-alt"
                className="cmm-textarea"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                rows={2}
                placeholder="Was zeigt das Bild? Kurz, beschreibend."
                aria-describedby="cmm-alt-hint"
              />
              <div className="cmm-label-row">
                <p id="cmm-alt-hint" className="cmm-hint">
                  Beschreibt das Bild fuer Screenreader und Bild-SEO. Kein
                  Titel-Duplikat — sag, was zu sehen ist.
                </p>
                <span className={`cmm-counter${altOverLimit ? " cmm-counter--warn" : ""}`}>
                  {altLength} / {ALT_SOFT_LIMIT}
                </span>
              </div>
            </div>

            <div className="cmm-field">
              <div className="cmm-label-row">
                <label className="cmm-label" htmlFor="cmm-caption">Bildunterschrift</label>
                <span className="cmm-optional">Optional</span>
              </div>
              <textarea
                id="cmm-caption"
                className="cmm-textarea"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={2}
                placeholder="Sichtbar unter dem Bild auf der Artikelseite."
              />
            </div>

            <div className="cmm-field">
              <div className="cmm-label-row">
                <label className="cmm-label" htmlFor="cmm-source">Bildquelle</label>
                <span className="cmm-optional">Optional</span>
              </div>
              <input
                id="cmm-source"
                type="text"
                className="cmm-input"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder='z.B. "© Fotograf / Agentur"'
              />
            </div>
          </div>
          <div className="cmm-footer">
            <button
              type="button"
              className="cmm-btn cmm-btn--cancel"
              onClick={onClose}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="cmm-btn cmm-btn--save"
              onClick={handleSave}
            >
              Uebernehmen
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

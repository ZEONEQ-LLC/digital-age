"use client";

import { useEffect, useRef, useState } from "react";
import type { Source } from "@/types/blocks";

type Props = {
  open: boolean;
  onClose: () => void;
  sources: Source[];
  onPickExisting: (sourceNumber: number) => void;
  onCreateNew: (source: { text: string; url?: string }) => void;
  // Etappe B (Variante 2): existierende Quelle bearbeiten — Text/URL
  // ändern ohne dass sich die Position N verschiebt. Index ist 0-basiert.
  // Optional, damit alte Aufrufer (z.B. Pages-Editor) ohne Anpassung
  // weiterlaufen.
  onUpdateExisting?: (index: number, source: { text: string; url?: string }) => void;
  // Optional: Array-Index → Renderer-Anzeige-Nummer (Single Source of Truth,
  // computeSourceDisplayItems). Wenn gesetzt, zeigt der Picker die
  // Renderer-Nummer und sortiert die Liste in Renderer-Reihenfolge
  // (referenziert zuerst). Das uebergebene N bei onPickExisting bleibt die
  // ARRAY-Position (Storage-Semantik). Alte Aufrufer ohne Map → Array-Folge.
  displayByIndex?: Map<number, number>;
};

const newSourceId = () =>
  `src-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Source-Picker: zeigt existierende Quellen + ermöglicht neue anzulegen.
// Markers im Block-Content sind 1-indexed `[^N]` und referenzieren
// sources[N-1]. Bei Neu-Anlage wird die Quelle ans Ende der sources-Liste
// angehängt — bekommt damit die nächste freie Nummer.
export default function SourcePicker({
  open,
  onClose,
  sources,
  onPickExisting,
  onCreateNew,
  onUpdateExisting,
  displayByIndex,
}: Props) {
  // Anzeige-Nummer einer Array-Position (Fallback: Position + 1).
  const displayOf = (i: number) => displayByIndex?.get(i) ?? i + 1;
  // Render-Reihenfolge: nach Renderer-Anzeige-Nummer sortiert, falls Map da.
  const order =
    displayByIndex
      ? sources.map((_, i) => i).sort((a, b) => displayOf(a) - displayOf(b))
      : sources.map((_, i) => i);
  const [mode, setMode] = useState<"pick" | "create">("pick");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const textRef = useRef<HTMLTextAreaElement | null>(null);

  // Inline-Edit (Etappe B). Pro Render ist max ein Eintrag in Bearbeitung.
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editUrl, setEditUrl] = useState("");

  // Modal-Reset auf Open. Klassisches "synchronise external state in
  // effect"-Pattern — wir schreiben State in den Effect, weil das Öffnen
  // des Modals (`open=true`) den lokalen Form-State neu seedet.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setMode(sources.length === 0 ? "create" : "pick");
    setText("");
    setUrl("");
    setEditIndex(null);
    setTimeout(() => textRef.current?.focus(), 50);
  }, [open, sources.length]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) return null;

  function handleSave() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onCreateNew({ text: trimmed, url: url.trim() || undefined });
    onClose();
  }

  function startEdit(i: number, s: Source) {
    setEditIndex(i);
    setEditText(s.text);
    setEditUrl(s.url ?? "");
  }

  function cancelEdit() {
    setEditIndex(null);
    setEditText("");
    setEditUrl("");
  }

  function commitEdit() {
    if (editIndex === null || !onUpdateExisting) return;
    const trimmed = editText.trim();
    if (!trimmed) return;
    onUpdateExisting(editIndex, {
      text: trimmed,
      url: editUrl.trim() || undefined,
    });
    cancelEdit();
  }

  return (
    <>
      <style>{`
        .src-backdrop {
          position: fixed; inset: 0; z-index: 110;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: flex-start; justify-content: center;
          padding: 80px 24px 24px;
        }
        .src-card {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 8px;
          width: 100%;
          max-width: 560px;
          font-family: var(--da-font-body);
          display: flex; flex-direction: column;
          max-height: 70vh;
          overflow: hidden;
        }
        .src-header { padding: 16px 18px; border-bottom: 1px solid var(--da-border); display: flex; gap: 8px; align-items: center; }
        .src-tab {
          background: transparent;
          border: 1px solid var(--da-border);
          color: var(--da-muted-soft);
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
        }
        .src-tab--active { background: var(--da-green); color: var(--da-dark); border-color: var(--da-green); font-weight: 700; }
        .src-body { padding: 14px 18px 18px; overflow-y: auto; }
        .src-list { display: flex; flex-direction: column; gap: 6px; }
        .src-item {
          display: flex; gap: 12px;
          align-items: flex-start;
          background: transparent;
          border: 1px solid var(--da-border);
          color: var(--da-text);
          padding: 10px 12px;
          border-radius: 4px;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          width: 100%;
        }
        .src-item:hover { background: var(--da-dark); }
        .src-item-n {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-weight: 700;
          font-size: 13px;
          flex-shrink: 0;
          width: 24px;
        }
        .src-item-text { font-size: 13px; line-height: 1.5; }
        .src-item-url { color: var(--da-muted-soft); font-size: 11px; margin-top: 4px; font-family: var(--da-font-mono); }
        .src-input, .src-textarea {
          width: 100%;
          background: var(--da-darker);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          padding: 9px 12px;
          border-radius: 4px;
          font-size: 13px;
          font-family: inherit;
          outline: none;
        }
        .src-textarea { resize: vertical; min-height: 80px; }
        .src-label { color: var(--da-faint); font-family: var(--da-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 12px 0 6px; }
        .src-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }
        .src-btn-primary {
          background: var(--da-green); color: var(--da-dark);
          border: none; padding: 9px 16px; border-radius: 4px;
          font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
        }
        .src-btn-ghost {
          background: transparent; color: var(--da-muted-soft);
          border: 1px solid var(--da-border);
          padding: 9px 16px; border-radius: 4px;
          font-size: 13px; cursor: pointer; font-family: inherit;
        }
      `}</style>
      <div
        className="src-backdrop"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="src-card" role="dialog" aria-modal="true">
          <div className="src-header">
            <button
              type="button"
              className={`src-tab${mode === "pick" ? " src-tab--active" : ""}`}
              onClick={() => setMode("pick")}
              disabled={sources.length === 0}
            >
              Existierende ({sources.length})
            </button>
            <button
              type="button"
              className={`src-tab${mode === "create" ? " src-tab--active" : ""}`}
              onClick={() => setMode("create")}
            >
              Neue Quelle
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" className="src-btn-ghost" onClick={onClose}>
              Schliessen
            </button>
          </div>

          <div className="src-body">
            {mode === "pick" ? (
              sources.length === 0 ? (
                <p style={{ color: "var(--da-muted)", fontSize: 13 }}>
                  Noch keine Quellen — auf &quot;Neue Quelle&quot; wechseln.
                </p>
              ) : (
                <div className="src-list">
                  {order.map((i) => {
                    const s = sources[i];
                    const editing = editIndex === i;
                    if (editing) {
                      return (
                        <div
                          key={s.id}
                          className="src-item-edit"
                          style={{
                            border: "1px solid var(--da-green)",
                            borderRadius: 4,
                            padding: 12,
                            background: "var(--da-darker)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                            <span className="src-item-n">[^{displayOf(i)}]</span>
                            <span style={{ color: "var(--da-muted)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
                              N bleibt unverändert
                            </span>
                          </div>
                          <label className="src-label" style={{ marginTop: 0 }}>Quellen-Text</label>
                          <textarea
                            className="src-textarea"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                          />
                          <label className="src-label">URL (optional)</label>
                          <input
                            className="src-input"
                            type="url"
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                            placeholder="https://…"
                          />
                          <div className="src-actions">
                            <button type="button" className="src-btn-ghost" onClick={cancelEdit}>
                              Abbrechen
                            </button>
                            <button
                              type="button"
                              className="src-btn-primary"
                              onClick={commitEdit}
                              disabled={!editText.trim()}
                            >
                              Speichern
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={s.id}
                        className="src-item"
                        style={{ display: "flex", gap: 12, alignItems: "stretch" }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onPickExisting(i + 1);
                            onClose();
                          }}
                          style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "flex-start",
                            background: "transparent",
                            border: 0,
                            color: "var(--da-text)",
                            padding: 0,
                            cursor: "pointer",
                            textAlign: "left",
                            flex: 1,
                            minWidth: 0,
                            fontFamily: "inherit",
                          }}
                        >
                          <span className="src-item-n">[^{displayOf(i)}]</span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <div className="src-item-text">{s.text}</div>
                            {s.url && <div className="src-item-url">{s.url}</div>}
                          </span>
                        </button>
                        {onUpdateExisting && (
                          <button
                            type="button"
                            onClick={() => startEdit(i, s)}
                            style={{
                              background: "transparent",
                              color: "var(--da-muted-soft)",
                              border: "1px solid var(--da-border)",
                              borderRadius: 4,
                              padding: "4px 10px",
                              fontSize: 11,
                              cursor: "pointer",
                              fontFamily: "inherit",
                              flex: "0 0 auto",
                              alignSelf: "center",
                            }}
                            title="Quelle bearbeiten (Text/URL — N bleibt)"
                          >
                            Bearbeiten
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div>
                <label className="src-label">Quellen-Text</label>
                <textarea
                  ref={textRef}
                  className="src-textarea"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder='z.B. "Statistik der BFU 2024"'
                />
                <label className="src-label">URL (optional)</label>
                <input
                  className="src-input"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                />
                <div className="src-actions">
                  <button type="button" className="src-btn-ghost" onClick={onClose}>
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    className="src-btn-primary"
                    onClick={handleSave}
                    disabled={!text.trim()}
                  >
                    Quelle anlegen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export { newSourceId };

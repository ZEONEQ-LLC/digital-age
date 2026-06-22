"use client";

import { useState } from "react";
import type { Source, SourceUrlStatus } from "@/types/blocks";
import type { SourceListItem } from "@/components/blockReader/sources";

// Verwaltungs-Liste der Quellen (Quellen-Tab im Editor). Zeigt jede Quelle
// mit ihrer ANZEIGE-Nummer und in der Reihenfolge der oeffentlichen Seite
// (referenzierte zuerst nach Auftritt, dann nicht-referenzierte) — die Zahlen
// stammen aus derselben Quelle wie der Renderer (computeSourceDisplayItems).
// Erlaubt Inline-Bearbeiten von Text/URL (positionsstabil), Anlegen neuer
// Quellen und Loeschen — wobei Loeschen NUR fuer sicher-loeschbare Indizes
// angeboten wird (siehe sourceListOps.deletableSourceIndices).
//
// WICHTIG: Die ANZEIGE ist umsortiert, die MUTATIONEN laufen weiter ueber die
// Array-Position (`item.index`). Storage-Semantik (`[^N]` → sources[N-1])
// bleibt unangetastet.
//
// Mutationen laufen ueber Callbacks; der Owner (EditorClient) haelt
// doc.sources und wendet die reinen Ops aus sourceListOps an.

type Labels = {
  empty: string;
  edit: string;
  delete: string;
  cancel: string;
  save: string;
  add: string;
  textLabel: string;
  urlLabel: string;
  unreferenced: string;
  referenced: string;
  newHeading: string;
  confirmDelete: string;
  check: string;
  checking: string;
  checkHint: string;
  status: Record<SourceUrlStatus, string>;
};

type Props = {
  // Bereits in Anzeige-Reihenfolge (referenziert zuerst, dann Pool) + mit
  // Anzeige-Nummer und Array-Position aus computeSourceDisplayItems.
  items: SourceListItem[];
  referenced: Set<number>; // 0-basierte Indizes, die im Body via [^N] zitiert sind
  deletable: Set<number>; // 0-basierte Indizes, die sicher loeschbar sind
  labels: Labels;
  onUpdate: (index: number, patch: { text: string; url?: string }) => void;
  onCreate: (src: { text: string; url?: string }) => void;
  onDelete: (index: number) => void;
  // Nur gesetzt fuer Editor:innen → blendet den "URLs pruefen"-Button ein.
  onCheckUrls?: () => void;
  checking?: boolean;
};

// Farbgebung der Status-Badges via Design-System-Status-Tokens.
const STATUS_STYLE: Record<SourceUrlStatus, { fg: string; bg: string }> = {
  ok: { fg: "var(--st-success-fg, #32ff7e)", bg: "var(--st-success-bg, rgba(50,255,126,0.12))" },
  redirect: { fg: "var(--st-info-fg, #dcd6f7)", bg: "var(--st-info-bg, rgba(220,214,247,0.10))" },
  blocked: { fg: "var(--st-warning-fg, #ff8c42)", bg: "var(--st-warning-bg, rgba(255,140,66,0.12))" },
  dead: { fg: "var(--st-error-fg, #ff5c5c)", bg: "var(--st-error-bg, rgba(255,92,92,0.10))" },
  error: { fg: "var(--da-muted, #b0b0b0)", bg: "transparent" },
  timeout: { fg: "var(--da-muted, #b0b0b0)", bg: "transparent" },
};

export default function SourceList({
  items,
  referenced,
  deletable,
  labels,
  onUpdate,
  onCreate,
  onDelete,
  onCheckUrls,
  checking = false,
}: Props) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [newText, setNewText] = useState("");
  const [newUrl, setNewUrl] = useState("");

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
    if (editIndex === null) return;
    const t = editText.trim();
    if (!t) return;
    onUpdate(editIndex, { text: t, url: editUrl.trim() || undefined });
    cancelEdit();
  }
  function commitCreate() {
    const t = newText.trim();
    if (!t) return;
    onCreate({ text: t, url: newUrl.trim() || undefined });
    setNewText("");
    setNewUrl("");
  }

  return (
    <div className="qsrc">
      <style>{`
        .qsrc { max-width: 720px; }
        .qsrc-list { display: flex; flex-direction: column; gap: 8px; }
        .qsrc-item {
          border: 1px solid var(--da-border); border-radius: 6px;
          padding: 12px 14px; display: flex; gap: 12px; align-items: flex-start;
        }
        .qsrc-n { color: var(--da-green); font-family: var(--da-font-mono); font-weight: 700; font-size: 13px; flex: 0 0 auto; width: 34px; }
        .qsrc-main { flex: 1; min-width: 0; }
        .qsrc-text { font-size: 14px; line-height: 1.5; color: var(--da-text); }
        .qsrc-url { color: var(--da-muted-soft); font-size: 11px; margin-top: 4px; font-family: var(--da-font-mono); word-break: break-all; }
        .qsrc-badge { display: inline-block; font-size: 10px; font-family: var(--da-font-mono); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 8px; border-radius: 3px; margin-top: 6px; }
        .qsrc-badge--unref { color: var(--st-warning-fg, var(--da-orange)); background: var(--st-warning-bg, rgba(255, 140, 66, 0.12)); border: 1px solid var(--st-warning-fg, var(--da-orange)); }
        .qsrc-actions { display: flex; flex-direction: column; gap: 6px; flex: 0 0 auto; }
        .qsrc-btn { background: transparent; color: var(--da-muted-soft); border: 1px solid var(--da-border); border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-family: inherit; }
        .qsrc-btn:hover { color: var(--da-text); }
        .qsrc-btn--danger:hover { color: var(--da-red, #ff5c5c); border-color: var(--da-red, #ff5c5c); }
        .qsrc-input, .qsrc-textarea { width: 100%; background: var(--da-darker); color: var(--da-text); border: 1px solid var(--da-border); padding: 9px 12px; border-radius: 4px; font-size: 13px; font-family: inherit; outline: none; }
        .qsrc-textarea { resize: vertical; min-height: 70px; }
        .qsrc-label { color: var(--da-faint); font-family: var(--da-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 12px 0 6px; display: block; }
        .qsrc-form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
        .qsrc-primary { background: var(--da-green); color: var(--da-dark); border: none; padding: 9px 16px; border-radius: 4px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .qsrc-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .qsrc-ghost { background: transparent; color: var(--da-muted-soft); border: 1px solid var(--da-border); padding: 9px 16px; border-radius: 4px; font-size: 13px; cursor: pointer; font-family: inherit; }
        .qsrc-new { margin-top: 20px; border-top: 1px solid var(--da-border); padding-top: 16px; }
        .qsrc-new-h { font-family: var(--da-font-display); font-size: 15px; margin: 0 0 4px; color: var(--da-text); }
        .qsrc-checkbar { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
        .qsrc-checkhint { font-size: 11px; color: var(--da-muted-soft); }
        .qsrc-st { display: inline-block; font-size: 10px; font-family: var(--da-font-mono); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 8px; border-radius: 3px; margin-top: 6px; margin-left: 8px; }
      `}</style>

      {onCheckUrls && (
        <div className="qsrc-checkbar">
          <button type="button" className="qsrc-ghost" onClick={onCheckUrls} disabled={checking}>
            {checking ? labels.checking : labels.check}
          </button>
          <span className="qsrc-checkhint">{labels.checkHint}</span>
        </div>
      )}

      {items.length === 0 ? (
        <p style={{ color: "var(--da-muted)", fontSize: 14 }}>{labels.empty}</p>
      ) : (
        <div className="qsrc-list">
          {items.map(({ display, index: i, source: s }) => {
            if (editIndex === i) {
              return (
                <div key={s.id} className="qsrc-item" style={{ flexDirection: "column", borderColor: "var(--da-green)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="qsrc-n">{display}</span>
                    <span style={{ color: "var(--da-muted)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
                      {labels.referenced}
                    </span>
                  </div>
                  <label className="qsrc-label" style={{ marginTop: 8 }}>{labels.textLabel}</label>
                  <textarea className="qsrc-textarea" value={editText} onChange={(e) => setEditText(e.target.value)} />
                  <label className="qsrc-label">{labels.urlLabel}</label>
                  <input className="qsrc-input" type="url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://…" />
                  <div className="qsrc-form-actions">
                    <button type="button" className="qsrc-ghost" onClick={cancelEdit}>{labels.cancel}</button>
                    <button type="button" className="qsrc-primary" onClick={commitEdit} disabled={!editText.trim()}>{labels.save}</button>
                  </div>
                </div>
              );
            }
            const isRef = referenced.has(i);
            return (
              <div key={s.id} className="qsrc-item">
                <span className="qsrc-n">{display}</span>
                <div className="qsrc-main">
                  <div className="qsrc-text">{s.text}</div>
                  {s.url && <div className="qsrc-url">{s.url}</div>}
                  {!isRef && <span className="qsrc-badge qsrc-badge--unref">{labels.unreferenced}</span>}
                  {s.urlStatus && (
                    <span
                      className="qsrc-st"
                      style={{
                        color: STATUS_STYLE[s.urlStatus].fg,
                        background: STATUS_STYLE[s.urlStatus].bg,
                        border: `1px solid ${STATUS_STYLE[s.urlStatus].fg}`,
                      }}
                      title={s.urlStatusCode ? `HTTP ${s.urlStatusCode}` : undefined}
                    >
                      {labels.status[s.urlStatus]}
                    </span>
                  )}
                </div>
                <div className="qsrc-actions">
                  <button type="button" className="qsrc-btn" onClick={() => startEdit(i, s)}>{labels.edit}</button>
                  {deletable.has(i) && (
                    <button
                      type="button"
                      className="qsrc-btn qsrc-btn--danger"
                      onClick={() => { if (window.confirm(labels.confirmDelete)) onDelete(i); }}
                    >
                      {labels.delete}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="qsrc-new">
        <h3 className="qsrc-new-h">{labels.newHeading}</h3>
        <label className="qsrc-label">{labels.textLabel}</label>
        <textarea className="qsrc-textarea" value={newText} onChange={(e) => setNewText(e.target.value)} placeholder='z.B. "Statistik der BFU 2024"' />
        <label className="qsrc-label">{labels.urlLabel}</label>
        <input className="qsrc-input" type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://…" />
        <div className="qsrc-form-actions">
          <button type="button" className="qsrc-primary" onClick={commitCreate} disabled={!newText.trim()}>{labels.add}</button>
        </div>
      </div>
    </div>
  );
}

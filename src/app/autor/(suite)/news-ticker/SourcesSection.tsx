"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSource,
  deleteSource,
  updateSource,
  type SourcePatch,
} from "@/lib/newsTickerActions";
import type { Database } from "@/lib/database.types";

type NewsSourceRow = Database["public"]["Tables"]["news_sources"]["Row"];

type Props = {
  sources: NewsSourceRow[];
};

const LANGUAGE_LABELS: Record<string, string> = {
  de: "Deutsch",
  en: "Englisch",
  fr: "Französisch",
  it: "Italienisch",
};

const COUNTRY_LABELS: Record<string, string> = {
  CH: "Schweiz",
  DE: "Deutschland",
  AT: "Österreich",
  INT: "International",
};

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Kein Default" },
  { value: "ki-business", label: "KI & Business" },
  { value: "future-tech", label: "Future Tech" },
  { value: "swiss-ai", label: "Swiss AI" },
  { value: "tools", label: "Tools" },
];

function emptyPatch(): SourcePatch {
  return {
    name: "",
    url: "",
    source_type: "rss",
    language: "de",
    country: null,
    default_category: null,
    is_active: true,
  };
}

function rowToPatch(r: NewsSourceRow): SourcePatch {
  return {
    name: r.name,
    url: r.url,
    source_type: r.source_type as SourcePatch["source_type"],
    language: r.language as SourcePatch["language"],
    country: r.country as SourcePatch["country"],
    default_category: r.default_category,
    is_active: r.is_active,
  };
}

export default function SourcesSection({ sources }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; patch: SourcePatch } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openNew() {
    setError(null);
    setEditing({ id: null, patch: emptyPatch() });
  }

  function openEdit(r: NewsSourceRow) {
    setError(null);
    setEditing({ id: r.id, patch: rowToPatch(r) });
  }

  function submit() {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      try {
        if (editing.id === null) {
          await createSource(editing.patch);
        } else {
          await updateSource(editing.id, editing.patch);
        }
        setEditing(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function handleDelete(r: NewsSourceRow) {
    if (!window.confirm(`Quelle "${r.name}" wirklich löschen? Alle Items dieser Quelle werden mitgelöscht.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteSource(r.id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h2 style={{ color: "var(--da-text)", fontSize: 18, fontWeight: 700 }}>Quellen</h2>
        <button type="button" onClick={openNew} style={primaryBtnStyle}>
          + Neue Quelle
        </button>
      </div>

      {sources.length === 0 ? (
        <div
          style={{
            background: "var(--da-card)",
            border: "1px solid var(--da-border)",
            borderRadius: 6,
            padding: "32px 24px",
            color: "var(--da-muted)",
            textAlign: "center",
          }}
        >
          Noch keine Quellen angelegt.
        </div>
      ) : (
        <div
          style={{
            background: "var(--da-card)",
            border: "1px solid var(--da-border)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--da-dark)" }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>URL</th>
                <th style={thStyle}>Typ</th>
                <th style={thStyle}>Sprache</th>
                <th style={thStyle}>Land</th>
                <th style={thStyle}>Aktiv</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--da-border)" }}>
                  <td style={tdStyle}>{s.name}</td>
                  <td style={{ ...tdStyle, fontFamily: "var(--da-font-mono)", fontSize: 11, color: "var(--da-muted)", wordBreak: "break-all", maxWidth: 280 }}>
                    {s.url}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "var(--da-font-mono)", fontSize: 12 }}>{s.source_type}</td>
                  <td style={tdStyle}>{LANGUAGE_LABELS[s.language] ?? s.language}</td>
                  <td style={tdStyle}>{s.country ? (COUNTRY_LABELS[s.country] ?? s.country) : "—"}</td>
                  <td style={tdStyle}>
                    <span style={activeBadgeStyle(s.is_active)}>{s.is_active ? "aktiv" : "inaktiv"}</span>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    <button type="button" onClick={() => openEdit(s)} style={linkBtnStyle}>
                      Bearbeiten
                    </button>
                    <span style={{ color: "var(--da-faint)", margin: "0 8px" }}>·</span>
                    <button type="button" onClick={() => handleDelete(s)} style={{ ...linkBtnStyle, color: "#ff8e8e" }}>
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <SourceModal
          patch={editing.patch}
          isNew={editing.id === null}
          pending={pending}
          error={error}
          onChange={(p) => setEditing({ id: editing.id, patch: p })}
          onCancel={() => setEditing(null)}
          onSubmit={submit}
        />
      )}
    </section>
  );
}

function SourceModal({
  patch,
  isNew,
  pending,
  error,
  onChange,
  onCancel,
  onSubmit,
}: {
  patch: SourcePatch;
  isNew: boolean;
  pending: boolean;
  error: string | null;
  onChange: (p: SourcePatch) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--da-card)",
          border: "1px solid var(--da-border)",
          borderRadius: 8,
          padding: 24,
          maxWidth: 540,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ color: "var(--da-text)", fontSize: 18, fontWeight: 700 }}>
          {isNew ? "Neue Quelle" : "Quelle bearbeiten"}
        </h2>

        <Field label="Name">
          <input
            value={patch.name}
            onChange={(e) => onChange({ ...patch, name: e.target.value })}
            placeholder='z.B. "Heise KI"'
            style={inputStyle}
            maxLength={100}
          />
        </Field>

        <Field label="Feed-URL">
          <input
            value={patch.url}
            onChange={(e) => onChange({ ...patch, url: e.target.value })}
            placeholder="https://…"
            style={{ ...inputStyle, fontFamily: "var(--da-font-mono)" }}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Typ">
            <select
              value={patch.source_type}
              onChange={(e) => onChange({ ...patch, source_type: e.target.value as SourcePatch["source_type"] })}
              style={inputStyle}
            >
              <option value="rss">RSS</option>
              <option value="atom">Atom</option>
              <option value="html">HTML (Phase 2+)</option>
            </select>
          </Field>

          <Field label="Sprache">
            <select
              value={patch.language}
              onChange={(e) => onChange({ ...patch, language: e.target.value as SourcePatch["language"] })}
              style={inputStyle}
            >
              <option value="de">Deutsch</option>
              <option value="en">Englisch</option>
              <option value="fr">Französisch</option>
              <option value="it">Italienisch</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Land (optional)">
            <select
              value={patch.country ?? ""}
              onChange={(e) => onChange({ ...patch, country: (e.target.value === "" ? null : e.target.value) as SourcePatch["country"] })}
              style={inputStyle}
            >
              <option value="">—</option>
              <option value="CH">Schweiz</option>
              <option value="DE">Deutschland</option>
              <option value="AT">Österreich</option>
              <option value="INT">International</option>
            </select>
          </Field>

          <Field label="Default-Kategorie">
            <select
              value={patch.default_category ?? ""}
              onChange={(e) => onChange({ ...patch, default_category: e.target.value === "" ? null : e.target.value })}
              style={inputStyle}
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <input
            type="checkbox"
            checked={patch.is_active}
            onChange={(e) => onChange({ ...patch, is_active: e.target.checked })}
          />
          <span style={{ color: "var(--da-text)", fontSize: 13 }}>
            <strong>Aktiv</strong> — wird in Phase 2 vom Refresh-Job einbezogen
          </span>
        </label>

        {error && (
          <p style={{ color: "#ff8e8e", fontSize: 12, margin: 0 }} role="alert">{error}</p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button type="button" onClick={onCancel} disabled={pending} style={cancelBtnStyle}>
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={pending || !patch.name.trim() || !patch.url.trim()}
            style={{
              ...primaryBtnStyle,
              opacity: pending || !patch.name.trim() || !patch.url.trim() ? 0.6 : 1,
            }}
          >
            {pending ? "…" : isNew ? "Anlegen" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ color: "var(--da-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  color: "var(--da-muted)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontFamily: "var(--da-font-mono)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  color: "var(--da-text)",
  verticalAlign: "middle",
};

const inputStyle: React.CSSProperties = {
  background: "var(--da-dark)",
  color: "var(--da-text)",
  border: "1px solid var(--da-border)",
  borderRadius: 4,
  padding: "9px 12px",
  fontSize: 13,
  fontFamily: "inherit",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "var(--da-green)",
  color: "var(--da-dark)",
  border: "none",
  borderRadius: 4,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const cancelBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--da-muted)",
  border: "1px solid var(--da-border)",
  borderRadius: 4,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const linkBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--da-green)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  padding: 0,
};

function activeBadgeStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 3,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--da-font-mono)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    background: active ? "rgba(50,255,126,0.12)" : "rgba(160,160,160,0.12)",
    color: active ? "var(--da-green)" : "var(--da-muted)",
  };
}

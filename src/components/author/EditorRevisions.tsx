"use client";

import { useState, useTransition } from "react";
import AuthorCard from "./AuthorCard";
import MonoCaption from "./MonoCaption";
import type { RevisionWithEditor } from "@/lib/authorApi";
import { restoreRevision } from "@/lib/revisionActions";
import {
  revisionTypeOf,
  isRestorable,
  isPartialRevision,
  shouldRestoreSlug,
} from "@/lib/revisionSnapshot";

type EditorRevisionsProps = {
  revisions: RevisionWithEditor[];
  articleId: string;
  everPublished: boolean;
};

function statusLabel(s: string): string {
  if (s === "draft") return "Entwurf";
  if (s === "in_review") return "In Review";
  if (s === "published") return "Veröffentlicht";
  if (s === "archived") return "Archiviert";
  return s;
}

// Punkt-Farbe + Meilenstein-Optik je Eintrags-Typ. Status-Wechsel und Restore
// sind Meilensteine (Ring statt Füllpunkt), Content-Einträge ein Füllpunkt.
function marker(r: RevisionWithEditor): { color: string; milestone: boolean } {
  const t = revisionTypeOf(r);
  if (t === "restore") return { color: "var(--da-purple, #dcd6f7)", milestone: true };
  if (t === "status_change") {
    const s = r.new_status;
    const color =
      s === "published"
        ? "var(--da-green)"
        : s === "in_review"
          ? "var(--da-orange, #ff9f0a)"
          : s === "archived"
            ? "var(--da-faint)"
            : "var(--da-muted-soft)";
    return { color, milestone: true };
  }
  return { color: "var(--da-muted-soft)", milestone: false };
}

function summary(r: RevisionWithEditor): string {
  const t = revisionTypeOf(r);
  if (t === "restore") return "Wiederhergestellt";
  if (t === "status_change") {
    return `Status: ${statusLabel(r.previous_status ?? "")} → ${statusLabel(r.new_status)}`;
  }
  if (!r.previous_status) return "Artikel erstellt";
  const base = "Inhalt bearbeitet";
  return r.previous_status !== r.new_status
    ? `${base} · ${statusLabel(r.previous_status)} → ${statusLabel(r.new_status)}`
    : base;
}

function relative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.max(1, Math.round((now - then) / 60000));
  if (diffMin < 60) return `vor ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 14) return `vor ${diffD} Tag${diffD === 1 ? "" : "en"}`;
  const diffW = Math.round(diffD / 7);
  return `vor ${diffW} Wo.`;
}

const restoreBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--da-purple, #dcd6f7)",
  border: "1px solid var(--da-purple, #dcd6f7)",
  borderRadius: 3,
  padding: "4px 10px",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

export default function EditorRevisions({
  revisions,
  articleId,
  everPublished,
}: EditorRevisionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRestore(r: RevisionWithEditor) {
    const partial = isPartialRevision(r);
    const restoreSlug = shouldRestoreSlug(everPublished);
    const lines = [
      "Diesen Stand wiederherstellen?",
      "",
      partial
        ? "Ältere Revision — nur Titel + Text (Markdown) werden wiederhergestellt."
        : "Wiederhergestellt: Titel, Text, Abstract, Bilder, Kategorie/Tags, SEO-Felder.",
      restoreSlug
        ? "Auch der URL-Slug wird wiederhergestellt."
        : "Die URL (Slug) bleibt unverändert (Artikel war publiziert).",
      "Der Status bleibt unverändert.",
      "",
      "Der aktuelle Stand wird vorher als Revision gesichert (rückgängig machbar).",
    ];
    if (!window.confirm(lines.join("\n"))) return;
    setError(null);
    setPendingId(r.id);
    startTransition(async () => {
      const res = await restoreRevision(articleId, r.id);
      if (!res.ok) {
        setError(res.message);
        setPendingId(null);
        return;
      }
      // Robuster Reload — der Editor mountet mit dem restaurierten Stand neu
      // (Client-State wird komplett aus dem frischen article-Prop geseedet).
      window.location.reload();
    });
  }

  if (revisions.length === 0) {
    return (
      <AuthorCard padding={22}>
        <MonoCaption>Revisionsverlauf</MonoCaption>
        <p style={{ color: "var(--da-muted)", fontSize: 13 }}>Noch keine Revisionen.</p>
      </AuthorCard>
    );
  }

  return (
    <AuthorCard padding={22}>
      <MonoCaption>Revisionsverlauf</MonoCaption>
      {error && (
        <p
          role="alert"
          style={{
            color: "#ff8e8e",
            fontSize: 12,
            fontFamily: "var(--da-font-mono)",
            margin: "8px 0 0",
          }}
        >
          {error}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {revisions.map((r, i) => {
          const isLast = i === revisions.length - 1;
          const m = marker(r);
          const restorable = isRestorable(r);
          const partial = isPartialRevision(r);
          return (
            <div
              key={r.id}
              style={{
                display: "flex",
                gap: 14,
                padding: "14px 0",
                borderBottom: isLast ? "none" : "1px solid var(--da-border)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: m.milestone ? "transparent" : m.color,
                    border: m.milestone ? `2px solid ${m.color}` : "none",
                    boxSizing: "border-box",
                  }}
                />
                {!isLast && <span style={{ width: 1, flex: 1, background: "var(--da-border)", marginTop: 4 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: "var(--da-text)", fontSize: 13, fontWeight: 600 }}>
                    {r.editor?.display_name ?? "System"}
                  </span>
                  <span style={{ color: "var(--da-muted-soft)", fontSize: 11, fontFamily: "var(--da-font-mono)", flex: "0 0 auto" }}>
                    {relative(r.created_at)}
                  </span>
                </div>
                <p style={{ color: "var(--da-muted)", fontSize: 12, marginBottom: 4 }}>{summary(r)}</p>
                <p
                  style={{
                    color: "var(--da-muted-soft)",
                    fontSize: 11,
                    fontFamily: "var(--da-font-mono)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    margin: 0,
                  }}
                >
                  &ldquo;{r.title_snapshot}&rdquo;
                </p>
                {restorable && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={{
                        ...restoreBtnStyle,
                        cursor: pending ? "not-allowed" : "pointer",
                        opacity: pending ? 0.6 : 1,
                      }}
                      disabled={pending}
                      onClick={() => handleRestore(r)}
                    >
                      {pendingId === r.id ? "Stelle wieder her…" : "Wiederherstellen"}
                    </button>
                    {partial && (
                      <span style={{ color: "var(--da-muted-soft)", fontSize: 10, fontFamily: "var(--da-font-mono)" }}>
                        Teilweise wiederherstellbar — ältere Revision
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AuthorCard>
  );
}

"use client";

import AuthorCard from "./AuthorCard";
import MonoCaption from "./MonoCaption";
import type { RevisionWithEditor } from "@/lib/authorApi";

type EditorRevisionsProps = {
  revisions: RevisionWithEditor[];
};

function dotColor(prev: string | null, next: string): string {
  if (!prev) return "var(--da-green)";
  if (next === "published") return "var(--da-green)";
  if (next === "in_review") return "var(--da-orange)";
  if (next === "archived") return "var(--da-faint)";
  return "var(--da-muted-soft)";
}

function statusLabel(s: string): string {
  if (s === "draft") return "Entwurf";
  if (s === "in_review") return "In Review";
  if (s === "published") return "Veröffentlicht";
  if (s === "archived") return "Archiviert";
  return s;
}

function summary(r: RevisionWithEditor): string {
  if (!r.previous_status) return "Artikel erstellt";
  if (r.previous_status !== r.new_status) {
    return `Status: ${statusLabel(r.previous_status)} → ${statusLabel(r.new_status)}`;
  }
  return "Inhalt bearbeitet";
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

export default function EditorRevisions({ revisions }: EditorRevisionsProps) {
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
      <div style={{ display: "flex", flexDirection: "column" }}>
        {revisions.map((r, i) => {
          const isLast = i === revisions.length - 1;
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
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: dotColor(r.previous_status, r.new_status),
                  }}
                />
                {!isLast && <span style={{ width: 1, flex: 1, background: "var(--da-border)", marginTop: 4 }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ color: "var(--da-text)", fontSize: 13, fontWeight: 600 }}>
                    {r.editor?.display_name ?? "System"}
                  </span>
                  <span style={{ color: "var(--da-muted-soft)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
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
                  }}
                >
                  &ldquo;{r.title_snapshot}&rdquo;
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </AuthorCard>
  );
}

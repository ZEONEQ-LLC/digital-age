"use client";

import AuthorCard from "./AuthorCard";
import MonoCaption from "./MonoCaption";
import type { Author, Revision } from "@/types/author";

type EditorRevisionsProps = {
  revisions: Revision[];
  authorsById: Record<string, Author>;
};

const dotColor = (type: Revision["type"]): string => {
  if (type === "create") return "var(--da-green)";
  if (type === "review") return "var(--da-orange)";
  if (type === "submit") return "var(--da-orange)";
  if (type === "publish") return "var(--da-green)";
  return "var(--da-muted-soft)";
};

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

export default function EditorRevisions({ revisions, authorsById }: EditorRevisionsProps) {
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
          const author = authorsById[r.authorId];
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
                    background: dotColor(r.type),
                  }}
                />
                {!isLast && <span style={{ width: 1, flex: 1, background: "var(--da-border)", marginTop: 4 }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ color: "var(--da-text)", fontSize: 13, fontWeight: 600 }}>
                    {author?.name ?? "Unbekannt"}
                  </span>
                  <span style={{ color: "var(--da-muted-soft)", fontSize: 11, fontFamily: "var(--da-font-mono)" }}>
                    {relative(r.createdAt)}
                  </span>
                </div>
                <p style={{ color: "var(--da-muted)", fontSize: 12, marginBottom: 8 }}>{r.summary}</p>
                {i > 0 && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      disabled
                      title="Vergleich kommt mit Supabase-Backend"
                      style={{
                        background: "transparent",
                        color: "var(--da-green)",
                        border: "1px solid var(--da-green)",
                        borderRadius: 3,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "not-allowed",
                        opacity: 0.6,
                        fontFamily: "inherit",
                      }}
                    >
                      Vergleichen
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Wiederherstellen kommt mit Supabase-Backend"
                      style={{
                        background: "transparent",
                        color: "var(--da-muted-soft)",
                        border: "1px solid var(--da-border)",
                        borderRadius: 3,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "not-allowed",
                        opacity: 0.6,
                        fontFamily: "inherit",
                      }}
                    >
                      Wiederherstellen
                    </button>
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

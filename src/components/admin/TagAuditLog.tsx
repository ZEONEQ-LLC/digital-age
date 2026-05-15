export type AuditLogEntry = {
  id: string;
  operation: "rename" | "merge" | "delete";
  tagNameBefore: string;
  tagNameAfter: string | null;
  affectedCount: number;
  performedAt: string;
  performedByName: string | null;
};

type Props = { entries: AuditLogEntry[] };

const opLabel: Record<AuditLogEntry["operation"], string> = {
  rename: "Rename",
  merge: "Merge",
  delete: "Delete",
};

const opColor: Record<AuditLogEntry["operation"], string> = {
  rename: "var(--da-green)",
  merge: "var(--da-orange)",
  delete: "#ff6b6b",
};

function formatDateTimeDE(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describe(entry: AuditLogEntry): string {
  if (entry.operation === "rename") {
    return `„${entry.tagNameBefore}" → „${entry.tagNameAfter ?? "—"}"`;
  }
  if (entry.operation === "merge") {
    return `„${entry.tagNameBefore}" → „${entry.tagNameAfter ?? "—"}" (${entry.affectedCount} Artikel)`;
  }
  return `„${entry.tagNameBefore}" (${entry.affectedCount} Artikel)`;
}

export default function TagAuditLog({ entries }: Props) {
  return (
    <section style={{ marginTop: "48px" }}>
      <style>{`
        .tags-audit-h {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 14px;
        }
        .tags-audit-list {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 6px;
          overflow: hidden;
        }
        .tags-audit-row {
          display: grid;
          grid-template-columns: 88px 1fr auto auto;
          gap: 14px;
          align-items: center;
          padding: 10px 14px;
          border-bottom: 1px solid var(--da-border);
          font-size: 12px;
        }
        .tags-audit-row:last-child { border-bottom: none; }
        .tags-audit-op {
          font-family: var(--da-font-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 3px;
          text-align: center;
          background: var(--da-dark);
        }
        .tags-audit-desc {
          color: var(--da-text);
          font-size: 13px;
        }
        .tags-audit-actor {
          color: var(--da-muted-soft);
          font-size: 11px;
          font-family: var(--da-font-mono);
          white-space: nowrap;
        }
        .tags-audit-time {
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 11px;
          white-space: nowrap;
        }
        .tags-audit-empty {
          padding: 24px;
          text-align: center;
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 12px;
        }
        @media (max-width: 640px) {
          .tags-audit-row {
            grid-template-columns: 1fr;
            gap: 4px;
          }
          .tags-audit-op { justify-self: start; }
        }
      `}</style>

      <h2 className="tags-audit-h">Letzte Tag-Operationen</h2>
      {entries.length === 0 ? (
        <div className="tags-audit-list">
          <div className="tags-audit-empty">Noch keine Operationen.</div>
        </div>
      ) : (
        <div className="tags-audit-list">
          {entries.map((entry) => (
            <div key={entry.id} className="tags-audit-row">
              <span
                className="tags-audit-op"
                style={{ color: opColor[entry.operation] }}
              >
                {opLabel[entry.operation]}
              </span>
              <span className="tags-audit-desc">{describe(entry)}</span>
              <span className="tags-audit-actor">
                {entry.performedByName ?? "—"}
              </span>
              <span className="tags-audit-time">
                {formatDateTimeDE(entry.performedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

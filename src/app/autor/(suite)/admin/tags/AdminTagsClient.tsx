"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import RenameTagModal from "@/components/admin/RenameTagModal";
import MergeTagModal from "@/components/admin/MergeTagModal";
import DeleteTagModal from "@/components/admin/DeleteTagModal";

export type AdminTagRow = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  articleCount: number;
};

type SortKey = "name" | "slug" | "articleCount" | "createdAt";
type SortDir = "asc" | "desc";
type ModalState =
  | { kind: "rename"; row: AdminTagRow }
  | { kind: "merge"; row: AdminTagRow }
  | { kind: "delete"; row: AdminTagRow }
  | null;

type Toast = { kind: "ok" | "err"; message: string };

type Props = { initialRows: AdminTagRow[] };

function formatDateDE(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminTagsClient({ initialRows }: Props) {
  const rows = initialRows;
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("articleCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function handleAction(action: "rename" | "merge" | "delete", row: AdminTagRow) {
    setModal({ kind: action, row });
  }

  function closeModal() {
    setModal(null);
  }

  function afterRename() {
    setModal(null);
    setToast({ kind: "ok", message: "Tag umbenannt." });
    router.refresh();
  }

  function afterMerge(info: { affectedCount: number; toName: string }) {
    setModal(null);
    setToast({
      kind: "ok",
      message: `${info.affectedCount} Artikel auf „${info.toName}" umgehängt.`,
    });
    router.refresh();
  }

  function afterDelete(info: { affectedCount: number }) {
    setModal(null);
    setToast({
      kind: "ok",
      message:
        info.affectedCount > 0
          ? `Tag gelöscht. ${info.affectedCount} Artikel-Junctions entfernt.`
          : "Tag gelöscht.",
    });
    router.refresh();
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q.length === 0
      ? rows
      : rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.slug.toLowerCase().includes(q),
        );
    const sorted = [...base].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name, "de") * dir;
      if (sortKey === "slug") return a.slug.localeCompare(b.slug, "de") * dir;
      if (sortKey === "createdAt")
        return (a.createdAt.localeCompare(b.createdAt)) * dir;
      // articleCount: numeric; tiebreak alphabetisch
      if (a.articleCount === b.articleCount) {
        return a.name.localeCompare(b.name, "de");
      }
      return (a.articleCount - b.articleCount) * dir;
    });
    return sorted;
  }, [rows, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "articleCount" ? "desc" : "asc");
    }
  }

  function sortArrow(key: SortKey): string {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  return (
    <>
      <style>{`
        .tags-adm-toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .tags-adm-search {
          flex: 1;
          min-width: 240px;
          background: var(--da-dark);
          color: var(--da-text);
          border: 1px solid var(--da-border);
          border-radius: 4px;
          padding: 9px 12px;
          font-size: 13px;
          font-family: var(--da-font-body);
        }
        .tags-adm-search:focus { outline: none; border-color: var(--da-green); }
        .tags-adm-count {
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 12px;
          white-space: nowrap;
        }

        .tags-adm-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: 6px;
          overflow: hidden;
        }
        .tags-adm-th {
          text-align: left;
          font-family: var(--da-font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--da-muted);
          padding: 12px 14px;
          background: var(--da-dark);
          border-bottom: 1px solid var(--da-border);
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        .tags-adm-th:hover { color: var(--da-text); }
        .tags-adm-th--actions { cursor: default; text-align: right; }
        .tags-adm-th--actions:hover { color: var(--da-muted); }

        .tags-adm-td {
          padding: 12px 14px;
          font-size: 13px;
          color: var(--da-text);
          border-bottom: 1px solid var(--da-border);
          vertical-align: middle;
        }
        .tags-adm-tr:last-child .tags-adm-td { border-bottom: none; }
        .tags-adm-td--slug {
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 12px;
        }
        .tags-adm-td--count {
          font-family: var(--da-font-mono);
          font-size: 12px;
          color: var(--da-muted-soft);
          text-align: right;
          padding-right: 24px;
        }
        .tags-adm-td--date {
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 12px;
          white-space: nowrap;
        }
        .tags-adm-td--actions {
          text-align: right;
          white-space: nowrap;
        }
        .tags-adm-name-link {
          color: var(--da-text);
          text-decoration: none;
          font-weight: 500;
        }
        .tags-adm-name-link:hover { color: var(--da-green); }
        .tags-adm-view {
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 11px;
          margin-left: 8px;
          text-decoration: none;
        }
        .tags-adm-view:hover { color: var(--da-green); }

        .tags-adm-btn {
          background: transparent;
          color: var(--da-muted-soft);
          border: 1px solid var(--da-border);
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-family: var(--da-font-mono);
          cursor: pointer;
          margin-left: 6px;
        }
        .tags-adm-btn:hover { color: var(--da-text); border-color: var(--da-muted-soft); }
        .tags-adm-btn--danger:hover {
          color: #ff6b6b;
          border-color: #ff6b6b;
        }

        .tags-adm-empty {
          padding: 40px 20px;
          text-align: center;
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 13px;
        }

        /* Mobile: Cards statt Tabelle */
        .tags-adm-cards { display: none; }
        @media (max-width: 768px) {
          .tags-adm-table-wrap { display: none; }
          .tags-adm-cards { display: flex; flex-direction: column; gap: 10px; }
          .tags-adm-card {
            background: var(--da-card);
            border: 1px solid var(--da-border);
            border-radius: 6px;
            padding: 14px;
          }
          .tags-adm-card__name {
            color: var(--da-text);
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .tags-adm-card__slug {
            color: var(--da-muted);
            font-family: var(--da-font-mono);
            font-size: 11px;
            margin-bottom: 10px;
          }
          .tags-adm-card__meta {
            display: flex;
            justify-content: space-between;
            font-family: var(--da-font-mono);
            font-size: 11px;
            color: var(--da-muted-soft);
            margin-bottom: 12px;
          }
          .tags-adm-card__actions {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
          }
          .tags-adm-card__actions .tags-adm-btn { margin-left: 0; }
        }
      `}</style>

      <div className="tags-adm-toolbar">
        <input
          type="text"
          className="tags-adm-search"
          placeholder="Suche nach Name oder Slug…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="tags-adm-count">
          {filtered.length} von {rows.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="tags-adm-empty">
          {rows.length === 0
            ? "Noch keine Tags vorhanden."
            : "Keine Treffer für die Suche."}
        </div>
      ) : (
        <>
          <div className="tags-adm-table-wrap">
            <table className="tags-adm-table">
              <thead>
                <tr>
                  <th
                    className="tags-adm-th"
                    onClick={() => toggleSort("name")}
                  >
                    Name{sortArrow("name")}
                  </th>
                  <th
                    className="tags-adm-th"
                    onClick={() => toggleSort("slug")}
                  >
                    Slug{sortArrow("slug")}
                  </th>
                  <th
                    className="tags-adm-th"
                    onClick={() => toggleSort("articleCount")}
                    style={{ textAlign: "right", paddingRight: 24 }}
                  >
                    Artikel{sortArrow("articleCount")}
                  </th>
                  <th
                    className="tags-adm-th"
                    onClick={() => toggleSort("createdAt")}
                  >
                    Erstellt{sortArrow("createdAt")}
                  </th>
                  <th className="tags-adm-th tags-adm-th--actions">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="tags-adm-tr">
                    <td className="tags-adm-td">
                      <button
                        type="button"
                        className="tags-adm-name-link"
                        onClick={() => handleAction("rename", row)}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: "inherit",
                        }}
                      >
                        {row.name}
                      </button>
                      <Link
                        href={`/tag/${row.slug}`}
                        target="_blank"
                        className="tags-adm-view"
                      >
                        ↗
                      </Link>
                    </td>
                    <td className="tags-adm-td tags-adm-td--slug">{row.slug}</td>
                    <td className="tags-adm-td tags-adm-td--count">
                      {row.articleCount}
                    </td>
                    <td className="tags-adm-td tags-adm-td--date">
                      {formatDateDE(row.createdAt)}
                    </td>
                    <td className="tags-adm-td tags-adm-td--actions">
                      <button
                        type="button"
                        className="tags-adm-btn"
                        onClick={() => handleAction("rename", row)}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="tags-adm-btn"
                        onClick={() => handleAction("merge", row)}
                      >
                        Merge
                      </button>
                      <button
                        type="button"
                        className="tags-adm-btn tags-adm-btn--danger"
                        onClick={() => handleAction("delete", row)}
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tags-adm-cards">
            {filtered.map((row) => (
              <div key={row.id} className="tags-adm-card">
                <div className="tags-adm-card__name">{row.name}</div>
                <div className="tags-adm-card__slug">{row.slug}</div>
                <div className="tags-adm-card__meta">
                  <span>{row.articleCount} Artikel</span>
                  <span>{formatDateDE(row.createdAt)}</span>
                </div>
                <div className="tags-adm-card__actions">
                  <button
                    type="button"
                    className="tags-adm-btn"
                    onClick={() => handleAction("rename", row)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="tags-adm-btn"
                    onClick={() => handleAction("merge", row)}
                  >
                    Merge
                  </button>
                  <button
                    type="button"
                    className="tags-adm-btn tags-adm-btn--danger"
                    onClick={() => handleAction("delete", row)}
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modal?.kind === "rename" && (
        <RenameTagModal
          tag={{ id: modal.row.id, name: modal.row.name, slug: modal.row.slug }}
          onClose={closeModal}
          onDone={afterRename}
        />
      )}
      {modal?.kind === "merge" && (
        <MergeTagModal
          fromTag={{
            id: modal.row.id,
            name: modal.row.name,
            slug: modal.row.slug,
            articleCount: modal.row.articleCount,
          }}
          onClose={closeModal}
          onDone={afterMerge}
        />
      )}
      {modal?.kind === "delete" && (
        <DeleteTagModal
          tag={{
            id: modal.row.id,
            name: modal.row.name,
            articleCount: modal.row.articleCount,
          }}
          onClose={closeModal}
          onDone={afterDelete}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: toast.kind === "ok" ? "var(--da-green)" : "#ff6b6b",
            color: "var(--da-dark)",
            padding: "12px 18px",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            zIndex: 200,
            fontFamily: "var(--da-font-body)",
          }}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}

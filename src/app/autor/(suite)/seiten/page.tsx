import Link from "next/link";
import PageTitle from "@/components/author/PageTitle";
import { getAllPagesForEditor } from "@/lib/pagesApi";
import NewPageButton from "./NewPageButton";

export default async function PagesListPage() {
  const pages = await getAllPagesForEditor();

  return (
    <>
      <PageTitle
        title="Seiten"
        subtitle="Statische Seiten (Footer-Pages, Rechtliches, Editorials). Editor-only."
        right={<NewPageButton />}
      />

      {pages.length === 0 ? (
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
          Noch keine Seiten angelegt.
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
                <th style={thStyle}>Titel</th>
                <th style={thStyle}>Slug</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Locale</th>
                <th style={thStyle}>Aktualisiert</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid var(--da-border)" }}>
                  <td style={tdStyle}>{p.title}</td>
                  <td style={{ ...tdStyle, fontFamily: "var(--da-font-mono)", fontSize: 12 }}>
                    /{p.slug}
                  </td>
                  <td style={tdStyle}>
                    <span style={statusBadgeStyle(p.status)}>{p.status}</span>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "var(--da-font-mono)", fontSize: 12 }}>
                    {p.locale}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "var(--da-font-mono)", fontSize: 12, color: "var(--da-muted)" }}>
                    {new Date(p.updated_at).toLocaleDateString("de-CH", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </td>
                  <td style={tdStyle}>
                    <Link
                      href={`/autor/seiten/${p.id}`}
                      style={{ color: "var(--da-green)", fontSize: 13, fontWeight: 600 }}
                    >
                      Bearbeiten →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
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
  padding: "14px",
  color: "var(--da-text)",
  verticalAlign: "middle",
};

function statusBadgeStyle(status: string): React.CSSProperties {
  const draft = status !== "published";
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 3,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "var(--da-font-mono)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    background: draft ? "rgba(160,160,160,0.12)" : "rgba(50,255,126,0.12)",
    color: draft ? "var(--da-muted)" : "var(--da-green)",
  };
}

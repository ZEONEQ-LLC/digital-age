import Link from "next/link";
import type { Metadata } from "next";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import { getAllTags } from "@/lib/tags";

export const metadata: Metadata = {
  title: "Alle Tags — digital-age",
  description:
    "Stöbere durch alle Themen auf digital-age.ch — alphabetisch sortiert.",
};

export default async function TagsPage() {
  const tags = await getAllTags();

  return (
    <main
      style={{
        paddingTop: "var(--nav-h)",
        backgroundColor: "var(--da-dark)",
        minHeight: "100vh",
      }}
    >
      <NewsTicker />

      <section
        style={{
          borderBottom: "1px solid var(--da-border)",
          padding: "48px var(--sp-8) 44px",
        }}
      >
        <div style={{ maxWidth: "var(--max-content)", margin: "0 auto" }}>
          <nav
            aria-label="Breadcrumb"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--sp-2)",
              marginBottom: "var(--sp-5)",
              flexWrap: "wrap",
              fontSize: "var(--fs-meta)",
            }}
          >
            <Link href="/" style={{ color: "var(--da-muted)" }}>
              Home
            </Link>
            <span style={{ color: "var(--da-faint)" }}>/</span>
            <span
              style={{ color: "var(--da-green)", fontWeight: 600 }}
            >
              Tags
            </span>
            <span style={{ color: "var(--da-faint)" }}>·</span>
            <span
              style={{
                color: "var(--da-muted-soft)",
                fontFamily: "var(--da-font-mono)",
                whiteSpace: "nowrap",
              }}
            >
              {tags.length} Themen
            </span>
          </nav>

          <div
            style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)" }}
          >
            <div
              style={{
                width: "4px",
                height: "56px",
                borderRadius: "2px",
                background: "var(--da-green)",
                flexShrink: 0,
              }}
            />
            <div>
              <h1
                style={{
                  color: "var(--da-text)",
                  fontFamily: "var(--da-font-display)",
                  fontSize: "clamp(32px, 4vw, 48px)",
                  fontWeight: 700,
                  lineHeight: 1.0,
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                Alle Themen
              </h1>
              <p
                style={{
                  color: "var(--da-muted)",
                  fontSize: "15px",
                  lineHeight: 1.6,
                  marginTop: "10px",
                  maxWidth: "560px",
                }}
              >
                Stöbere durch alle Tags auf digital-age — alphabetisch sortiert.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          maxWidth: "var(--max-content)",
          margin: "0 auto",
          padding: "var(--sp-12) var(--sp-8) var(--sp-20)",
        }}
      >
        {tags.length === 0 ? (
          <p
            style={{
              padding: "var(--sp-12) 0",
              textAlign: "center",
              color: "var(--da-muted)",
              fontFamily: "var(--da-font-mono)",
              fontSize: "var(--fs-body-sm)",
            }}
          >
            Noch keine Tags vorhanden.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--sp-2)",
            }}
          >
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tag/${tag.slug}`}
                style={{
                  background: "var(--da-card)",
                  color: "var(--da-text-strong)",
                  border: "1px solid var(--da-border)",
                  fontSize: "14px",
                  fontWeight: 500,
                  padding: "8px 16px",
                  borderRadius: "999px",
                  textDecoration: "none",
                  transition:
                    "border-color var(--t-fast), color var(--t-fast)",
                }}
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import ArticleListRow from "@/components/ArticleListRow";
import { getArticlesByTagSlug, getTagBySlug } from "@/lib/tags";
import { articleToListRow } from "@/lib/mappers/articleMappers";
import type { Database } from "@/lib/database.types";

type PageProps = { params: Promise<{ slug: string }> };

// SSG: alle bekannten Tag-Slugs vorab generieren. Wir können nicht den
// ssr-Client (createClient) verwenden, weil der intern cookies() aufruft —
// das ist build-time verboten. Stattdessen direkt @supabase/supabase-js
// mit dem anon-Key (RLS `tags_public_read` erlaubt anon SELECT).
//
// Wenn die Public-Env-Vars beim Build nicht gesetzt sind (z.B. lokal ohne
// `.env.local`), wird ein leeres Array zurückgegeben — Next.js rendert
// dann jeden Tag-Slug dynamisch on-demand statt vorab.
export async function generateStaticParams() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const supabase = createSupabaseClient<Database>(url, key);
  const { data } = await supabase.from("tags").select("slug");
  return (data ?? []).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) {
    return { title: "Tag nicht gefunden — digital-age" };
  }
  return {
    title: `#${tag.name} — Artikel zum Thema`,
    description: `Alle Artikel zum Thema ${tag.name} auf digital-age.ch.`,
  };
}

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const rows = await getArticlesByTagSlug(slug, 50);
  const articles = rows.map((row, idx) => articleToListRow(row, idx));

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
            <Link href="/tags" style={{ color: "var(--da-muted)" }}>
              Tags
            </Link>
            <span style={{ color: "var(--da-faint)" }}>/</span>
            <span style={{ color: "var(--da-green)", fontWeight: 600 }}>
              #{tag.name}
            </span>
            <span style={{ color: "var(--da-faint)" }}>·</span>
            <span
              style={{
                color: "var(--da-muted-soft)",
                fontFamily: "var(--da-font-mono)",
                whiteSpace: "nowrap",
              }}
            >
              {articles.length} Artikel
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
                #{tag.name}
              </h1>
              <p
                style={{
                  color: "var(--da-muted)",
                  fontSize: "15px",
                  lineHeight: 1.6,
                  marginTop: "10px",
                }}
              >
                Alle Artikel zum Thema {tag.name}.
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
        {articles.length === 0 ? (
          <p
            style={{
              padding: "var(--sp-12) 0",
              textAlign: "center",
              color: "var(--da-muted)",
              fontFamily: "var(--da-font-mono)",
              fontSize: "var(--fs-body-sm)",
            }}
          >
            Noch keine Artikel zu diesem Thema.
          </p>
        ) : (
          articles.map((a) => (
            <ArticleListRow
              key={a.id}
              article={a}
              dotColor="var(--da-green)"
            />
          ))
        )}
      </section>

      <Footer />
    </main>
  );
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import Footer from "@/components/Footer";
import ArticleListRow from "@/components/ArticleListRow";
import { ShowcaseRows, ShowcaseStyles } from "@/components/showcase/ShowcaseParts";
import { SHOWCASE_PATH } from "@/lib/contentType";
import { getShowcaseArticlesByTagSlug, showcaseToListRow } from "@/lib/showcaseApi";
import { getArticlesByTagSlug, getTagBySlug } from "@/lib/tags";
import { articleToListRow } from "@/lib/mappers/articleMappers";
import type { Database } from "@/lib/database.types";
import { buildListingMetadata } from "@/lib/listingMetadata";
import { buildBreadcrumbJsonLd, buildItemListJsonLd } from "@/lib/jsonLd";
import { getBaseUrl } from "@/lib/siteUrl";
import { tagIsIndexable } from "@/lib/tagIndex";

type PageProps = { params: Promise<{ slug: string }> };

// SSG: alle bekannten Tag-Slugs vorab generieren. Wir können nicht den
// ssr-Client (createClient) verwenden, weil der intern cookies() aufruft —
// das ist build-time verboten. Stattdessen direkt @supabase/supabase-js
// mit dem anon-Key (RLS `tags_public_read` erlaubt anon SELECT).
//
// Wenn die Public-Env-Vars beim Build nicht gesetzt sind (z.B. lokal ohne
// `.env.local`), wird ein leeres Array zurückgegeben — Next.js rendert
// dann jeden Tag-Slug dynamisch on-demand statt vorab.
export const revalidate = 120;

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
  const [rows, showcaseArticles] = await Promise.all([
    getArticlesByTagSlug(slug, 50),
    getShowcaseArticlesByTagSlug(slug, 10),
  ]);
  const metadata = buildListingMetadata({
    path: `/tag/${tag.slug}`,
    title: `#${tag.name} — Artikel zum Thema`,
    description: `Alle Artikel zum Thema ${tag.name} auf digital-age.ch — kuratierte Übersicht für Entscheider und Praktiker in der DACH-Region.`,
  });
  // Duenne Tag-Seiten nicht in den Index, Links darauf weiter verfolgen
  // (Regel und Schwelle in src/lib/tagIndex.ts, Sitemap filtert gleich).
  if (!tagIsIndexable(rows.length + showcaseArticles.length)) {
    metadata.robots = { index: false, follow: true };
  }
  return metadata;
}

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const [rows, showcaseArticles] = await Promise.all([
    getArticlesByTagSlug(slug, 50),
    getShowcaseArticlesByTagSlug(slug, 10),
  ]);
  const articles = rows.map((row, idx) => articleToListRow(row, idx));
  // Unternehmensbeitraege zum Thema: nie in der redaktionellen Liste, sondern
  // als eigener, gekennzeichneter Abschnitt darunter (S2b).
  const showcaseRows = showcaseArticles.map(showcaseToListRow);

  const baseUrl = getBaseUrl();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: `${baseUrl}/` },
    { name: "Tags", url: `${baseUrl}/tags` },
    { name: `#${tag.name}` },
  ]);
  const itemListJsonLd = buildItemListJsonLd({
    name: `Artikel zum Thema ${tag.name}`,
    items: rows.map((row) => ({
      url: `${baseUrl}/artikel/${row.slug}`,
      name: row.title,
    })),
  });

  return (
    <main
      style={{
        paddingTop: "var(--nav-h)",
        backgroundColor: "var(--da-dark)",
        minHeight: "100vh",
      }}
    >
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: itemListJsonLd }}
      />


      <section
        style={{
          borderBottom: "1px solid var(--da-border)",
          padding: "48px 0 44px",
        }}
      >
        {/* Rand innen wie bei der Liste darunter, sonst steht der Kopf 32 px weiter links. */}
        <div style={{ maxWidth: "var(--max-content)", margin: "0 auto", padding: "0 var(--gutter)" }}>
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
          padding: "var(--sp-12) var(--gutter) var(--sp-20)",
        }}
      >
        {articles.length === 0 ? (
          <p
            style={{
              padding: showcaseRows.length > 0 ? "0 0 var(--sp-4)" : "var(--sp-12) 0",
              textAlign: showcaseRows.length > 0 ? "left" : "center",
              color: "var(--da-muted)",
              fontFamily: "var(--da-font-mono)",
              fontSize: "var(--fs-body-sm)",
            }}
          >
            Noch keine Artikel der Redaktion zu diesem Thema.
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
        {showcaseRows.length > 0 && (
          <div style={{ marginTop: "var(--sp-12)" }}>
            <ShowcaseStyles />
            <ShowcaseRows
              heading="Aus dem Showcase"
              rows={showcaseRows}
              moreHref={SHOWCASE_PATH}
              moreLabel="Zum Showcase"
            />
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}

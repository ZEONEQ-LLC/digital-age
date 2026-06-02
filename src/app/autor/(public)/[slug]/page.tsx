import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import ExternalBadge from "@/components/ExternalBadge";
import { getAuthorByHandle, getArticlesByAuthor } from "@/lib/authorApi";
import { getCoverUrl } from "@/lib/coverImage";
import { authorToProfileViewModel } from "@/lib/mappers/articleMappers";
import { buildListingMetadata } from "@/lib/listingMetadata";
import {
  buildBreadcrumbJsonLd,
  buildProfilePageJsonLd,
  normalizeSocialUrl,
} from "@/lib/jsonLd";
import { getBaseUrl } from "@/lib/siteUrl";
import { createPublicClient } from "@/lib/supabase/public";

type PageProps = { params: Promise<{ slug: string }> };

export const revalidate = 300;

// SSG: claimed Author-Handles vorab generieren. Param-Name ist `slug`,
// der WERT ist der Author-`handle` (Lookup geht über getAuthorByHandle).
// Filter analog Sitemap-Fetcher (#112): nur claimed Profile mit gesetztem
// handle — Authors ohne handle haben keine erreichbare /autor/<X>-URL,
// ungeclaimte Placeholder gehören nicht in den Public-Cache.
export async function generateStaticParams() {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("authors")
      .select("handle")
      .not("handle", "is", null)
      .not("user_id", "is", null);
    const params: { slug: string }[] = [];
    for (const a of data ?? []) {
      if (typeof a.handle === "string" && a.handle.length > 0) {
        params.push({ slug: a.handle });
      }
    }
    return params;
  } catch {
    return [];
  }
}

function truncateForMeta(s: string, max = 158): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await getAuthorByHandle(slug);
  if (!row) return { title: "Autor nicht gefunden — digital-age" };
  const jobTitleSuffix = row.job_title ? ` · ${row.job_title}` : "";
  const description = truncateForMeta(
    row.bio?.trim() ||
      `Profil und Artikel von ${row.display_name} auf digital-age.ch — Beiträge zu Künstlicher Intelligenz und Future Tech mit Schweizer Perspektive.`,
  );
  return buildListingMetadata({
    path: `/autor/${slug}`,
    title: `${row.display_name}${jobTitleSuffix} — digital age`,
    description,
  });
}

function formatDateDE(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function linkedinHref(value: string | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

export default async function AuthorPage({ params }: PageProps) {
  const { slug } = await params;
  const row = await getAuthorByHandle(slug);
  if (!row) notFound();

  const author = authorToProfileViewModel(row);
  const articles = await getArticlesByAuthor(row.id);
  const categories = Array.from(
    new Set(articles.map((a) => a.category?.name_de).filter((x): x is string => !!x)),
  );
  const linkedin = linkedinHref(author.social.linkedin);
  const website = author.social.website ?? null;

  const baseUrl = getBaseUrl();
  const sameAs = [
    normalizeSocialUrl(author.social.linkedin),
    normalizeSocialUrl(author.social.website),
    normalizeSocialUrl(author.social.x),
    normalizeSocialUrl(author.social.mastodon),
    normalizeSocialUrl(author.social.github),
  ].filter((u): u is string => !!u);
  const profileJsonLd = buildProfilePageJsonLd({
    baseUrl,
    handle: slug,
    displayName: author.name,
    jobTitle: author.jobTitle ?? null,
    imageUrl: author.avatar ?? null,
    sameAs,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: `${baseUrl}/` },
    { name: author.name },
  ]);

  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: profileJsonLd }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <style>{`
        .author-hero { display: grid; grid-template-columns: 200px 1fr; gap: 48px; align-items: start; }
        .author-stats { display: flex; gap: 32px; flex-wrap: wrap; }
        @media (max-width: 768px) {
          .author-hero { grid-template-columns: 1fr; gap: 24px; text-align: center; }
          .author-hero__avatar { margin: 0 auto; }
          .author-stats { justify-content: center; }
        }
      `}</style>



      <section style={{ borderBottom: "1px solid var(--da-card)", padding: "32px 32px 64px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", marginBottom: "32px" }}>
          <nav
            aria-label="Breadcrumb"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              fontSize: "var(--fs-body-sm)",
            }}
          >
            <Link href="/" style={{ color: "var(--da-muted)" }}>
              Home
            </Link>
            <span style={{ color: "var(--da-faint)" }}>/</span>
            <span style={{ color: "var(--da-green)", fontWeight: 600 }}>
              {author.name}
            </span>
          </nav>
        </div>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="author-hero">
            {author.avatar && (
              <div
                className="author-hero__avatar"
                style={{
                  position: "relative",
                  width: 200,
                  height: 200,
                  flexShrink: 0,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "3px solid var(--da-green)",
                }}
              >
                <Image
                  src={author.avatar}
                  alt={author.name}
                  fill
                  sizes="200px"
                  priority
                  unoptimized
                  style={{ objectFit: "cover" }}
                />
              </div>
            )}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
                <p style={{ color: "var(--da-green)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
                  {author.isExternal ? "Gastautor" : "Autor"}
                </p>
                {author.isExternal && <ExternalBadge size="sm" />}
              </div>
              <h1 style={{ color: "var(--da-text)", fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 700, lineHeight: 1.2, marginBottom: "8px", fontFamily: "var(--da-font-display)" }}>
                {author.name}
              </h1>
              {(author.jobTitle || author.location) && (
                <p style={{ color: "var(--da-muted)", fontSize: "18px", marginBottom: "24px" }}>
                  {author.jobTitle}
                  {author.jobTitle && author.location ? " · " : ""}
                  {author.location}
                </p>
              )}
              {author.bio && (
                <p style={{ color: "var(--da-text-strong)", fontSize: "16px", lineHeight: 1.7, maxWidth: "700px", marginBottom: "32px" }}>{author.bio}</p>
              )}

              <div className="author-stats" style={{ marginBottom: "24px" }}>
                <div>
                  <p style={{ color: "var(--da-green)", fontSize: "32px", fontWeight: 700, fontFamily: "var(--da-font-display)", lineHeight: 1 }}>{articles.length}</p>
                  <p style={{ color: "var(--da-muted)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: "6px" }}>Artikel</p>
                </div>
                <div>
                  <p style={{ color: "var(--da-green)", fontSize: "32px", fontWeight: 700, fontFamily: "var(--da-font-display)", lineHeight: 1 }}>{categories.length}</p>
                  <p style={{ color: "var(--da-muted)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: "6px" }}>Kategorien</p>
                </div>
              </div>

              {(linkedin || website) && (
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {linkedin && (
                    <a href={linkedin} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", color: "var(--da-text-strong)", padding: "10px 18px", borderRadius: "4px", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      LinkedIn
                    </a>
                  )}
                  {website && (
                    <a href={website} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", color: "var(--da-text-strong)", padding: "10px 18px", borderRadius: "4px", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 14a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 10a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                      Website
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "64px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", borderBottom: "1px solid var(--da-border)", paddingBottom: "16px" }}>
          <h2 style={{ color: "var(--da-text)", fontSize: "24px", fontWeight: 700 }}>Alle Artikel von {author.name}</h2>
          <span style={{ color: "var(--da-muted)", fontSize: "14px" }}>{articles.length} Artikel</span>
        </div>
        {articles.length === 0 ? (
          <p style={{ color: "var(--da-muted)", fontSize: "15px", lineHeight: 1.6 }}>
            Bisher keine veröffentlichten Beiträge.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
            {articles.map((a) => (
              <ArticleCard
                key={a.id}
                category={a.subcategory ?? a.category?.name_de ?? ""}
                title={a.title}
                author={author.name}
                date={formatDateDE(a.published_at)}
                image={getCoverUrl(a)}
                href={`/artikel/${a.slug}`}
                external={author.isExternal}
              />
            ))}
          </div>
        )}
      </section>

      <div style={{ height: "80px" }} />
      <Footer />
    </main>
  );
}

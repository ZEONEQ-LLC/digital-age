import Image from "next/image";
import { notFound } from "next/navigation";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import ExternalBadge from "@/components/ExternalBadge";
import { getAuthors, getPublishedArticlesByAuthor } from "@/lib/mockAuthorApi";

type PageProps = { params: Promise<{ slug: string }> };

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
  const author = getAuthors().find((a) => a.handle === slug);
  if (!author) notFound();

  const articles = getPublishedArticlesByAuthor(author.id);
  const categories = Array.from(new Set(articles.map((a) => a.category)));
  const isExternal = author.type === "external";
  const linkedin = linkedinHref(author.social?.linkedin);

  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <style>{`
        .author-hero { display: grid; grid-template-columns: 200px 1fr; gap: 48px; align-items: start; }
        .author-stats { display: flex; gap: 32px; flex-wrap: wrap; }
        @media (max-width: 768px) {
          .author-hero { grid-template-columns: 1fr; gap: 24px; text-align: center; }
          .author-hero img { margin: 0 auto; }
          .author-stats { justify-content: center; }
        }
      `}</style>

      <NewsTicker />

      <section style={{ borderBottom: "1px solid var(--da-card)", padding: "64px 32px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="author-hero">
            <Image
              src={author.avatar}
              alt={author.name}
              width={200}
              height={200}
              priority
              unoptimized
              style={{ borderRadius: "50%", objectFit: "cover", border: "3px solid var(--da-green)" }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
                <p style={{ color: "var(--da-green)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
                  {isExternal ? "Gastautor" : "Autor"}
                </p>
                {isExternal && <ExternalBadge size="sm" />}
              </div>
              <h1 style={{ color: "var(--da-text)", fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 700, lineHeight: 1.2, marginBottom: "8px", fontFamily: "Space Grotesk, sans-serif" }}>
                {author.name}
              </h1>
              {(author.role || author.location) && (
                <p style={{ color: "var(--da-muted)", fontSize: "18px", marginBottom: "24px" }}>
                  {author.role}
                  {author.role && author.location ? " · " : ""}
                  {author.location}
                </p>
              )}
              <p style={{ color: "var(--da-text-strong)", fontSize: "16px", lineHeight: 1.7, maxWidth: "700px", marginBottom: "32px" }}>{author.bio}</p>

              <div className="author-stats" style={{ marginBottom: "24px" }}>
                <div>
                  <p style={{ color: "var(--da-green)", fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", lineHeight: 1 }}>{articles.length}</p>
                  <p style={{ color: "var(--da-muted)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: "6px" }}>Artikel</p>
                </div>
                <div>
                  <p style={{ color: "var(--da-green)", fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", lineHeight: 1 }}>{categories.length}</p>
                  <p style={{ color: "var(--da-muted)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: "6px" }}>Kategorien</p>
                </div>
              </div>

              {(linkedin || author.website) && (
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {linkedin && (
                    <a href={linkedin} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", color: "var(--da-text-strong)", padding: "10px 18px", borderRadius: "4px", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      LinkedIn
                    </a>
                  )}
                  {author.website && (
                    <a href={author.website} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", color: "var(--da-text-strong)", padding: "10px 18px", borderRadius: "4px", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>
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
                category={a.category}
                title={a.title}
                author={author.name}
                date={formatDateDE(a.publishedAt)}
                image={a.cover}
                href={a.slug ? `/artikel/${a.slug}` : undefined}
                external={isExternal}
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

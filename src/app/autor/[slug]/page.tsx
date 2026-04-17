import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";

// Dummy author data - will come from Supabase later
const author = {
  name: "Andreas Kamm",
  slug: "andreas-kamm",
  avatar: "https://i.pravatar.cc/300?u=andreas",
  role: "Banking & AI Strategist",
  bio: "Andreas ist Banking-Experte mit über 15 Jahren Erfahrung in der Digitalisierung von Finanzdienstleistern. Er hat in mehreren Schweizer Banken KI-Transformationsprojekte geleitet und schreibt regelmässig über die Schnittstelle von Technologie und Finanzwelt. Sein Fokus: Wie KI im Banking wirklich Mehrwert schafft – jenseits von Hype und Buzzwords.",
  linkedin: "https://www.linkedin.com/in/andreas-kamm",
  website: "https://example.com",
};

const authorArticles = [
  { category: "AI in Banking", title: "Data-Driven Banking: Why AI Alone Won't Fix the Real Problem", author: "Andreas Kamm", date: "07.04.2026", image: "https://picsum.photos/seed/bank1/600/400", href: "/artikel/data-driven-banking" },
  { category: "AI in Banking", title: "AI in Banking: Why AI won't transform Banking", author: "Andreas Kamm", date: "01.04.2026", image: "https://picsum.photos/seed/bank2/600/400", href: "/artikel/ai-banking-transform" },
  { category: "AI in Banking", title: "AI Co-Pilots in Banking: How Relationship Managers Stay in Control", author: "Andreas Kamm", date: "31.03.2026", image: "https://picsum.photos/seed/bank3/600/400", href: "/artikel/ai-copilots-banking" },
];

export default function AuthorPage() {
  const categories = Array.from(new Set(authorArticles.map(a => a.category)));

  return (
    <main style={{ paddingTop: "64px", backgroundColor: "#1c1c1e", minHeight: "100vh" }}>
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

      {/* Author Hero */}
      <section style={{ borderBottom: "1px solid #2a2a2e", padding: "64px 32px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div className="author-hero">
            <img src={author.avatar} alt={author.name} style={{ width: "200px", height: "200px", borderRadius: "50%", objectFit: "cover", border: "3px solid #32ff7e" }} />
            <div>
              <p style={{ color: "#32ff7e", fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>Autor</p>
              <h1 style={{ color: "#ffffff", fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 700, lineHeight: 1.2, marginBottom: "8px", fontFamily: "Space Grotesk, sans-serif" }}>
                {author.name}
              </h1>
              <p style={{ color: "#b0b0b0", fontSize: "18px", marginBottom: "24px" }}>{author.role}</p>
              <p style={{ color: "#e0e0e0", fontSize: "16px", lineHeight: 1.7, maxWidth: "700px", marginBottom: "32px" }}>{author.bio}</p>

              {/* Stats */}
              <div className="author-stats" style={{ marginBottom: "24px" }}>
                <div>
                  <p style={{ color: "#32ff7e", fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", lineHeight: 1 }}>{authorArticles.length}</p>
                  <p style={{ color: "#b0b0b0", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: "6px" }}>Artikel</p>
                </div>
                <div>
                  <p style={{ color: "#32ff7e", fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", lineHeight: 1 }}>{categories.length}</p>
                  <p style={{ color: "#b0b0b0", fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: "6px" }}>Kategorien</p>
                </div>
              </div>

              {/* Social Links */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {author.linkedin && (
                  <a href={author.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "#2a2a2e", border: "1px solid #3a3a3e", color: "#e0e0e0", padding: "10px 18px", borderRadius: "4px", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </a>
                )}
                {author.website && (
                  <a href={author.website} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "#2a2a2e", border: "1px solid #3a3a3e", color: "#e0e0e0", padding: "10px 18px", borderRadius: "4px", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 14a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 10a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Author's Articles */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "64px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", borderBottom: "1px solid #3a3a3e", paddingBottom: "16px" }}>
          <h2 style={{ color: "#ffffff", fontSize: "24px", fontWeight: 700 }}>Alle Artikel von {author.name}</h2>
          <span style={{ color: "#b0b0b0", fontSize: "14px" }}>{authorArticles.length} Artikel</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
          {authorArticles.map((article, i) => (
            <ArticleCard key={i} {...article} />
          ))}
        </div>
      </section>

      <div style={{ height: "80px" }} />
      <Footer />
    </main>
  );
}

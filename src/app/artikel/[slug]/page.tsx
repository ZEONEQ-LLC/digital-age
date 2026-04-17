import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import ListenButton from "@/components/ListenButton";
import ShareButtons from "@/components/ShareButtons";
import AuthorBox from "@/components/AuthorBox";
import ArticleBody from "@/components/ArticleBody";
import ArticleSection from "@/components/ArticleSection";
import NewsletterSignup from "@/components/NewsletterSignup";

// Dummy article data - will be replaced with Supabase later
const article = {
  slug: "data-driven-banking",
  category: "AI in Banking",
  title: "Data-Driven Banking: Warum KI allein das eigentliche Problem nicht löst",
  lead: "Banken investieren Milliarden in Künstliche Intelligenz. Doch ohne saubere Daten und klare Prozesse bleibt der erhoffte Durchbruch aus. Eine Analyse.",
  image: "https://picsum.photos/seed/bank1/1600/900",
  author: {
    name: "Andreas Kamm",
    slug: "andreas-kamm",
    avatar: "https://i.pravatar.cc/150?u=andreas",
    bio: "Andreas ist Banking-Experte mit über 15 Jahren Erfahrung in der Digitalisierung von Finanzdienstleistern.",
    role: "Banking & AI Strategist",
  },
  date: "07.04.2026",
  readTime: "6 min Lesezeit",
};

const bodyText = "Banken weltweit setzen massive Budgets für Künstliche Intelligenz ein. Machine Learning Modelle sollen Kreditrisiken besser einschätzen, Chatbots den Kundenservice entlasten, und Algorithmen Betrug in Echtzeit erkennen. Die Realität sieht jedoch oft anders aus. Die versprochenen Effizienzgewinne bleiben aus, Projekte verzögern sich, und die Mitarbeitenden stehen vor Werkzeugen, die sie nicht verstehen. Der Grund liegt selten in der KI selbst. Er liegt in den Daten – und in den Strukturen, die diese Daten produzieren.";

const relatedArticles = [
  { category: "AI in Banking", title: "AI in Banking: Why AI won't transform Banking", author: "Andreas Kamm", date: "01.04.2026", image: "https://picsum.photos/seed/bank2/600/400", href: "/artikel/ai-banking-transform" },
  { category: "AI in Banking", title: "AI Co-Pilots in Banking: How Relationship Managers Stay in Control", author: "Andreas Kamm", date: "31.03.2026", image: "https://picsum.photos/seed/bank3/600/400", href: "/artikel/ai-copilots-banking" },
  { category: "KI & Business", title: "Fünf versteckte Risiken bei der Nutzung der falschen KI", author: "Matthias Zwingli", date: "16.04.2025", image: "https://picsum.photos/seed/ki1/600/400", href: "/artikel/ki-risiken" },
];

export default function ArticlePage() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "#1c1c1e", minHeight: "100vh" }}>
      <NewsTicker />

      {/* Article Hero */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 32px 24px" }}>
        <a href="/ki-im-business" style={{ color: "#32ff7e", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", marginBottom: "20px", display: "inline-block" }}>
          {article.category}
        </a>
        <h1 style={{ color: "#ffffff", fontSize: "clamp(32px, 4.5vw, 48px)", fontWeight: 700, lineHeight: 1.2, marginBottom: "24px", fontFamily: "Space Grotesk, sans-serif" }}>
          {article.title}
        </h1>
        <p style={{ color: "#b0b0b0", fontSize: "19px", lineHeight: 1.6, marginBottom: "32px", fontWeight: 300 }}>
          {article.lead}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src={article.author.avatar} alt={article.author.name} style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }} />
            <div>
              <a href={`/autor/${article.author.slug}`} style={{ color: "#ffffff", fontSize: "14px", fontWeight: 600, textDecoration: "none", display: "block" }}>{article.author.name}</a>
              <p style={{ color: "#b0b0b0", fontSize: "13px" }}>{article.date} · {article.readTime}</p>
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <ListenButton text={`${article.title}. ${article.lead} ${bodyText}`} />
          </div>
        </div>
      </section>

      {/* Hero Image */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 32px 48px" }}>
        <img src={article.image} alt={article.title} style={{ width: "100%", height: "auto", maxHeight: "500px", objectFit: "cover", borderRadius: "8px" }} />
      </div>

      {/* Article Body */}
      <article style={{ maxWidth: "720px", margin: "0 auto", padding: "0 32px" }}>
        <ArticleBody>
          <p style={{ fontSize: "20px", fontWeight: 400, color: "#ffffff", marginBottom: "32px", lineHeight: 1.6 }}>{bodyText}</p>

          <h2>Das eigentliche Problem: Datenqualität</h2>
          <p>Die meisten Banken kämpfen mit historisch gewachsenen IT-Landschaften. Kundendaten liegen in Dutzenden von Systemen, Produktdaten in anderen, und Transaktionsdaten wieder in eigenen Silos. Jede Abteilung hat eigene Definitionen: Was ist ein "aktiver Kunde"? Ab wann gilt ein Konto als "überzogen"?</p>
          <p>Ohne eine gemeinsame Datenbasis scheitert jede KI-Initiative. Das Modell mag brillant sein – wenn die Trainingsdaten inkonsistent sind, liefert es unbrauchbare Ergebnisse.</p>

          <blockquote>Garbage in, garbage out – nirgends trifft dieser Satz härter als in der Banken-KI.</blockquote>

          <h2>Drei Schritte zur echten Transformation</h2>
          <p>Was also tun? Aus meiner Erfahrung mit Transformationsprojekten in mehreren Schweizer Banken haben sich drei Prinzipien bewährt:</p>
          <ul>
            <li><strong>Daten zuerst:</strong> Bevor auch nur ein KI-Modell trainiert wird, muss die Datenbasis saniert sein.</li>
            <li><strong>Prozesse vereinfachen:</strong> KI in einen chaotischen Prozess einzubauen bringt nichts.</li>
            <li><strong>Menschen mitnehmen:</strong> Ohne Akzeptanz der Mitarbeitenden wird jedes Tool zum Regalhüter.</li>
          </ul>

          <h3>Fazit</h3>
          <p>KI ist kein Allheilmittel. Sie ist ein Werkzeug, das nur in einem gut geführten Umfeld seine Wirkung entfaltet. Banken, die das verstehen, werden die kommenden Jahre prägen. Die anderen werden weiterhin Millionen in Pilotprojekte stecken, die nie in die Produktion kommen.</p>
        </ArticleBody>

        <div style={{ margin: "48px 0 0" }}>
          <ShareButtons title={article.title} url={`/artikel/${article.slug}`} />
        </div>

        <AuthorBox {...article.author} />
      </article>

      {/* Newsletter */}
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 32px" }}>
        <NewsletterSignup variant="inline" />
      </div>

      {/* Related Articles */}
      <ArticleSection title="Das könnte dich auch interessieren" href="/ki-im-business" articles={relatedArticles} />

      <div style={{ height: "80px" }} />
      <Footer />
    </main>
  );
}

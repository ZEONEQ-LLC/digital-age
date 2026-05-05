import Image from "next/image";
import Link from "next/link";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import ListenButton from "@/components/ListenButton";
import ShareButtons from "@/components/ShareButtons";
import AuthorBox from "@/components/AuthorBox";
import ArticleBody from "@/components/ArticleBody";
import ArticleSection from "@/components/ArticleSection";
import NewsletterSignup from "@/components/NewsletterSignup";
import ReadingProgress from "@/components/ReadingProgress";
import TableOfContents, { type TocItem } from "@/components/TableOfContents";

const article = {
  slug: "data-driven-banking",
  category: "AI in Banking",
  categoryHref: "/ki-im-business",
  title: "Data-Driven Banking: Warum KI allein das eigentliche Problem nicht löst",
  lead: "Banken investieren Milliarden in Künstliche Intelligenz. Doch ohne saubere Daten und klare Prozesse bleibt der erhoffte Durchbruch aus. Eine Analyse.",
  image: "https://picsum.photos/seed/bank1/1600/900",
  author: {
    name: "Andreas Kamm",
    slug: "andreas-kamm",
    avatar: "https://i.pravatar.cc/150?u=andreas",
    bio: "Andreas ist Banking-Experte mit über 15 Jahren Erfahrung in der Digitalisierung von Finanzdienstleistern. Er begleitet Transformationsprojekte in der DACH-Region.",
    role: "Banking & AI Strategist",
  },
  date: "07.04.2026",
  readTime: "6 min",
};

const tocItems: TocItem[] = [
  { id: "intro", label: "Einleitung" },
  { id: "problem", label: "Das eigentliche Problem" },
  { id: "schritte", label: "Drei Schritte zur Transformation" },
  { id: "fazit", label: "Fazit" },
];

const ttsText = `${article.title}. ${article.lead} Banken weltweit setzen massive Budgets für Künstliche Intelligenz ein. Die Realität sieht jedoch oft anders aus. Der Grund liegt selten in der KI selbst — er liegt in den Daten.`;

const relatedArticles = [
  { category: "AI in Banking", title: "AI in Banking: Why AI won't transform Banking", author: "Andreas Kamm", date: "01.04.2026", image: "https://picsum.photos/seed/bank2/600/400", href: "/artikel/ai-banking-transform" },
  { category: "AI in Banking", title: "AI Co-Pilots in Banking: How Relationship Managers Stay in Control", author: "Andreas Kamm", date: "31.03.2026", image: "https://picsum.photos/seed/bank3/600/400", href: "/artikel/ai-copilots-banking" },
  { category: "KI & Business", title: "Fünf versteckte Risiken bei der Nutzung der falschen KI", author: "Matthias Zwingli", date: "16.04.2025", image: "https://picsum.photos/seed/ki1/600/400", href: "/artikel/ki-risiken" },
];

export default function ArticlePage() {
  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <ReadingProgress />
      <NewsTicker />

      {/* Article header — narrow column */}
      <header style={{ maxWidth: "860px", margin: "0 auto", padding: "52px var(--sp-8) 28px" }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--sp-6)" }}>
          <Link href="/" style={{ color: "var(--da-muted)", fontSize: "var(--fs-body-sm)" }}>Home</Link>
          <span style={{ color: "var(--da-faint)", fontSize: "var(--fs-body-sm)" }}>/</span>
          <Link
            href={article.categoryHref}
            style={{
              color: "var(--da-green)",
              fontFamily: "var(--da-font-mono)",
              fontSize: "var(--fs-body-sm)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {article.category}
          </Link>
        </nav>

        <h1
          style={{
            color: "var(--da-text)",
            fontFamily: "var(--da-font-display)",
            fontSize: "clamp(30px, 4vw, 48px)",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: "var(--sp-6)",
          }}
        >
          {article.title}
        </h1>

        <p style={{ color: "#c0c0c0", fontSize: "20px", lineHeight: 1.65, marginBottom: "36px", fontWeight: 300 }}>
          {article.lead}
        </p>

        {/* Author + meta + actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--sp-4)",
            paddingBottom: "28px",
            borderBottom: "1px solid var(--da-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0, borderRadius: "50%", overflow: "hidden", border: "2px solid var(--da-green)" }}>
              <Image src={article.author.avatar} alt={article.author.name} fill sizes="44px" style={{ objectFit: "cover" }} />
            </div>
            <div>
              <Link href={`/autor/${article.author.slug}`} style={{ color: "var(--da-text)", fontSize: "var(--fs-body)", fontWeight: 600, display: "block" }}>
                {article.author.name}
              </Link>
              <p style={{ color: "var(--da-muted)", fontFamily: "var(--da-font-mono)", fontSize: "var(--fs-body-sm)" }}>
                {article.date} · {article.readTime} Lesezeit
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)", flexWrap: "wrap" }}>
            <ListenButton text={ttsText} />
            <ShareButtons title={article.title} url={`/artikel/${article.slug}`} />
          </div>
        </div>
      </header>

      {/* Hero image — wider */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 var(--sp-8) var(--sp-12)" }}>
        <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden" }}>
          <Image
            src={article.image}
            alt={article.title}
            width={1600}
            height={900}
            sizes="(max-width: 1100px) 100vw, 1100px"
            priority
            style={{ width: "100%", height: "auto", maxHeight: "520px", objectFit: "cover", display: "block" }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(28,28,30,0.3) 0%, transparent 40%)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* Body grid: article + sticky TOC sidebar */}
      <ArticleBodyGrid>
        <article>
          <ArticleBody>
            <p
              id="intro"
              style={{ fontSize: "20px", fontWeight: 400, color: "var(--da-text)", lineHeight: 1.7, marginBottom: "28px", scrollMarginTop: "calc(var(--nav-h) + 80px)" }}
            >
              Banken weltweit setzen massive Budgets für Künstliche Intelligenz ein. Machine Learning Modelle sollen Kreditrisiken besser einschätzen, Chatbots den Kundenservice entlasten, und Algorithmen Betrug in Echtzeit erkennen. Die Realität sieht jedoch oft anders aus.
            </p>
            <p>
              Die versprochenen Effizienzgewinne bleiben aus, Projekte verzögern sich, und die Mitarbeitenden stehen vor Werkzeugen, die sie nicht verstehen. Der Grund liegt selten in der KI selbst. Er liegt in den Daten — und in den Strukturen, die diese Daten produzieren.
            </p>

            <h2 id="problem" style={{ scrollMarginTop: "calc(var(--nav-h) + 80px)" }}>Das eigentliche Problem: Datenqualität</h2>
            <p>
              Die meisten Banken kämpfen mit historisch gewachsenen IT-Landschaften. Kundendaten liegen in Dutzenden von Systemen, Produktdaten in anderen, und Transaktionsdaten wieder in eigenen Silos. Jede Abteilung hat eigene Definitionen: Was ist ein &bdquo;aktiver Kunde&ldquo;? Ab wann gilt ein Konto als &bdquo;überzogen&ldquo;?
            </p>
            <p>
              Ohne eine gemeinsame Datenbasis scheitert jede KI-Initiative. Das Modell mag brillant sein — wenn die Trainingsdaten inkonsistent sind, liefert es unbrauchbare Ergebnisse. Und das ist kein theoretisches Problem: In einem Transformationsprojekt bei einer mittelgrossen Schweizer Retailbank fanden wir über 40 verschiedene Definitionen des Begriffs &bdquo;Kunde&ldquo; — verteilt über 12 Kernsysteme.
            </p>

            <blockquote>
              &bdquo;Garbage in, garbage out&ldquo; — nirgends trifft dieser Satz härter als in der Banken-KI.
            </blockquote>

            <h2 id="schritte" style={{ scrollMarginTop: "calc(var(--nav-h) + 80px)" }}>Drei Schritte zur echten Transformation</h2>
            <p>Was also tun? Aus meiner Erfahrung mit Transformationsprojekten in mehreren Schweizer Banken haben sich drei Prinzipien bewährt:</p>
            <ul>
              <li><strong>Daten zuerst:</strong> Bevor auch nur ein KI-Modell trainiert wird, muss die Datenbasis saniert sein. Eine Data-Governance-Strategie ist keine Option — sie ist Voraussetzung.</li>
              <li><strong>Prozesse vereinfachen:</strong> KI in einen chaotischen Prozess einzubauen bringt nichts. Wer Automatisierung auf Komplexität aufbaut, potenziert das Chaos.</li>
              <li><strong>Menschen mitnehmen:</strong> Ohne Akzeptanz der Mitarbeitenden wird jedes Tool zum Regalhüter. Change Management ist kein Soft-Thema, sondern ROI-kritisch.</li>
            </ul>
            <p>
              Diese drei Punkte klingen simpel. In der Praxis erfordern sie jeweils Jahre an Arbeit, politischen Willen auf Führungsebene, und die Bereitschaft, unbequeme Wahrheiten über die eigene Organisation anzugehen.
            </p>

            <h3 id="fazit" style={{ scrollMarginTop: "calc(var(--nav-h) + 80px)" }}>Fazit</h3>
            <p>
              KI ist kein Allheilmittel. Sie ist ein Werkzeug, das nur in einem gut geführten Umfeld seine Wirkung entfaltet. Banken, die das verstehen, werden die kommenden Jahre prägen. Die anderen werden weiterhin Millionen in Pilotprojekte stecken, die nie in die Produktion kommen.
            </p>
            <p>
              Der Weg zur datengetriebenen Bank führt nicht über das nächste Sprachmodell. Er führt über die Bereitschaft, in die eigene Infrastruktur zu investieren — und dabei die Menschen mitzunehmen, die täglich mit diesen Daten arbeiten.
            </p>
          </ArticleBody>

          <div style={{ marginTop: "var(--sp-12)", paddingTop: "var(--sp-8)", borderTop: "1px solid var(--da-card)" }}>
            <ShareButtons title={article.title} url={`/artikel/${article.slug}`} />
          </div>

          <AuthorBox {...article.author} />
          <NewsletterSignup variant="inline" />
        </article>

        <aside>
          <TableOfContents items={tocItems} />
        </aside>
      </ArticleBodyGrid>

      {/* Related */}
      <ArticleSection title="Das könnte dich auch interessieren" href="/ki-im-business" articles={relatedArticles} />

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}

function ArticleBodyGrid({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .article-grid {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 var(--sp-8);
          display: grid;
          grid-template-columns: 1fr 220px;
          gap: var(--sp-16);
          align-items: start;
        }
        @media (max-width: 1024px) {
          .article-grid { grid-template-columns: 1fr; gap: var(--sp-8); }
          .article-grid > aside { display: none; }
        }
      `}</style>
      <div className="article-grid">{children}</div>
    </>
  );
}

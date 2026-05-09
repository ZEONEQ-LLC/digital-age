import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import ExternalBadge from "@/components/ExternalBadge";

type ArticleAuthor = {
  name: string;
  slug: string;
  avatar: string;
  bio: string;
  role?: string;
  external?: boolean;
};

type ArticleData = {
  slug: string;
  category: string;
  categoryHref: string;
  title: string;
  lead: string;
  image: string;
  author: ArticleAuthor;
  date: string;
  readTime: string;
  toc: TocItem[];
  ttsText: string;
  body: "banking" | "guest-edge-ai";
  related: { category: string; title: string; author: string; date: string; image: string; href?: string; external?: boolean }[];
};

const BANKING: ArticleData = {
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
  toc: [
    { id: "intro", label: "Einleitung" },
    { id: "problem", label: "Das eigentliche Problem" },
    { id: "schritte", label: "Drei Schritte zur Transformation" },
    { id: "fazit", label: "Fazit" },
  ],
  ttsText:
    "Data-Driven Banking. Banken investieren Milliarden in Künstliche Intelligenz. Doch ohne saubere Daten und klare Prozesse bleibt der erhoffte Durchbruch aus. Banken weltweit setzen massive Budgets für Künstliche Intelligenz ein. Die Realität sieht jedoch oft anders aus. Der Grund liegt selten in der KI selbst — er liegt in den Daten.",
  body: "banking",
  related: [
    { category: "AI in Banking", title: "AI in Banking: Why AI won't transform Banking", author: "Andreas Kamm", date: "01.04.2026", image: "https://picsum.photos/seed/bank2/600/400", href: "/artikel/ai-banking-transform" },
    { category: "AI in Banking", title: "AI Co-Pilots in Banking: How Relationship Managers Stay in Control", author: "Andreas Kamm", date: "31.03.2026", image: "https://picsum.photos/seed/bank3/600/400", href: "/artikel/ai-copilots-banking" },
    { category: "KI im Business", title: "Edge-AI im Mittelstand: Ein Praxisbericht aus drei Pilotprojekten", author: "Marc Keller", date: "02.04.2026", image: "https://picsum.photos/seed/extguest1/600/400", href: "/artikel/gastbeitrag-edge-ai-mittelstand", external: true },
  ],
};

const GUEST_EDGE: ArticleData = {
  slug: "gastbeitrag-edge-ai-mittelstand",
  category: "KI im Business",
  categoryHref: "/ki-im-business",
  title: "Edge-AI im Mittelstand: Ein Praxisbericht aus drei Pilotprojekten",
  lead: "Drei Mittelstands-Pilotprojekte, ein gemeinsamer Faden: Wer Edge-AI ernst nimmt, gewinnt nicht im Pitch, sondern in der Wartung. Was wir bei Helvetia AI gelernt haben.",
  image: "https://picsum.photos/seed/extguest1/1600/900",
  author: {
    name: "Marc Keller",
    slug: "marc-keller-gast",
    avatar: "https://i.pravatar.cc/200?img=12",
    bio: "Marc ist Gründer von Helvetia AI und beschäftigt sich seit 2018 mit Edge-AI-Anwendungen im Schweizer Mittelstand. Vor Helvetia leitete er ein IIoT-Team bei einem Maschinenbauer in Bern.",
    role: "Founder, Helvetia AI",
    external: true,
  },
  date: "02.04.2026",
  readTime: "7 min",
  toc: [
    { id: "intro", label: "Einleitung" },
    { id: "case-1", label: "Case 1 — Wartung in der Maschinenbau-Werkstatt" },
    { id: "case-2", label: "Case 2 — Qualitätskontrolle in der Lebensmittel-Verpackung" },
    { id: "case-3", label: "Case 3 — Energieoptimierung in der Logistik" },
    { id: "fazit", label: "Fazit" },
  ],
  ttsText:
    "Edge-AI im Mittelstand. Drei Pilotprojekte, ein gemeinsamer Faden. Wer Edge-AI ernst nimmt, gewinnt nicht im Pitch, sondern in der Wartung.",
  body: "guest-edge-ai",
  related: [
    { category: "AI in Banking", title: "Data-Driven Banking: Warum KI allein das eigentliche Problem nicht löst", author: "Andreas Kamm", date: "07.04.2026", image: "https://picsum.photos/seed/bank1/600/400", href: "/artikel/data-driven-banking" },
    { category: "Future of Work", title: "Augmentation statt Automation", author: "Ali Soy", date: "15.04.2026", image: "https://picsum.photos/seed/article5/600/400" },
  ],
};

const ARTICLES: Record<string, ArticleData> = {
  [BANKING.slug]: BANKING,
  [GUEST_EDGE.slug]: GUEST_EDGE,
};

type PageProps = { params: Promise<{ slug: string }> };

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = ARTICLES[slug];
  if (!article) notFound();
  const isExternal = article.author.external === true;

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <ReadingProgress />
      <NewsTicker />

      {/* Article header */}
      <header style={{ maxWidth: "860px", margin: "0 auto", padding: "52px var(--sp-8) 28px" }}>
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
          {isExternal && (
            <>
              <span style={{ color: "var(--da-faint)", fontSize: "var(--fs-body-sm)" }}>·</span>
              <ExternalBadge size="xs" />
            </>
          )}
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
            <div
              style={{
                position: "relative",
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: "50%",
                overflow: "hidden",
                border: `2px solid ${isExternal ? "var(--da-orange)" : "var(--da-green)"}`,
              }}
            >
              <Image src={article.author.avatar} alt={article.author.name} fill sizes="44px" style={{ objectFit: "cover" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Link href={`/autor/${article.author.slug}`} style={{ color: "var(--da-text)", fontSize: "var(--fs-body)", fontWeight: 600 }}>
                  {article.author.name}
                </Link>
                {isExternal && <ExternalBadge size="xs" />}
              </div>
              <p style={{ color: "var(--da-muted)", fontFamily: "var(--da-font-mono)", fontSize: "var(--fs-body-sm)" }}>
                {article.date} · {article.readTime} Lesezeit
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)", flexWrap: "wrap" }}>
            <ListenButton text={article.ttsText} />
            <ShareButtons title={article.title} url={`/artikel/${article.slug}`} />
          </div>
        </div>
      </header>

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

      <ArticleBodyGrid>
        <article>
          <ArticleBody>{article.body === "guest-edge-ai" ? <GuestEdgeBody /> : <BankingBody />}</ArticleBody>

          <div style={{ marginTop: "var(--sp-12)", paddingTop: "var(--sp-8)", borderTop: "1px solid var(--da-card)" }}>
            <ShareButtons title={article.title} url={`/artikel/${article.slug}`} />
          </div>

          <AuthorBox {...article.author} />
          <NewsletterSignup variant="inline" />
        </article>

        <aside>
          <TableOfContents items={article.toc} />
        </aside>
      </ArticleBodyGrid>

      <ArticleSection title="Das könnte dich auch interessieren" href={article.categoryHref} articles={article.related} />

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}

function BankingBody() {
  return (
    <>
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
    </>
  );
}

function GuestEdgeBody() {
  return (
    <>
      <p
        id="intro"
        style={{ fontSize: "20px", fontWeight: 400, color: "var(--da-text)", lineHeight: 1.7, marginBottom: "28px", scrollMarginTop: "calc(var(--nav-h) + 80px)" }}
      >
        In den letzten 18 Monaten haben wir bei Helvetia AI drei Edge-AI-Pilotprojekte mit Schweizer Mittelstands-Unternehmen umgesetzt. Eines davon ist abgebrochen worden, zwei laufen produktiv. Der Unterschied lag nicht im Modell — sondern darin, wie ernst die Wartung genommen wurde.
      </p>
      <p>
        Dieser Beitrag fasst zusammen, was funktioniert, was nicht, und welche Fragen ein Mittelständler vor dem Pilot stellen sollte.
      </p>

      <h2 id="case-1" style={{ scrollMarginTop: "calc(var(--nav-h) + 80px)" }}>Case 1 — Wartung in der Maschinenbau-Werkstatt</h2>
      <p>
        Ein Maschinenbauer mit 80 Mitarbeitenden im Mittelland: Wir haben ein lokales Vibrationsanalyse-Modell auf Jetson-Hardware deployt. Ziel: Ausfälle 24–48h vorher erkennen.
      </p>
      <p>
        Das Modell selbst war nach 6 Wochen produktiv. Aber: Das eigentliche Problem war nicht die Inferenz, sondern die Datenpipeline. Sensoren mussten neu kalibriert werden, OT-Daten ans IT-Netz angebunden — und das alles ohne Wartungsfenster &gt; 4 Stunden.
      </p>

      <blockquote>
        Wer Edge-AI als &bdquo;Modell-Problem&ldquo; framed, hat schon verloren. Es ist primär ein Datenfluss- und Wartungsproblem.
      </blockquote>

      <h2 id="case-2" style={{ scrollMarginTop: "calc(var(--nav-h) + 80px)" }}>Case 2 — Qualitätskontrolle in der Lebensmittel-Verpackung</h2>
      <p>
        Eine Lebensmittel-Verpackungslinie im Aargau: Vision-Modell zur Erkennung von Verpackungsfehlern. Edge-Hardware direkt am Förderband.
      </p>
      <ul>
        <li>Modell: ResNet-50, fine-tuned auf 12.000 lokalen Beispielen</li>
        <li>Latenz: ~30ms pro Bild, läuft auf einem 8-GB-Jetson</li>
        <li>False-Positive-Rate: 0.4% — niedrig genug, dass die Operateure Vertrauen haben</li>
      </ul>
      <p>
        Was wir gelernt haben: Der Operator-Test ist kritischer als der Validierungs-Test. Solange das Personal dem System nicht vertraut, wird es ignoriert.
      </p>

      <h2 id="case-3" style={{ scrollMarginTop: "calc(var(--nav-h) + 80px)" }}>Case 3 — Energieoptimierung in der Logistik</h2>
      <p>
        Ein Logistik-KMU mit eigener Lagerhalle: Optimierung der Heizungs- und Lüftungsanlage via Reinforcement Learning. Der Pilot wurde nach 4 Monaten abgebrochen — die Einsparungen rechneten sich nicht gegenüber der Wartungskomplexität.
      </p>
      <p>
        Lessons Learned: Edge-AI rechnet sich, wo Latenz oder Datensouveränität zwingend lokal sein müssen. Bei reiner Energieoptimierung schlägt eine cloud-basierte Lösung den lokalen Ansatz oft im ROI.
      </p>

      <h3 id="fazit" style={{ scrollMarginTop: "calc(var(--nav-h) + 80px)" }}>Fazit</h3>
      <p>
        Edge-AI ist im Schweizer Mittelstand angekommen — aber nicht überall sinnvoll. Wer den Pilot startet, sollte mindestens 50% des Budgets für Datenpipelines, Kalibrierung und Wartungs-Setup einplanen. Das Modell selbst ist der einfache Teil.
      </p>
      <p>
        Wenn ihr selbst überlegt: Stellt euch vor jedem Pilot die Frage, wer die Anlage in zwei Jahren betreut. Wenn die Antwort &bdquo;wir wissen es noch nicht&ldquo; lautet, ist das Projekt nicht reif.
      </p>
    </>
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

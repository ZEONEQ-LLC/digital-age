import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import Footer from "@/components/Footer";

const principles: Array<{ title: string; body: string }> = [
  {
    title: "Originalität & Attribution",
    body: "Beiträge sind dein eigener Werk oder dürfen ausdrücklich frei genutzt werden. Wir publizieren mit deiner Attribution — du bleibst Urheberin oder Urheber.",
  },
  {
    title: "Keine Schmäh, keine Diskriminierung",
    body: "Beiträge dürfen Personen oder Gruppen nicht herabwürdigen. Konstruktive Kritik ist willkommen, persönliche Angriffe nicht.",
  },
  {
    title: "Faire Quellen",
    body: "Wenn du Daten, Studien oder Aussagen Dritter zitierst, gib die Quelle an. Bei KI-Outputs nennen wir das Tool und den Kontext.",
  },
  {
    title: "Sachlich & nachvollziehbar",
    body: "Wir bevorzugen Beiträge, die nachvollziehbar argumentieren statt Hype reproduzieren. Reine Marketingtexte oder verdeckte Werbung lehnen wir ab.",
  },
];

export default function CommunityRichtlinienPage() {
  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero
        category="Community"
        title="Community-Richtlinien"
        description="Die ausführlichen Richtlinien für Beiträge auf digital age folgen demnächst. Hier ein erster Vorab-Stand zu den wichtigsten Punkten."
      />

      <section style={{ maxWidth: 720, margin: "0 auto", padding: "48px 32px 96px" }}>
        <div
          style={{
            background: "var(--da-card)",
            border: "1px solid var(--da-border)",
            borderRadius: "var(--r-lg)",
            padding: "24px 28px",
            marginBottom: "32px",
          }}
        >
          <p
            style={{
              color: "var(--da-orange)",
              fontFamily: "var(--da-font-mono)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            Hinweis
          </p>
          <p style={{ color: "var(--da-text-strong)", fontSize: "14px", lineHeight: 1.65 }}>
            Diese Seite ist ein Vorab-Stand. Die finale, juristisch geprüfte Fassung erscheint mit dem nächsten Plattform-Update.
            Solange dies hier nicht abgelöst wurde, gelten die folgenden Grundsätze für alle eingereichten Beiträge.
          </p>
        </div>

        <ol
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            padding: 0,
            counterReset: "richt",
          }}
        >
          {principles.map((p, i) => (
            <li
              key={p.title}
              style={{
                display: "grid",
                gridTemplateColumns: "44px 1fr",
                gap: "16px",
                alignItems: "start",
                background: "var(--da-card)",
                border: "1px solid var(--da-border)",
                borderRadius: "var(--r-lg)",
                padding: "20px 22px",
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--r-sm)",
                  background: "var(--da-dark)",
                  border: "1px solid var(--da-border)",
                  color: "var(--da-green)",
                  fontFamily: "var(--da-font-mono)",
                  fontWeight: 700,
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                0{i + 1}
              </span>
              <div>
                <h2
                  style={{
                    color: "var(--da-text)",
                    fontFamily: "var(--da-font-display)",
                    fontSize: "17px",
                    fontWeight: 700,
                    marginBottom: "6px",
                  }}
                >
                  {p.title}
                </h2>
                <p style={{ color: "var(--da-muted)", fontSize: "14px", lineHeight: 1.7 }}>
                  {p.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p style={{ color: "var(--da-muted-soft)", fontSize: "13px", lineHeight: 1.65, marginTop: "32px" }}>
          Fragen oder Hinweise? Schreib uns über die <a href="/kontakt" style={{ color: "var(--da-green)" }}>Kontakt-Seite</a>.
        </p>
      </section>

      <Footer />
    </main>
  );
}

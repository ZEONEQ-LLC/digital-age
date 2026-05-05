import NewsTicker from "@/components/NewsTicker";
import PageHero from "@/components/PageHero";
import Footer from "@/components/Footer";

const episodes = [
  { num: "12", title: "Wie Schweizer Banken KI wirklich einsetzen", guest: "Andreas Kamm", date: "10.04.2026", duration: "47 min", cover: "https://picsum.photos/seed/pod1/400" },
  { num: "11", title: "EU AI Act – Was kommt auf uns zu?", guest: "Ali Soy", date: "03.04.2026", duration: "52 min", cover: "https://picsum.photos/seed/pod2/400" },
  { num: "10", title: "Von OpenAI zu Swiss Hosted GPT", guest: "Matthias Zwingli", date: "27.03.2026", duration: "38 min", cover: "https://picsum.photos/seed/pod3/400" },
  { num: "09", title: "Die Zukunft der Arbeit mit KI", guest: "Sarah Müller", date: "20.03.2026", duration: "44 min", cover: "https://picsum.photos/seed/pod4/400" },
  { num: "08", title: "IoT + AI – Die industrielle Revolution 4.0", guest: "Ali Soy", date: "13.03.2026", duration: "56 min", cover: "https://picsum.photos/seed/pod5/400" },
  { num: "07", title: "KI-Regulierung aus Schweizer Sicht", guest: "Dr. Peter Kaufmann", date: "06.03.2026", duration: "41 min", cover: "https://picsum.photos/seed/pod6/400" },
];

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <PageHero category="Media" title="digital age Podcast" description="Gespräche mit Expertinnen und Experten aus der KI- und Tech-Szene der DACH-Region." />

      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 32px 80px" }}>
        {episodes.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: "24px", padding: "24px", backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: "8px", marginBottom: "16px", alignItems: "center" }}>
            <img src={e.cover} alt={e.title} style={{ width: "120px", height: "120px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <span style={{ color: "var(--da-green)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Folge {e.num}</span>
                <span style={{ color: "var(--da-muted-soft)" }}>·</span>
                <span style={{ color: "var(--da-muted)", fontSize: "12px" }}>{e.date}</span>
                <span style={{ color: "var(--da-muted-soft)" }}>·</span>
                <span style={{ color: "var(--da-muted)", fontSize: "12px" }}>⏱ {e.duration}</span>
              </div>
              <h3 style={{ color: "var(--da-text)", fontSize: "20px", fontWeight: 600, marginBottom: "6px", lineHeight: 1.3 }}>{e.title}</h3>
              <p style={{ color: "var(--da-muted)", fontSize: "14px" }}>mit {e.guest}</p>
            </div>
            <button style={{ flexShrink: 0, width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "var(--da-green)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Abspielen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--da-dark)"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
        ))}
      </section>

      <Footer />
    </main>
  );
}

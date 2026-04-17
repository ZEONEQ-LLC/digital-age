import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";

const stats = [
  { label: "Veröffentlicht", value: "12", color: "#32ff7e" },
  { label: "In Bearbeitung", value: "3", color: "#ff8c42" },
  { label: "Gesamt-Views", value: "8.4k", color: "#dcd6f7" },
  { label: "Ø Lesezeit", value: "5:32", color: "#b0b0b0" },
];

const articles = [
  { title: "Data-Driven Banking: Warum KI allein nicht reicht", status: "Veröffentlicht", date: "07.04.2026", views: "2.1k" },
  { title: "Der EU AI Act – Ein Reality Check", status: "In Review", date: "15.04.2026", views: "–" },
  { title: "Swiss Hosted GPT: Zukunft oder Nische?", status: "Entwurf", date: "–", views: "–" },
];

const statusColor = (s: string) => s === "Veröffentlicht" ? "#32ff7e" : s === "In Review" ? "#ff8c42" : "#666";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "#1c1c1e", minHeight: "100vh" }}>
      <NewsTicker />

      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 32px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "40px" }}>
          <div>
            <p style={{ color: "#32ff7e", fontSize: "12px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>Autoren-Dashboard</p>
            <h1 style={{ color: "#ffffff", fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif" }}>Willkommen, Andreas 👋</h1>
          </div>
          <button style={{ backgroundColor: "#32ff7e", color: "#1c1c1e", border: "none", padding: "14px 24px", borderRadius: "4px", fontSize: "15px", fontWeight: 700, cursor: "pointer" }}>+ Neuer Artikel</button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "48px" }}>
          {stats.map((s, i) => (
            <div key={i} style={{ backgroundColor: "#2a2a2e", border: "1px solid #3a3a3e", borderRadius: "8px", padding: "24px" }}>
              <p style={{ color: s.color, fontSize: "32px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", lineHeight: 1, marginBottom: "8px" }}>{s.value}</p>
              <p style={{ color: "#b0b0b0", fontSize: "13px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Articles */}
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ color: "#ffffff", fontSize: "22px", fontWeight: 700, marginBottom: "20px" }}>Deine Artikel</h2>
          <div style={{ backgroundColor: "#2a2a2e", border: "1px solid #3a3a3e", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "16px", padding: "16px 24px", borderBottom: "1px solid #3a3a3e", color: "#b0b0b0", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <div>Titel</div>
              <div>Status</div>
              <div>Datum</div>
              <div>Views</div>
              <div></div>
            </div>
            {articles.map((a, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: "16px", padding: "20px 24px", borderBottom: i < articles.length - 1 ? "1px solid #3a3a3e" : "none", alignItems: "center" }}>
                <div style={{ color: "#ffffff", fontSize: "15px", fontWeight: 500 }}>{a.title}</div>
                <div style={{ color: statusColor(a.status), fontSize: "13px", fontWeight: 600 }}>● {a.status}</div>
                <div style={{ color: "#b0b0b0", fontSize: "13px" }}>{a.date}</div>
                <div style={{ color: "#b0b0b0", fontSize: "13px" }}>{a.views}</div>
                <button style={{ backgroundColor: "transparent", color: "#32ff7e", border: "1px solid #32ff7e", padding: "6px 14px", borderRadius: "4px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Bearbeiten</button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          {[
            { icon: "📝", title: "Neuer Artikel", desc: "Schreibe deinen nächsten Beitrag" },
            { icon: "👤", title: "Profil bearbeiten", desc: "Bio, Foto, Social Links aktualisieren" },
            { icon: "📊", title: "Analytics", desc: "Views, Lesezeit, Engagement" },
            { icon: "⚙️", title: "Einstellungen", desc: "E-Mail-Benachrichtigungen, Passwort" },
          ].map((a, i) => (
            <a key={i} href="#" style={{ backgroundColor: "#2a2a2e", border: "1px solid #3a3a3e", borderRadius: "8px", padding: "20px", textDecoration: "none", display: "block" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>{a.icon}</div>
              <h4 style={{ color: "#ffffff", fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>{a.title}</h4>
              <p style={{ color: "#b0b0b0", fontSize: "13px" }}>{a.desc}</p>
            </a>
          ))}
        </div>

        <p style={{ color: "#666", fontSize: "12px", lineHeight: 1.5, textAlign: "center", marginTop: "48px" }}>Platzhalter – Dashboard-Funktionen folgen mit Supabase</p>
      </section>

      <Footer />
    </main>
  );
}

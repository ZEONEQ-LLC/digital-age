import Link from "next/link";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <section style={{ maxWidth: "640px", margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>📬</div>
        <h1 style={{ color: "var(--da-text)", fontSize: "36px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", marginBottom: "16px" }}>
          Danke für dein Interesse!
        </h1>
        <p style={{ color: "var(--da-muted)", fontSize: "18px", lineHeight: 1.6, marginBottom: "32px" }}>
          Wir haben deine Anmeldung erhalten. Sobald wir den E-Mail-Versand aufschalten,
          schicken wir dir eine Bestätigungs-Mail und du bekommst den ersten Newsletter.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{ backgroundColor: "var(--da-green)", color: "var(--da-dark)", padding: "12px 24px", borderRadius: "4px", textDecoration: "none", fontSize: "14px", fontWeight: 700 }}>
            Zur Startseite
          </Link>
          <Link href="/ki-im-business" style={{ backgroundColor: "transparent", color: "var(--da-green)", border: "1px solid var(--da-green)", padding: "12px 24px", borderRadius: "4px", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>
            Artikel entdecken
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

import Link from "next/link";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <section style={{ maxWidth: "640px", margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>👋</div>
        <h1
          style={{
            color: "var(--da-text)",
            fontSize: "36px",
            fontWeight: 700,
            fontFamily: "Space Grotesk, sans-serif",
            marginBottom: "16px",
          }}
        >
          Du bist abgemeldet
        </h1>
        <p style={{ color: "var(--da-muted)", fontSize: "18px", lineHeight: 1.6, marginBottom: "32px" }}>
          Schade, dass du gehst. Du erhältst keine Newsletter mehr von uns.
          Falls das ein Versehen war, kannst du dich jederzeit erneut anmelden.
        </p>
        <Link
          href="/newsletter"
          style={{
            backgroundColor: "var(--da-green)",
            color: "var(--da-dark)",
            padding: "12px 24px",
            borderRadius: "4px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 700,
            display: "inline-block",
          }}
        >
          Erneut anmelden
        </Link>
      </section>
      <Footer />
    </main>
  );
}

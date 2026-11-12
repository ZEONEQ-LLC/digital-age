import type { Metadata } from "next";
import Footer from "@/components/Footer";
import EndForwardingButton from "./EndForwardingButton";

// Link «Weiterleitung beenden» aus jeder weitergeleiteten Startup-Anfrage.
// Bewusst mit Knopf statt Sofort-Aktion: Link-Scanner in Mailprogrammen
// rufen Links vorab auf und duerfen nichts ausloesen.

export const metadata: Metadata = {
  title: "Weiterleitung beenden",
  robots: { index: false, follow: false },
};

type Params = Promise<{ token: string }>;

export default async function EndForwardingPage({ params }: { params: Params }) {
  const { token } = await params;
  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <section style={{ maxWidth: 640, margin: "0 auto", padding: "64px var(--gutter) 96px" }}>
        <h1
          style={{
            color: "var(--da-text)",
            fontFamily: "var(--da-font-display)",
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 700,
            lineHeight: 1.1,
            margin: "0 0 16px",
          }}
        >
          Anfragen nicht mehr weiterleiten
        </h1>
        <p style={{ color: "var(--da-muted)", fontSize: 16, lineHeight: 1.65, margin: "0 0 28px" }}>
          Wenn du bestätigst, leiten wir keine Anfragen über das Formular «Kontakt aufnehmen» mehr an euch weiter.
          Der Eintrag im Swiss-AI-Verzeichnis bleibt bestehen, nur das Formular verschwindet. Wieder einschalten
          könnt ihr es jederzeit über die Redaktion.
        </p>
        <EndForwardingButton token={token} />
      </section>
      <Footer />
    </main>
  );
}

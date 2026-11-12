import Link from "next/link";

// Abgelaufener Link: kein 404 (der Kunde hatte einen gueltigen Link), sondern
// ein Hinweis mit dem Weg zur Redaktion. Keine Zahlen, keine Kreative.
export default function ExpiredPreview({ campaignName, endedOn }: { campaignName: string; endedOn: string }) {
  return (
    <main style={{ background: "var(--da-dark)", minHeight: "100vh", padding: "48px 24px 64px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ color: "var(--da-faint)", fontSize: 10, fontWeight: 700, fontFamily: "var(--da-font-mono)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          digital-age · Vorschau
        </div>
        <h1 style={{ color: "var(--da-text)", fontFamily: "var(--da-font-display)", fontSize: 32, fontWeight: 700, margin: 0 }}>
          Diese Vorschau ist abgelaufen
        </h1>
        <p style={{ color: "var(--da-muted)", fontSize: 16, lineHeight: 1.6, margin: 0 }}>
          Ihre Kampagne «{campaignName}» endete am {endedOn}. Vorschau-Links bleiben 30 Tage nach dem Kampagnenende
          erreichbar. Die finalen Zahlen haben wir Ihnen per E-Mail geschickt.
        </p>
        <p style={{ color: "var(--da-muted)", fontSize: 16, lineHeight: 1.6, margin: 0 }}>
          Sie brauchen die Zahlen nochmals oder planen eine neue Kampagne?{" "}
          <Link href="/kontakt" style={{ color: "var(--da-green)", fontWeight: 600 }}>Schreiben Sie uns</Link>.
        </p>
      </div>
    </main>
  );
}

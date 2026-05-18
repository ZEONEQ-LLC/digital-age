// TEMPORAER — wird in A1b entfernt. Dient nur der Verifikation der
// AI-Infrastruktur (A1a) im Vercel-Preview.

import AiTestClient from "./AiTestClient";

export default function AiTestPage() {
  return (
    <main style={{ padding: "32px 24px", maxWidth: 720, margin: "0 auto" }}>
      <h1
        style={{
          color: "var(--da-text)",
          fontFamily: "var(--da-font-display)",
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        AI-Smoke-Test
      </h1>
      <p
        style={{
          color: "var(--da-muted)",
          fontSize: 14,
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        Verifikation der AI-Infrastruktur (Phase 11 / A1a). Diese Seite und
        die zugehörige Server-Action werden in A1b wieder entfernt.
      </p>
      <AiTestClient />
    </main>
  );
}

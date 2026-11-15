import Link from "next/link";

// Kleine Hinweise der Beitragsvorschau (ohne eigene Logik).

// Abgelaufener Link: kein 404 (der Link war gueltig), sondern ein Satz dazu.
export function PreviewExpired() {
  return (
    <main style={{ background: "var(--da-dark)", minHeight: "100vh", padding: "calc(var(--nav-h) + var(--ticker-h) + 64px) var(--gutter) 96px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <p style={{ color: "var(--da-orange)", fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>Vorschau</p>
        <h1 style={{ color: "var(--da-text)", fontFamily: "var(--da-font-display)", fontSize: 34, fontWeight: 700, lineHeight: 1.2, margin: "0 0 16px" }}>
          Dieser Vorschau-Link ist abgelaufen
        </h1>
        <p style={{ color: "var(--da-muted)", fontSize: 17, lineHeight: 1.6, margin: 0 }}>
          Vorschau-Links gelten 30 Tage. Bitte die Redaktion um einen neuen Link, oder{" "}
          <Link href="/kontakt" style={{ color: "var(--da-green)", fontWeight: 600 }}>schreib uns</Link>.
        </p>
      </div>
    </main>
  );
}

// Leiste am unteren Rand, wenn die Entwurfsvorschau in einem eigenen Tab
// offen ist (im Editor eingebettet steht der Hinweis in dessen Werkzeugleiste).
export function DraftPreviewBar({ articleId }: { articleId: string }) {
  return (
    <>
      <style>{`
        body { padding-bottom: 48px; }
        .dpb { position: fixed; left: 0; right: 0; bottom: 0; z-index: 150; background: var(--da-darker); border-top: 1px solid var(--da-border); }
        .dpb__in { max-width: 1200px; margin: 0 auto; padding: 0 var(--gutter); min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); }
        .dpb__text { color: var(--da-text-strong); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dpb__text b { color: var(--da-orange); font-weight: 700; }
        .dpb__go { color: var(--da-green); font-size: 14px; font-weight: 700; text-decoration: none; white-space: nowrap; }
        .dpb__go:hover { text-decoration: underline; }
      `}</style>
      <div className="dpb" role="note">
        <div className="dpb__in">
          <span className="dpb__text"><b>Vorschau</b> · gespeicherter Stand, nur mit Login sichtbar</span>
          <Link className="dpb__go" href={`/autor/artikel/${articleId}`}>Im Editor öffnen</Link>
        </div>
      </div>
    </>
  );
}

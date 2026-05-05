type Swatch = { token: string; hex: string; note?: string };

const brandSwatches: Swatch[] = [
  { token: "--da-green", hex: "#32ff7e", note: "Primär · Action, Live" },
  { token: "--da-orange", hex: "#ff8c42", note: "Sekundär · In Review" },
  { token: "--da-purple", hex: "#dcd6f7", note: "Tertiär · AI, Future Tech" },
  { token: "--da-red", hex: "#ff5c5c", note: "Error" },
];

const surfaceSwatches: Swatch[] = [
  { token: "--da-dark", hex: "#1c1c1e", note: "Page Background" },
  { token: "--da-darker", hex: "#161618", note: "Sidebar / Deep Nav" },
  { token: "--da-card", hex: "#2a2a2e", note: "Card / Panel" },
  { token: "--da-footer", hex: "#111113", note: "Footer" },
  { token: "--da-border", hex: "#3a3a3e", note: "Divider, Card Border" },
];

const textSwatches: Swatch[] = [
  { token: "--da-text", hex: "#ffffff", note: "Headings, primary" },
  { token: "--da-text-strong", hex: "#e0e0e0", note: "Secondary body" },
  { token: "--da-muted", hex: "#b0b0b0", note: "Muted body" },
  { token: "--da-muted-soft", hex: "#888888", note: "Captions" },
  { token: "--da-faint", hex: "#555555", note: "Placeholder, disabled" },
];

function SwatchRow({ swatches }: { swatches: Swatch[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--sp-4)" }}>
      {swatches.map((s) => (
        <div key={s.token} className="da-card" style={{ padding: "var(--sp-4)" }}>
          <div
            style={{
              width: "100%",
              height: "64px",
              background: `var(${s.token})`,
              border: "1px solid var(--da-border)",
              borderRadius: "var(--r-md)",
              marginBottom: "var(--sp-3)",
            }}
          />
          <div className="da-mono" style={{ fontSize: "var(--fs-meta)", color: "var(--da-text)" }}>
            {s.token}
          </div>
          <div className="da-mono" style={{ fontSize: "var(--fs-caption)", color: "var(--da-muted)" }}>
            {s.hex}
          </div>
          {s.note && (
            <div style={{ fontSize: "var(--fs-meta)", color: "var(--da-muted-soft)", marginTop: "var(--sp-1)" }}>
              {s.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "var(--sp-20)" }}>
      <div className="da-overline" style={{ marginBottom: "var(--sp-3)" }}>{label}</div>
      {children}
    </section>
  );
}

export default function DesignTest() {
  return (
    <main style={{ paddingTop: "calc(var(--nav-h) + var(--sp-8))", paddingBottom: "var(--sp-20)", minHeight: "100vh" }}>
      {/* Internal banner */}
      <div
        style={{
          background: "var(--st-warning-bg)",
          color: "var(--da-orange)",
          borderBottom: "1px solid var(--da-orange)",
          padding: "var(--sp-3) var(--sp-8)",
          fontFamily: "var(--da-font-mono)",
          fontSize: "var(--fs-meta)",
          textAlign: "center",
          letterSpacing: "0.04em",
        }}
      >
        INTERNAL · Design-System Reference · wird nach Phase 6 evtl. entfernt
      </div>

      <div className="da-container" style={{ paddingTop: "var(--sp-12)" }}>
        <header style={{ marginBottom: "var(--sp-16)" }}>
          <div className="da-overline" style={{ marginBottom: "var(--sp-3)" }}>Design Tokens</div>
          <h1 className="da-h1">digital-age — Design System</h1>
          <p className="da-lead" style={{ marginTop: "var(--sp-3)", maxWidth: "640px" }}>
            Single-Page-Referenz für alle <span className="da-mono">--da-*</span> Tokens, Component-Klassen
            und Typography-Scale.
          </p>
        </header>

        {/* Typography */}
        <Section label="Typography">
          <div className="da-stack">
            <div>
              <div className="da-overline">overline · 10px · mono · 0.12em</div>
              <p style={{ color: "var(--da-muted-soft)", fontSize: "var(--fs-meta)" }}>
                Mono-Caption über Headings (editorial marker).
              </p>
            </div>
            <div className="da-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
              <div>
                <span className="da-overline">display · 34 / 1.1</span>
                <h1 className="da-h1" style={{ marginTop: "var(--sp-2)" }}>KI verändert die Zukunft.</h1>
              </div>
              <div>
                <span className="da-overline">h2 · 28 / 1.3</span>
                <h2 className="da-h2" style={{ marginTop: "var(--sp-2)" }}>Aktuelle Artikel aus der DACH-Region</h2>
              </div>
              <div>
                <span className="da-overline">h3 · 22 / 1.3</span>
                <h3 className="da-h3" style={{ marginTop: "var(--sp-2)" }}>Swiss Hosted GPT — was Unternehmen wissen müssen</h3>
              </div>
              <div>
                <span className="da-overline">h4 · 18 · inter 600</span>
                <h4 style={{ marginTop: "var(--sp-2)" }}>Sektion ohne Display-Charakter</h4>
              </div>
              <div>
                <span className="da-overline">lead · 16 / 1.7</span>
                <p className="da-lead" style={{ marginTop: "var(--sp-2)", maxWidth: "560px" }}>
                  Lead-Paragraph für Artikel-Intros. Etwas grösser, etwas mehr Luft, aber noch keine Heading-Energie.
                </p>
              </div>
              <div>
                <span className="da-overline">body · 14 / 1.7</span>
                <p className="da-body" style={{ marginTop: "var(--sp-2)", maxWidth: "560px" }}>
                  Standard-Body-Text. Inter 400/500 — niemals 300 für Fliesstext (zu dünn auf dunklem Grund).
                </p>
              </div>
              <div>
                <span className="da-overline">meta · 12 · mono</span>
                <p className="da-meta" style={{ marginTop: "var(--sp-2)" }}>
                  03.04.2025 · 8 min Lesezeit · Künstliche Intelligenz
                </p>
              </div>
              <div>
                <span className="da-overline">muted</span>
                <p className="da-muted" style={{ marginTop: "var(--sp-2)" }}>
                  Captions, sub-headings, supporting text.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Brand Colors */}
        <Section label="Brand Colors">
          <SwatchRow swatches={brandSwatches} />
        </Section>

        {/* Surface */}
        <Section label="Surface">
          <SwatchRow swatches={surfaceSwatches} />
        </Section>

        {/* Text */}
        <Section label="Text">
          <SwatchRow swatches={textSwatches} />
        </Section>

        {/* Buttons */}
        <Section label="Buttons">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-3)", alignItems: "center" }}>
            <button className="da-btn da-btn--primary">Primary CTA</button>
            <button className="da-btn da-btn--secondary">Secondary</button>
            <button className="da-btn da-btn--ai">✨ AI Action</button>
            <button className="da-btn da-btn--ghost">Ghost</button>
            <button className="da-btn da-btn--primary da-btn--sm">Primary · sm</button>
            <button className="da-btn da-btn--secondary da-btn--sm">Secondary · sm</button>
          </div>
        </Section>

        {/* Cards */}
        <Section label="Cards">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "var(--sp-4)" }}>
            <div className="da-card">
              <div className="da-overline">default</div>
              <h4 style={{ marginTop: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>Standard Card</h4>
              <p className="da-muted" style={{ fontSize: "var(--fs-body)" }}>
                Border in <span className="da-mono">--da-border</span>, Padding 24px.
              </p>
            </div>
            <div className="da-card da-card--accent">
              <div className="da-overline" style={{ color: "var(--da-green)" }}>accent · green</div>
              <h4 style={{ marginTop: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>Veröffentlicht</h4>
              <p className="da-muted" style={{ fontSize: "var(--fs-body)" }}>Border-Color = primary accent.</p>
            </div>
            <div className="da-card da-card--accent-orange">
              <div className="da-overline" style={{ color: "var(--da-orange)" }}>accent · orange</div>
              <h4 style={{ marginTop: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>In Review</h4>
              <p className="da-muted" style={{ fontSize: "var(--fs-body)" }}>Sekundär-Akzent für Status.</p>
            </div>
            <div className="da-card da-card--accent-purple">
              <div className="da-overline" style={{ color: "var(--da-purple)" }}>accent · purple</div>
              <h4 style={{ marginTop: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>AI Feature</h4>
              <p className="da-muted" style={{ fontSize: "var(--fs-body)" }}>Tertiär-Akzent für AI-Sektionen.</p>
            </div>
          </div>
        </Section>

        {/* Badges */}
        <Section label="Badges">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-3)", alignItems: "center" }}>
            <span className="da-badge da-badge--success">Veröffentlicht</span>
            <span className="da-badge da-badge--warning">In Review</span>
            <span className="da-badge da-badge--info">Entwurf</span>
            <span className="da-badge da-badge--error">Änderungen angefr.</span>
            <span className="da-badge da-badge--neutral">Neutral</span>
            <span className="da-tag">#tag</span>
            <span className="da-tag">#kategorie</span>
          </div>
        </Section>

        {/* Input */}
        <Section label="Input">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--sp-4)", maxWidth: "640px" }}>
            <div>
              <div className="da-overline" style={{ marginBottom: "var(--sp-2)" }}>default</div>
              <input className="da-input" placeholder="E-Mail-Adresse" />
            </div>
            <div>
              <div className="da-overline" style={{ marginBottom: "var(--sp-2)" }}>focus (static)</div>
              <input
                className="da-input"
                placeholder="Klick mich, oder schau hier"
                style={{ borderColor: "var(--da-green)" }}
              />
            </div>
          </div>
        </Section>

        {/* Section Header */}
        <Section label="Section Header">
          <header className="da-section-header">
            <div className="da-section-header__title">
              <span className="da-section-header__bar" />
              <h3 className="da-h3">Aktuelle Artikel</h3>
            </div>
            <a href="#" style={{ color: "var(--da-green)", fontSize: "var(--fs-body-sm)", fontWeight: 600 }}>
              Alle ansehen →
            </a>
          </header>
        </Section>
      </div>
    </main>
  );
}

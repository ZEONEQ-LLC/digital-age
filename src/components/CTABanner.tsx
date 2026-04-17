export default function CTABanner() {
  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .cta-inner { flex-direction: column !important; text-align: center !important; }
          .cta-inner h2 { font-size: 24px !important; }
          .cta-inner a { width: 100% !important; text-align: center !important; }
        }
      `}</style>
      <section style={{ backgroundColor: "#32ff7e", margin: "64px 0 0", padding: "64px 32px" }}>
        <div className="cta-inner" style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "32px" }}>
          <div>
            <h2 style={{ color: "#1c1c1e", fontSize: "32px", fontWeight: 700, marginBottom: "12px" }}>
              Publiziere deinen KI-Content auf digital age
            </h2>
            <p style={{ color: "#1c1c1e", fontSize: "16px", lineHeight: 1.6, maxWidth: "600px", opacity: 0.8 }}>
              Hast du spannende Einblicke, innovative Ideen oder praxisnahe Erfahrungen im Bereich Künstliche Intelligenz, Future Tech oder digitale Transformation? Teile dein Wissen mit einer relevanten Zielgruppe in der DACH-Region!
            </p>
          </div>
          <a href="/kontakt" style={{ backgroundColor: "#1c1c1e", color: "#32ff7e", fontSize: "16px", fontWeight: 600, padding: "16px 32px", borderRadius: "4px", textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}>
            Jetzt Veröffentlichen →
          </a>
        </div>
      </section>
    </>
  );
}

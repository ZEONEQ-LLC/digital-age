"use client";
import Image from "next/image";
import Link from "next/link";
import NewsletterSignup from "./NewsletterSignup";

export default function Footer() {
  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .footer-wrapper { padding: 40px 16px 24px !important; }
        }
      `}</style>
      <footer style={{ backgroundColor: "var(--da-footer)", borderTop: "1px solid var(--da-card)", marginTop: "0" }}>
        <div className="footer-wrapper" style={{ maxWidth: "1200px", margin: "0 auto", padding: "64px 32px 32px" }}>
          <div style={{ backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: "8px", padding: "32px", marginBottom: "48px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "24px" }}>
            <div style={{ flex: "1 1 300px" }}>
              <p style={{ color: "var(--da-green)", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>📬 Newsletter</p>
              <h3 style={{ color: "var(--da-text)", fontSize: "20px", fontWeight: 600, marginBottom: "4px", fontFamily: "Space Grotesk, sans-serif" }}>Die Woche in KI — direkt in deine Inbox</h3>
              <p style={{ color: "var(--da-muted)", fontSize: "13px" }}>1× pro Woche, 5 min Lesezeit, jederzeit kündbar.</p>
            </div>
            <div style={{ flex: "1 1 320px" }}>
              <NewsletterSignup variant="compact" />
            </div>
          </div>
          <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "48px", marginBottom: "48px" }}>
            {/* Logo + Description */}
            <div>
              <Image src="/images/digital age Logo green.png" alt="digital age" width={420} height={260} priority style={{ height: "48px", width: "auto", marginBottom: "20px" }} />
              <p style={{ color: "var(--da-muted)", fontSize: "14px", lineHeight: 1.7, maxWidth: "320px" }}>
                KI & Future Tech für die DACH-Region. Verstehe Technologie, erkenne Chancen, sei der Wandel.
              </p>
              <a href="https://www.linkedin.com/company/digital-age-schweiz" target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--da-green)", fontSize: "14px", fontWeight: 600, textDecoration: "none", marginTop: "20px" }}>
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                Folge digital age auf LinkedIn
              </a>
            </div>

            {/* Themen */}
            <div>
              <h4 style={{ color: "var(--da-text)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "20px" }}>Themen</h4>
              <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { label: "KI & Business", href: "/ki-im-business" },
                  { label: "Future Tech", href: "/future-tech" },
                  { label: "KI-Plattformen", href: "/ki-plattformen" },
                  { label: "GenAI Prompts", href: "/ai-prompts" },
                  { label: "Podcasts", href: "/podcasts" },
                ].map(({ label, href }) => (
                  <Link key={label} href={href} style={{ color: "var(--da-muted)", fontSize: "14px", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--da-green)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--da-muted)")}>
                    {label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Über uns */}
            <div>
              <h4 style={{ color: "var(--da-text)", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "20px" }}>Über uns</h4>
              <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[
                  { label: "Über digital age", href: "/ueber-uns" },
                  { label: "Redaktion", href: "/redaktion" },
                  { label: "Kontakt", href: "/kontakt" },
                  { label: "KI-Transparenz", href: "/ki-transparenz" },
                  { label: "Community-Richtlinien", href: "/community-richtlinien" },
                  { label: "Impressum", href: "/impressum" },
                  { label: "Datenschutzerklärung", href: "/datenschutzerklaerung" },
                ].map(({ label, href }) => (
                  <Link key={label} href={href} style={{ color: "var(--da-muted)", fontSize: "14px", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--da-green)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--da-muted)")}>
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid var(--da-card)", paddingTop: "32px" }}>
            <p style={{ color: "var(--da-muted-soft)", fontSize: "13px", lineHeight: 1.7 }}>
              © 2026 digital-age.ch | Alle Rechte vorbehalten.
            </p>
            <p style={{ color: "var(--da-muted-soft)", fontSize: "13px", lineHeight: 1.7 }}>
              Die Inhalte dieser Webseite sind urheberrechtlich geschützt. Ohne ausdrückliche Zustimmung von digital-age.ch dürfen Inhalte weder kopiert, verändert, verbreitet noch anderweitig genutzt werden.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
} from "@react-email/components";
import type { ReactNode } from "react";

// Geteilte Basis für alle Newsletter/Invite-Mails.
//
// Light-Default-Styles inline an den Komponenten. Dark-Mode-Override via
// @media (prefers-color-scheme: dark) im <Head>, mit `!important` auf
// jeder Color-Property — Inline-Styles haben sonst höhere Spezifität.
//
// Semantische Klassen-Namen (konsistent über alle Templates):
//   .body-bg      — äusserste Hülle
//   .container    — Mail-Karte
//   .heading      — H1
//   .text-primary — Body-Text
//   .text-muted   — kleinere/schwächere Hinweise
//   .cta-button   — Primary-Action-Button
//   .accent-link  — Inline-Akzent-Links (z.B. „.ch" im Logo)
//   .hint-box     — Box für „Achtung"-Hinweise
//   .hint-strong  — Headline innerhalb hint-box
//   .hint-text    — Body innerhalb hint-box
//   .footer-text  — Footer (Copyright, Links)
//   .url-text     — kopier-Fallback-URL (monospace)
//
// Light-Mode-Default-Werte (sind Inline gesetzt):
//   Body-BG       #f4f4f5
//   Container-BG  #ffffff
//   Text-Primary  #1c1c1e
//   Text-Muted    #52525b
//   CTA-BG/FG     #1c1c1e / #ffffff
//   Accent        #16a34a
//   Hint-BG/FG    #fef3c7 / #92400e (Akzent: orange-700)

export type LayoutProps = {
  previewText: string;
  children: ReactNode;
};

// CSS-Block für den <Head>. Enthält color-scheme-Hint + Dark-Mode-Overrides.
// Wird als <style> via <Head>-children eingebunden.
const HEAD_CSS = `
  :root {
    color-scheme: light dark;
    supported-color-schemes: light dark;
  }
  /* Apple-Mail-Adaptive-Hint (verhindert Force-Auto-Inversion). */
  :root[data-supported-color-schemes="light dark"] {
    color-scheme: light dark;
  }
  /* Outlook Web Hard-Dark-Mode-Schutz: alle Tabellen behalten ihre
   * Inline-Backgrounds. */
  [data-ogsc] .body-bg,
  [data-ogsc] .container,
  [data-ogsc] .cta-button,
  [data-ogsc] .hint-box { background-color: inherit !important; }

  @media (prefers-color-scheme: dark) {
    .body-bg { background-color: #1c1c1e !important; }
    .container { background-color: #26262a !important; }
    .heading, .text-primary { color: #ffffff !important; }
    .text-muted { color: #c4c4c8 !important; }
    .cta-button {
      background-color: #32ff7e !important;
      color: #1c1c1e !important;
    }
    .accent-link { color: #32ff7e !important; }
    .hint-box {
      background-color: #1c1c1e !important;
      border-left-color: #ff8c42 !important;
    }
    .hint-strong { color: #ff8c42 !important; }
    .hint-text { color: #c4c4c8 !important; }
    .footer-text { color: #8a8a90 !important; }
    .footer-text a { color: #c4c4c8 !important; }
    .url-text { color: #dcd6f7 !important; }
    .divider { border-color: #3f3f46 !important; }
  }
`;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://digital-age-v2-eight.vercel.app";

const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_DISPLAY = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export default function Layout({ previewText, children }: LayoutProps) {
  return (
    <Html lang="de">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="format-detection"
          content="telephone=no, date=no, address=no, email=no"
        />
        <style dangerouslySetInnerHTML={{ __html: HEAD_CSS }} />
      </Head>
      <Preview>{previewText}</Preview>
      <Body
        className="body-bg"
        style={{
          backgroundColor: "#f4f4f5",
          margin: 0,
          padding: "32px 16px",
          fontFamily: FONT_BODY,
          WebkitTextSizeAdjust: "100%",
        }}
      >
          <Container
            className="container"
            style={{
              maxWidth: 560,
              margin: "0 auto",
              backgroundColor: "#ffffff",
              borderRadius: 8,
              padding: "40px 32px",
            }}
          >
            <Section style={{ marginBottom: 28 }}>
              <Link
                href={SITE_URL}
                className="text-primary"
                style={{
                  color: "#1c1c1e",
                  fontFamily: FONT_DISPLAY,
                  fontSize: 22,
                  fontWeight: 700,
                  textDecoration: "none",
                  letterSpacing: "-0.01em",
                }}
              >
                digital-age
                <span
                  className="accent-link"
                  style={{ color: "#16a34a", fontWeight: 700 }}
                >
                  .ch
                </span>
              </Link>
            </Section>

            {children}

            <Hr
              className="divider"
              style={{
                borderTop: "1px solid #e4e4e7",
                borderBottom: "none",
                borderLeft: "none",
                borderRight: "none",
                marginTop: 32,
                marginBottom: 20,
              }}
            />
            <Section>
              <p
                className="footer-text"
                style={{
                  color: "#71717a",
                  fontSize: 12,
                  lineHeight: 1.6,
                  margin: 0,
                  fontFamily: FONT_BODY,
                }}
              >
                digital-age — News &amp; Analysen zu KI und Future Tech.
                <br />
                <Link
                  href={`${SITE_URL}/impressum`}
                  className="footer-text"
                  style={{ color: "#71717a", textDecoration: "underline" }}
                >
                  Impressum
                </Link>{" "}
                ·{" "}
                <Link
                  href={`${SITE_URL}/datenschutzerklaerung`}
                  className="footer-text"
                  style={{ color: "#71717a", textDecoration: "underline" }}
                >
                  Datenschutz
                </Link>
              </p>
            </Section>
          </Container>
        </Body>
    </Html>
  );
}

// Wiederverwendbare Subkomponenten — werden von den konkreten Templates
// importiert, damit die Klassen-Namen + Inline-Defaults zentral bleiben.

export function Heading({ children }: { children: ReactNode }) {
  return (
    <h1
      className="heading"
      style={{
        color: "#1c1c1e",
        fontFamily: FONT_DISPLAY,
        fontSize: 26,
        fontWeight: 700,
        lineHeight: 1.25,
        margin: "0 0 16px",
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </h1>
  );
}

export function Paragraph({
  children,
  muted = false,
  small = false,
  mono = false,
  className,
}: {
  children: ReactNode;
  muted?: boolean;
  small?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <p
      className={className ?? (muted ? "text-muted" : "text-primary")}
      style={{
        color: muted ? "#52525b" : "#1c1c1e",
        fontSize: small ? 13 : 15,
        lineHeight: 1.65,
        margin: "0 0 16px",
        fontFamily: mono
          ? "'Roboto Mono', Menlo, Consolas, monospace"
          : FONT_BODY,
        wordBreak: mono ? "break-all" : "normal",
      }}
    >
      {children}
    </p>
  );
}

export function CtaButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Section style={{ margin: "24px 0 28px" }}>
      <Link
        href={href}
        className="cta-button"
        style={{
          display: "inline-block",
          backgroundColor: "#1c1c1e",
          color: "#ffffff",
          fontFamily: FONT_BODY,
          fontSize: 15,
          fontWeight: 700,
          padding: "13px 22px",
          borderRadius: 6,
          textDecoration: "none",
          letterSpacing: "0.01em",
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

export function HintBox({ children }: { children: ReactNode }) {
  return (
    <Section
      className="hint-box"
      style={{
        backgroundColor: "#fef3c7",
        borderLeft: "3px solid #d97706",
        padding: "12px 16px",
        margin: "20px 0 8px",
        borderRadius: "0 6px 6px 0",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.6,
          fontFamily: FONT_BODY,
        }}
      >
        {children}
      </p>
    </Section>
  );
}

export function UrlFallback({ url }: { url: string }) {
  return (
    <p
      className="url-text"
      style={{
        color: "#52525b",
        fontFamily: "'Roboto Mono', Menlo, Consolas, monospace",
        fontSize: 12,
        lineHeight: 1.5,
        margin: "0 0 16px",
        wordBreak: "break-all",
      }}
    >
      {url}
    </p>
  );
}

export { SITE_URL };

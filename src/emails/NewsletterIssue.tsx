import { Img, Link, Section } from "react-email";
import Layout, { Paragraph } from "./_layout";
import { trackedArticleUrl, type IssueItem } from "@/lib/newsletter/issue";

// Woechentlicher Newsletter (PR 195): Einleitung, dann pro Artikel Bild,
// Rubrik, Titel, Kurztext und Link (mit UTM fuer GA4). Abmeldelink in der
// Fusszeile; das HTML wird einmal gerendert und pro Empfaenger
// personalisiert (UNSUBSCRIBE_PLACEHOLDER in unsubscribeUrl).
export type NewsletterIssueProps = {
  subject: string;
  intro: string;
  items: IssueItem[];
  dateText: string;          // «16.11.2026»
  campaign: string;          // UTM-Kampagne
  siteUrl: string;
  unsubscribeUrl: string;
  test?: boolean;
};

const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_DISPLAY = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_MONO = "'Roboto Mono', Menlo, Consolas, monospace";

export default function NewsletterIssue(p: NewsletterIssueProps) {
  return (
    <Layout
      previewText={p.intro.slice(0, 140)}
      footerExtra={
        <>
          Du bekommst diese E-Mail, weil du den Newsletter von digital-age abonniert hast.{" "}
          <Link href={p.unsubscribeUrl} className="footer-text" style={{ color: "#71717a", textDecoration: "underline" }}>
            Abmelden
          </Link>
        </>
      }
    >
      {p.test && (
        <Paragraph muted small>
          TESTVERSAND · Der Abmeldelink ist in dieser Testmail ohne Funktion.
        </Paragraph>
      )}
      <p
        className="text-muted"
        style={{ color: "#52525b", fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 10px" }}
      >
        Newsletter · {p.dateText}
      </p>
      <h1
        className="heading"
        style={{ color: "#1c1c1e", fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, lineHeight: 1.3, margin: "0 0 16px", letterSpacing: "-0.01em" }}
      >
        {p.subject}
      </h1>
      <Paragraph>{p.intro}</Paragraph>

      {p.items.map((it) => {
        const href = trackedArticleUrl(p.siteUrl, it.slug, p.campaign);
        return (
          <Section key={it.articleId} style={{ margin: "28px 0 0" }}>
            {it.coverUrl && (
              <Link href={href}>
                <Img
                  src={it.coverUrl}
                  alt=""
                  width="496"
                  style={{ width: "100%", maxWidth: 496, height: "auto", borderRadius: 6, display: "block", margin: "0 0 12px" }}
                />
              </Link>
            )}
            {it.category && (
              <p
                className="accent-link"
                style={{ color: "#16a34a", fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 6px" }}
              >
                {it.category}
              </p>
            )}
            <Link
              href={href}
              className="text-primary"
              style={{ color: "#1c1c1e", fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, lineHeight: 1.3, textDecoration: "none", display: "block", margin: "0 0 8px" }}
            >
              {it.title}
            </Link>
            <p className="text-primary" style={{ color: "#1c1c1e", fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.6, margin: "0 0 8px" }}>
              {it.teaser}
            </p>
            <Link href={href} className="accent-link" style={{ color: "#16a34a", fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              Weiterlesen →
            </Link>
          </Section>
        );
      })}

      <Section style={{ margin: "32px 0 0" }}>
        <Paragraph muted small>
          Fragen oder Hinweise? Antworte einfach auf diese E-Mail.
        </Paragraph>
      </Section>
    </Layout>
  );
}

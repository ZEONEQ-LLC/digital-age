import type { ReactNode } from "react";
import { Column, Img, Link, Row, Section } from "react-email";
import Layout, { Paragraph } from "./_layout";
import {
  EMPTY_SECTIONS,
  hasSections,
  trackedArticleUrl,
  trackedNewsUrl,
  trackedUrl,
  type IssueItem,
  type IssuePick,
  type IssueSections,
} from "@/lib/newsletter/issue";

// Woechentlicher Newsletter (PR 195): Einleitung, dann pro Artikel Bild,
// Rubrik, Titel, Kurztext und Link (mit UTM fuer GA4). Seit PR 203 danach die
// Rubriken «Die wichtigsten News der Woche», «Hype-Check», «Prompt der Woche»
// und «Podcast-Tipp»; leere Rubriken fallen weg. Abmeldelink in der
// Fusszeile; das HTML wird einmal gerendert und pro Empfaenger
// personalisiert (UNSUBSCRIBE_PLACEHOLDER in unsubscribeUrl).
export type NewsletterIssueProps = {
  subject: string;
  intro: string;
  items: IssueItem[];
  sections?: IssueSections;
  dateText: string;          // «16.11.2026»
  campaign: string;          // UTM-Kampagne
  siteUrl: string;
  unsubscribeUrl: string;
  test?: boolean;
};

const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_DISPLAY = "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_MONO = "'Roboto Mono', Menlo, Consolas, monospace";

const TEXT = "#1c1c1e";
const MUTED = "#52525b";
const ACCENT = "#16a34a";

// Abschnittskopf: feine Linie, darunter der Name der Rubrik.
function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <Section className="divider" style={{ borderTop: "1px solid #e4e4e7", margin: "40px 0 0", padding: "24px 0 0" }}>
      <h2 className="heading" style={{ color: TEXT, fontFamily: FONT_DISPLAY, fontSize: 21, fontWeight: 700, lineHeight: 1.3, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      {sub && (
        <p className="text-muted" style={{ color: MUTED, fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.5, margin: 0 }}>
          {sub}
        </p>
      )}
    </Section>
  );
}

function EntryTitle({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-primary"
      style={{ color: TEXT, fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, lineHeight: 1.35, textDecoration: "none", display: "block", margin: "0 0 6px" }}
    >
      {children}
    </Link>
  );
}

function Body({ children }: { children: ReactNode }) {
  return (
    <p className="text-primary" style={{ color: TEXT, fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.6, margin: "0 0 6px" }}>
      {children}
    </p>
  );
}

function Meta({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted" style={{ color: MUTED, fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
      {children}
    </p>
  );
}

function More({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="accent-link" style={{ color: ACCENT, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
      {children}
    </Link>
  );
}

function PickBlock({ pick, href, more }: { pick: IssuePick; href: string; more: string }) {
  const text = (
    <>
      {pick.label && <Meta>{pick.label}</Meta>}
      <div style={{ height: 4 }} />
      <EntryTitle href={href}>{pick.title}</EntryTitle>
      <Body>{pick.teaser}</Body>
      <More href={href}>{more}</More>
    </>
  );
  if (!pick.coverUrl) return <Section style={{ margin: "16px 0 0" }}>{text}</Section>;
  return (
    <Section style={{ margin: "16px 0 0" }}>
      <Row>
        <Column style={{ width: 88, verticalAlign: "top", paddingRight: 16 }}>
          <Link href={href}>
            <Img src={pick.coverUrl} alt="" width="88" height="88" style={{ width: 88, height: 88, borderRadius: 6, display: "block", objectFit: "cover" }} />
          </Link>
        </Column>
        <Column style={{ verticalAlign: "top" }}>{text}</Column>
      </Row>
    </Section>
  );
}

export default function NewsletterIssue(p: NewsletterIssueProps) {
  const s = p.sections ?? EMPTY_SECTIONS;
  const withSections = hasSections(s);
  const url = (path: string) => trackedUrl(p.siteUrl, path, p.campaign);
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

      {withSections && p.items.length > 0 && <SectionHead title="Neu auf digital age" />}
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

      {s.news.length > 0 && (
        <>
          <SectionHead title="Die wichtigsten News der Woche" sub="Aus dem News-Ticker von digital age, eingeordnet mit KI." />
          {s.news.map((n) => (
            <Section key={n.newsId} style={{ margin: "18px 0 0" }}>
              <EntryTitle href={trackedNewsUrl(p.siteUrl, n.anchor, p.campaign)}>{n.title}</EntryTitle>
              <Body>{n.why}</Body>
              <Meta>{[n.source, n.einordnung].filter(Boolean).join(" · ")}</Meta>
            </Section>
          ))}
          <Section style={{ margin: "18px 0 0" }}>
            <More href={url("/news")}>Alle News →</More>
          </Section>
        </>
      )}

      {s.hype && (
        <>
          <SectionHead title="Hype-Check" sub="Viel Echo, wenig Substanz? Eine Meldung der Woche, nüchtern betrachtet." />
          <Section style={{ margin: "18px 0 0" }}>
            <EntryTitle href={trackedNewsUrl(p.siteUrl, s.hype.anchor, p.campaign)}>{s.hype.title}</EntryTitle>
            <Body>{s.hype.text}</Body>
            {s.hype.source && <Meta>{s.hype.source}</Meta>}
          </Section>
        </>
      )}

      {s.prompt && (
        <>
          <SectionHead title="Prompt der Woche" />
          <PickBlock pick={s.prompt} href={url(`/ai-prompts/${encodeURIComponent(s.prompt.slug)}`)} more="Prompt ansehen →" />
        </>
      )}

      {s.podcast && (
        <>
          <SectionHead title="Podcast-Tipp" />
          <PickBlock pick={s.podcast} href={url(`/podcast/${encodeURIComponent(s.podcast.slug)}`)} more="Zur Folge →" />
        </>
      )}

      <Section style={{ margin: "40px 0 0" }}>
        <Paragraph muted small>
          Fragen oder Hinweise? Antworte einfach auf diese E-Mail.
        </Paragraph>
      </Section>
    </Layout>
  );
}

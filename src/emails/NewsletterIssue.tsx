import { Fragment, type ReactNode } from "react";
import { Column, Img, Link, Row, Section } from "react-email";
import Layout, { Paragraph } from "./_layout";
import { adLabel, adSlots, NEWSLETTER_AD_SIZE, type IssueAd } from "@/lib/newsletter/ads";
import {
  EMPTY_SECTIONS,
  UTM_CONTENT,
  hasSections,
  trackedArticleUrl,
  trackedNewsUrl,
  trackedShowcaseUrl,
  trackedUrl,
  type IssueItem,
  type IssuePick,
  type IssueSections,
  type UtmContent,
} from "@/lib/newsletter/issue";
import { showcaseLine, type IssueShowcase } from "@/lib/newsletter/showcase";

// Woechentlicher Newsletter (PR 195): Einleitung, dann pro Artikel Bild,
// Rubrik, Titel, Kurztext und Link (mit UTM fuer GA4). Seit PR 203 danach die
// Rubriken «Die wichtigsten News der Woche», «Hype-Check», «Prompt der Woche»
// und «Podcast-Tipp»; leere Rubriken fallen weg. Abmeldelink in der
// Fusszeile; das HTML wird einmal gerendert und pro Empfaenger
// personalisiert (UNSUBSCRIBE_PLACEHOLDER in unsubscribeUrl).
//
// Seit PR 214 stehen zwischen den Rubriken bis zu zwei Anzeigen
// (sections.ads): abgesetzte Flaeche mit der Zeile «Anzeige», Bild 300 x 250
// oder Text. Die erste nach dem ersten Inhaltsblock, die zweite weiter unten
// (adSlots). adLinks ersetzt im Versand das Ziel durch den Zaehl-Link.
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
  // Kampagne -> Link im Versand (Zaehl-Weiterleitung). Fehlt ein Eintrag,
  // fuehrt die Anzeige direkt zum Ziel (Vorschau, Test).
  adLinks?: Record<string, string>;
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

// Anzeige: abgesetzte Flaeche (in der Mail die einzige mit Hintergrund),
// darueber die Kennzeichnung. Presserat 10.1: Kennzeichnung und erkennbar
// andere Gestaltung als der redaktionelle Teil.
function AdBlock({ ad, href }: { ad: IssueAd; href: string }) {
  return (
    <Section className="card-box" style={{ backgroundColor: "#f4f4f5", borderRadius: 6, margin: "36px 0 0", padding: "14px 16px 18px" }}>
      <p
        className="text-muted"
        style={{ color: MUTED, fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 12px" }}
      >
        {adLabel(ad)}
      </p>
      {ad.kind === "image" && ad.imageUrl ? (
        <Link href={href} style={{ display: "block", textAlign: "center" }}>
          <Img
            src={ad.imageUrl}
            alt={ad.alt}
            width={String(NEWSLETTER_AD_SIZE.w)}
            height={String(NEWSLETTER_AD_SIZE.h)}
            style={{ width: NEWSLETTER_AD_SIZE.w, maxWidth: "100%", height: "auto", display: "block", margin: "0 auto", border: 0 }}
          />
        </Link>
      ) : (
        <>
          <EntryTitle href={href}>{ad.headline}</EntryTitle>
          {ad.body && <Body>{ad.body}</Body>}
          <More href={href}>{ad.cta || "Mehr erfahren"} →</More>
        </>
      )}
    </Section>
  );
}

// Showcase: gerahmt (Anzeigen haben Hintergrund, Redaktion nichts), Kopf und
// Hinweis innerhalb des Rahmens, damit die Kennzeichnung beim Eintrag bleibt.
function ShowcaseBlock({ entries, siteUrl, campaign }: { entries: IssueShowcase[]; siteUrl: string; campaign: string }) {
  return (
    <Section className="showcase-box" style={{ border: "1px solid #d4d4d8", borderRadius: 6, margin: "40px 0 0", padding: "20px 18px 22px" }}>
      <h2 className="heading" style={{ color: TEXT, fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, lineHeight: 1.3, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
        Aus dem Showcase
      </h2>
      <p className="text-muted" style={{ color: MUTED, fontFamily: FONT_BODY, fontSize: 13, lineHeight: 1.5, margin: 0 }}>
        Beiträge von Unternehmen aus dem Swiss-AI-Verzeichnis, als solche gekennzeichnet. Kein redaktioneller Inhalt.
      </p>
      {entries.map((e, i) => {
        const href = trackedShowcaseUrl(siteUrl, e.slug, campaign);
        return (
          <Section
            key={e.articleId}
            className={i > 0 ? "divider" : undefined}
            style={{ margin: "18px 0 0", padding: i > 0 ? "18px 0 0" : 0, borderTop: i > 0 ? "1px solid #e4e4e7" : "none" }}
          >
            <p
              className="text-muted"
              style={{ color: MUTED, fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 8px" }}
            >
              {showcaseLine(e)}
            </p>
            <EntryTitle href={href}>{e.title}</EntryTitle>
            <Body>{e.teaser}</Body>
            <More href={href}>Zum Beitrag →</More>
          </Section>
        );
      })}
    </Section>
  );
}

export default function NewsletterIssue(p: NewsletterIssueProps) {
  const s = p.sections ?? EMPTY_SECTIONS;
  const withSections = hasSections(s);
  const url = (path: string, content: UtmContent) => trackedUrl(p.siteUrl, path, p.campaign, "", content);

  // Inhaltsbloecke in der Reihenfolge der Mail; leere fallen weg. Die
  // Anzeigen stehen dazwischen.
  const blocks: { key: string; node: ReactNode }[] = [];

  if (p.items.length > 0) {
    blocks.push({
      key: "articles",
      node: (
        <>
          {withSections && <SectionHead title="Neu auf digital age" />}
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
        </>
      ),
    });
  }

  if (s.news.length > 0) {
    blocks.push({
      key: "news",
      node: (
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
            <More href={url("/news", UTM_CONTENT.allNews)}>Alle News →</More>
          </Section>
        </>
      ),
    });
  }

  if (s.hype) {
    blocks.push({
      key: "hype",
      node: (
        <>
          <SectionHead title="Hype-Check" sub="Viel Echo, wenig Substanz? Eine Meldung der Woche, nüchtern betrachtet." />
          <Section style={{ margin: "18px 0 0" }}>
            <EntryTitle href={trackedNewsUrl(p.siteUrl, s.hype.anchor, p.campaign, UTM_CONTENT.hype)}>{s.hype.title}</EntryTitle>
            <Body>{s.hype.text}</Body>
            {s.hype.source && <Meta>{s.hype.source}</Meta>}
          </Section>
        </>
      ),
    });
  }

  if (s.prompt) {
    blocks.push({
      key: "prompt",
      node: (
        <>
          <SectionHead title="Prompt der Woche" />
          <PickBlock pick={s.prompt} href={url(`/ai-prompts/${encodeURIComponent(s.prompt.slug)}`, UTM_CONTENT.prompt)} more="Prompt ansehen →" />
        </>
      ),
    });
  }

  if (s.podcast) {
    blocks.push({
      key: "podcast",
      node: (
        <>
          <SectionHead title="Podcast-Tipp" />
          <PickBlock pick={s.podcast} href={url(`/podcast/${encodeURIComponent(s.podcast.slug)}`, UTM_CONTENT.podcast)} more="Zur Folge →" />
        </>
      ),
    });
  }

  const slots = adSlots(blocks.length, s.ads.length);
  const adsAfter = (index: number) =>
    s.ads.map((ad, i) =>
      slots[i] === index ? <AdBlock key={ad.campaignId} ad={ad} href={p.adLinks?.[ad.campaignId] ?? ad.href} /> : null,
    );

  return (
    <Layout
      previewText={p.intro.slice(0, 140)}
      footerExtra={
        <>
          Du bekommst diese E-Mail, weil du den Newsletter von digital age abonniert hast oder für digital age schreibst.{" "}
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
      {adsAfter(-1)}

      {blocks.map((block, i) => (
        <Fragment key={block.key}>
          {block.node}
          {adsAfter(i)}
        </Fragment>
      ))}

      {s.showcase.length > 0 && <ShowcaseBlock entries={s.showcase} siteUrl={p.siteUrl} campaign={p.campaign} />}

      <Section style={{ margin: "40px 0 0" }}>
        <Paragraph muted small>
          Fragen oder Hinweise? Antworte einfach auf diese E-Mail.
        </Paragraph>
      </Section>
    </Layout>
  );
}

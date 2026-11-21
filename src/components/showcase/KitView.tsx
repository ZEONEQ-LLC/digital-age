import Link from "next/link";

import KitCopy from "@/components/showcase/KitCopy";
import QuestionnaireShell from "@/components/showcase/QuestionnaireShell";
import { contentTypeLabel } from "@/lib/contentType";
import { SITE_URL } from "@/lib/newsletter/mail";
import {
  BADGE_HEIGHT,
  BADGE_PATH,
  BADGE_WIDTH,
  REPORT_AFTER_DAYS,
  badgeSnippet,
  formatDuration,
  kitShareUrl,
  reportUntil,
  sumFigures,
  teaserImagePath,
  zurichDate,
} from "@/lib/showcase/kit";
import type { Kit, KitArticle } from "@/lib/showcase/kitApi";
import { formatLongDate } from "@/lib/showcase/questionnaire";

// Showcase S4: Inhalt des Teil-Kits. Ohne Datenzugriff (Daten kommen von der
// Seite /showcase/teilen/<token>), damit eine Mock-Route ihn pruefen kann.
export default function KitView({ kit, article, today }: { kit: Kit; article: KitArticle & { published_at: string }; today: string }) {
  const { company } = kit;
  const label = contentTypeLabel(article) ?? "Unternehmensbeitrag";
  const articleUrl = `${SITE_URL}/showcase/${article.slug}`;
  const linkedinUrl = kitShareUrl(SITE_URL, article.slug, "linkedin");
  const websiteUrl = kitShareUrl(SITE_URL, article.slug, "website");
  const mailUrl = kitShareUrl(SITE_URL, article.slug, "email");
  const imagePath = teaserImagePath(article.slug);
  const snippet = badgeSnippet(SITE_URL, article.slug, company.name);

  // Zahlen bis gestern: der laufende Tag ist noch nicht fertig.
  const figures = sumFigures(kit.stats.filter((r) => r.day < today));
  const until = reportUntil(article.published_at);
  const reportPending = today <= until;

  return (
    <QuestionnaireShell>
      <style>{`
        .kit-copy { background: none; border: 1px solid var(--da-border); color: var(--da-text); font-size: 13.5px; font-weight: 600; padding: 7px 14px; border-radius: var(--r-sm); cursor: pointer; white-space: nowrap; }
        .kit-copy:hover, .kit-copy:focus-visible { border-color: var(--da-green); }
        .kit-figs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; border-top: 1px solid var(--da-border); border-bottom: 1px solid var(--da-border); }
        .kit-fig { padding: 18px 16px 18px 0; }
        .kit-fig + .kit-fig { padding-left: 16px; border-left: 1px solid var(--da-border); }
        .kit-fig b { display: block; color: var(--da-text); font-family: var(--da-font-display); font-size: 32px; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; }
        .kit-fig span { color: var(--da-muted); font-size: 13.5px; line-height: 1.4; }
        .kit-src { margin: 20px 0 0; padding: 0; list-style: none; max-width: 460px; }
        .kit-src li { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0; border-bottom: 1px solid var(--da-border); color: var(--da-text-strong); font-size: 14.5px; }
        .kit-src li span:last-child { font-variant-numeric: tabular-nums; color: var(--da-text); }
        .kit-note { color: var(--da-muted); font-size: 13.5px; line-height: 1.55; margin: 16px 0 0; max-width: 62ch; }
        .kit-img { display: block; width: 100%; height: auto; border: 1px solid var(--da-border); }
        .kit-actions { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin-top: 14px; }
        .kit-actions a { color: var(--da-text-strong); font-size: 14.5px; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--da-border); }
        .kit-actions a:hover { color: var(--da-text); text-decoration-color: var(--da-green); }
        .kit-post { border-top: 1px solid var(--da-border); padding: 18px 0; }
        .kit-post:last-of-type { border-bottom: 1px solid var(--da-border); }
        .kit-post__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px; }
        .kit-post__head span { color: var(--da-muted-soft); font-size: 13px; font-weight: 600; letter-spacing: 0.04em; }
        .kit-post p { color: var(--da-text-strong); font-size: 15.5px; line-height: 1.6; margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
        .kit-links { margin: 0; padding: 0; list-style: none; }
        .kit-links li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 16px; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--da-border); }
        .kit-links li:first-child { border-top: 1px solid var(--da-border); }
        .kit-links strong { color: var(--da-text); font-size: 15px; font-weight: 600; }
        .kit-links code, .kit-code { color: var(--da-muted); font-family: var(--da-font-mono); font-size: 12.5px; line-height: 1.5; overflow-wrap: anywhere; }
        .kit-links code { grid-column: 1; display: block; }
        .kit-links .kit-copy { grid-column: 2; grid-row: 1 / span 2; }
        .kit-code { display: block; background: var(--da-darker); border: 1px solid var(--da-border); padding: 12px 14px; margin: 16px 0 12px; }
        @media (max-width: 640px) {
          .kit-figs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .kit-fig:nth-child(3) { padding-left: 0; border-left: 0; border-top: 1px solid var(--da-border); }
          .kit-fig:nth-child(4) { border-top: 1px solid var(--da-border); }
          .kit-fig b { font-size: 26px; }
        }
      `}</style>

      <h1 className="sq-title">Euer Beitrag zum Teilen</h1>
      <p className="sq-lead">
        <Link href={articleUrl} style={{ color: "var(--da-text)", fontWeight: 600 }}>«{article.title}»</Link>
      </p>
      <p className="sq-meta">
        {label} von {company.name}, erschienen am {formatLongDate(zurichDate(new Date(article.published_at)))}. Hier liegt alles, was ihr zum Teilen braucht. Den Link zu dieser Seite könnt ihr im Team weitergeben.
      </p>

      <section className="sq-sec">
        <h2 className="sq-h2"><span>1</span>Zahlen bis gestern</h2>
        {figures.views === 0 ? (
          <p className="sq-intro">Noch keine Aufrufe gezählt. Die Zahlen erscheinen hier ab dem Tag nach dem ersten Aufruf.</p>
        ) : (
          <>
            <div className="kit-figs">
              <div className="kit-fig"><b>{figures.views.toLocaleString("de-CH")}</b><span>Aufrufe</span></div>
              <div className="kit-fig"><b>{figures.reads.toLocaleString("de-CH")}</b><span>bis zum Ende gelesen</span></div>
              <div className="kit-fig"><b>{formatDuration(figures.avgSeconds)}</b><span>Lesezeit pro Aufruf</span></div>
              <div className="kit-fig"><b>{figures.websiteClicks.toLocaleString("de-CH")}</b><span>Klicks auf eure Website</span></div>
            </div>
            {figures.sources.length > 0 && (
              <ul className="kit-src" aria-label="Herkunft der Aufrufe">
                {figures.sources.map((s) => (
                  <li key={s.key}><span>{s.label}</span><span>{s.views.toLocaleString("de-CH")}</span></li>
                ))}
              </ul>
            )}
          </>
        )}
        <p className="kit-note">
          Gezählt ohne Cookies und ohne Kennung: Es sind Aufrufe, keine Personen. Eigene Aufrufe der Redaktion und Bots zählen nicht.
          {reportPending
            ? ` Nach ${REPORT_AFTER_DAYS} Tagen schicken wir euch die Zahlen zusätzlich per Mail.`
            : kit.reportSentAt
              ? ` Der Bericht nach ${REPORT_AFTER_DAYS} Tagen ging am ${formatLongDate(zurichDate(new Date(kit.reportSentAt)))} per Mail an euch.`
              : ""}
        </p>
      </section>

      <section className="sq-sec">
        <h2 className="sq-h2"><span>2</span>Bild zum Teilen</h2>
        <p className="sq-intro">LinkedIn und andere Netzwerke zeigen dieses Bild von selbst, wenn ihr den Link teilt. Für eigene Beiträge könnt ihr es herunterladen.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="kit-img" src={imagePath} width={1200} height={630} alt={`Teilen-Bild: ${article.title}, ${label} von ${company.name}`} />
        <div className="kit-actions">
          <a href={imagePath} download={`digital-age-showcase-${article.slug}.png`}>Bild herunterladen (PNG, 1200 × 630)</a>
        </div>
      </section>

      <section className="sq-sec">
        <h2 className="sq-h2"><span>3</span>Texte für LinkedIn</h2>
        {kit.linkedin.length > 0 ? (
          <>
            <p className="sq-intro">Nehmt, was passt, und ändert es nach Belieben. Der Link am Schluss trägt eine Kennung, damit wir die Aufrufe aus eurem Netzwerk zählen können.</p>
            {kit.linkedin.map((t, i) => {
              const full = `${t}\n\n${linkedinUrl}`;
              return (
                <div className="kit-post" key={i}>
                  <div className="kit-post__head"><span>TEXT {i + 1}</span><KitCopy text={full} /></div>
                  <p>{full}</p>
                </div>
              );
            })}
          </>
        ) : (
          <p className="sq-intro">Für diesen Beitrag gibt es keine vorbereiteten Texte. Nehmt für LinkedIn den Link unten.</p>
        )}
      </section>

      <section className="sq-sec">
        <h2 className="sq-h2"><span>4</span>Links</h2>
        <p className="sq-intro">Je nach Kanal ein eigener Link, damit wir sehen, woher die Leserinnen und Leser kommen. Der Beitrag ist derselbe.</p>
        <ul className="kit-links">
          <li><strong>LinkedIn und andere soziale Netzwerke</strong><code>{linkedinUrl}</code><KitCopy text={linkedinUrl} /></li>
          <li><strong>Eure Website und euer Blog</strong><code>{websiteUrl}</code><KitCopy text={websiteUrl} /></li>
          <li><strong>Newsletter und E-Mail-Signatur</strong><code>{mailUrl}</code><KitCopy text={mailUrl} /></li>
        </ul>
      </section>

      <section className="sq-sec">
        <h2 className="sq-h2"><span>5</span>Badge für eure Website</h2>
        <p className="sq-intro">Ein kleines Bild mit Link auf den Beitrag, zum Beispiel für die Seite «Presse» oder den Footer. Ohne Skript und ohne Zählpixel.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BADGE_PATH} width={BADGE_WIDTH} height={BADGE_HEIGHT} alt={`${company.name} im Showcase von digital age`} />
        <code className="kit-code">{snippet}</code>
        <KitCopy text={snippet} label="HTML kopieren" />
      </section>

      <section className="sq-sec">
        <p className="sq-meta">
          Soll am Beitrag etwas korrigiert werden? Antwortet auf die Mail, mit der ihr diesen Link bekommen habt, sie landet bei der Redaktion. Wie Unternehmensbeiträge entstehen und gekennzeichnet werden: <Link href="/swiss-ai/regeln#showcase">Regeln des Showcase</Link>.
        </p>
      </section>
    </QuestionnaireShell>
  );
}

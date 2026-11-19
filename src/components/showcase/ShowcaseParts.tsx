import Image from "next/image";
import Link from "next/link";

import ArticleListRow, { type ListArticle } from "@/components/ArticleListRow";
import { SWISS_STATUSES } from "@/lib/mappers/startupMappers";
import { AFFILIATION_LABEL, RULES_PATH } from "@/lib/startupTrust";
import ExternalArrow from "@/components/icons/ExternalArrow";

// Bausteine der Unternehmensbeitraege (Showcase, S2b). Entscheid Ali
// 15.11.2026: Variante B «Bühne», ausdruecklich ohne KI-Schablonen-Look.
// Darum keine Karten, keine farbigen Oberkanten, keine Pillen: Die Trennung
// vom redaktionellen Teil tragen eine feste Zeile, Linien und der Satz.
//
// Typ bewusst strukturell (kein Import aus showcaseApi): Die Bausteine laufen
// auch in Client-Baeumen.
export type ShowcaseCompanyView = {
  slug: string;
  name: string;
  tagline: string | null;
  city: string | null;
  industry: string | null;
  swiss_status: string | null;
  website: string | null;
  logo_url: string | null;
  affiliation_note: string | null;
};

export const SHOWCASE_RULES_HREF = `${RULES_PATH}#showcase`;

function statusLabel(status: string | null): string | null {
  if (!status) return null;
  return SWISS_STATUSES.find((s) => s.code === status)?.label ?? null;
}

// Logo auf weissem Grund (Logos sind fast immer fuer hellen Hintergrund
// gezeichnet); ohne Logo der Anfangsbuchstabe.
export function CompanyLogo({ company, size }: { company: ShowcaseCompanyView; size: number }) {
  return (
    <span className="sc-logo" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} aria-hidden>
      {company.logo_url ? (
        <Image src={company.logo_url} alt="" width={size} height={size} unoptimized />
      ) : (
        company.name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

// Feste Zeile unter Navigation und Ticker. Sie bleibt beim Scrollen stehen
// und sagt jederzeit, was man liest und von wem.
export function ShowcaseBand({ company, label }: { company: ShowcaseCompanyView; label: string }) {
  return (
    <div className="sc-band" role="note" aria-label={`${label} von ${company.name}. Kein redaktioneller Beitrag.`}>
      <div className="sc-band__in">
        <p className="sc-band__text">
          <strong>{label}</strong> von {company.name}
          <span className="sc-band__long">. Kein redaktioneller Beitrag.</span>
        </p>
        <Link href={SHOWCASE_RULES_HREF} className="sc-band__link" aria-label={`Was heisst ${label}?`}>
          <span className="sc-band__q">Was heisst das?</span>
          <span className="sc-band__q--short" aria-hidden>Info</span>
        </Link>
      </div>
    </div>
  );
}

// Kopf der Bühne: der Absender, wie eine Kopfzeile in der Zeitung zwischen
// zwei Linien.
export function CompanyMasthead({ company }: { company: ShowcaseCompanyView }) {
  const href = `/swiss-ai/${company.slug}`;
  return (
    <div className="sc-mast">
      <Link href={href} aria-hidden tabIndex={-1} className="sc-mast__logo">
        <CompanyLogo company={company} size={48} />
      </Link>
      <div className="sc-mast__id">
        <p className="sc-mast__label">Ein Beitrag von</p>
        <p className="sc-mast__name">
          <Link href={href}>{company.name}</Link>
          {company.city && <span className="sc-mast__place">, {company.city}</span>}
        </p>
      </div>
      <Link href={href} className="sc-mast__profile">
        Profil im Verzeichnis <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

// Seitenleiste: Der Absender bleibt beim Lesen neben dem Inhaltsverzeichnis
// sichtbar. Ohne eigene Ueberschrift, die feste Zeile darueber sagt es schon.
export function CompanySide({ company }: { company: ShowcaseCompanyView }) {
  const facts = [company.city, company.industry].filter(Boolean).join(" · ");
  return (
    <div className="sc-side">
      <div className="sc-side__head">
        <CompanyLogo company={company} size={36} />
        <div>
          <p className="sc-side__name">{company.name}</p>
          {facts && <p className="sc-side__facts">{facts}</p>}
        </div>
      </div>
      {company.tagline && <p className="sc-side__tag">{company.tagline}</p>}
      <Link href={`/swiss-ai/${company.slug}`} className="sc-side__link">
        Profil im Verzeichnis <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

// Ende des Beitrags, anstelle der Autorenbox: wer spricht, wie das
// Unternehmen mit dem Herausgeber verbunden ist und was die Redaktion tut.
export function CompanyAbout({ company }: { company: ShowcaseCompanyView }) {
  const facts = [company.city, company.industry, statusLabel(company.swiss_status)].filter(Boolean).join(" · ");
  const affiliation = company.affiliation_note?.trim();
  return (
    <section className="sc-about" aria-labelledby="sc-about-h">
      <h2 className="sc-about__h" id="sc-about-h">Über das Unternehmen</h2>
      <div className="sc-about__row">
        <CompanyLogo company={company} size={56} />
        <div className="sc-about__id">
          <p className="sc-about__name">{company.name}</p>
          {company.tagline && <p className="sc-about__tag">{company.tagline}</p>}
          {facts && <p className="sc-about__facts">{facts}</p>}
        </div>
      </div>
      <p className="sc-about__links">
        <Link href={`/swiss-ai/${company.slug}`}>
          Profil im Verzeichnis <span aria-hidden>→</span>
        </Link>
        {company.website && /^https?:\/\//i.test(company.website) && (
          <a href={company.website} rel="sponsored noopener" target="_blank">
            Website des Unternehmens<ExternalArrow />
          </a>
        )}
      </p>
      {affiliation && (
        <p className="sc-about__aff">
          <strong>{AFFILIATION_LABEL}.</strong> {affiliation}{" "}
          <Link href={`${RULES_PATH}#interessen`}>Interessenbindungen</Link>
        </p>
      )}
      <p className="sc-about__note">
        Unternehmensbeiträge geben die Sicht des Unternehmens wieder. Der Text stammt vom Unternehmen oder entsteht mit
        KI-Unterstützung aus seinen Antworten auf unseren Fragebogen, und das Unternehmen gibt ihn frei. Die Redaktion
        prüft ihn auf Verständlichkeit und auf die <Link href={SHOWCASE_RULES_HREF}>Regeln des Showcase</Link>.
      </p>
    </section>
  );
}

// Liste von Unternehmensbeitraegen mit Ueberschrift: «Weitere Beiträge»,
// Firmenprofil, Autorenprofil. Dieselbe Listenzeile wie in den Rubriken.
export function ShowcaseRows({
  heading,
  rows,
  moreHref,
  moreLabel = "Alle Beiträge",
}: {
  heading: string;
  rows: ListArticle[];
  moreHref?: string;
  moreLabel?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="sc-rows" aria-label={heading}>
      <div className="sc-rows__head">
        <h2>{heading}</h2>
        {moreHref && (
          <Link href={moreHref}>
            {moreLabel} <span aria-hidden>→</span>
          </Link>
        )}
      </div>
      {rows.map((r) => (
        <ArticleListRow key={r.id} article={r} dotColor="var(--da-orange)" />
      ))}
    </section>
  );
}

export function ShowcaseStyles() {
  return (
    <style>{`
      .sc-logo {
        display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;
        border-radius: 4px; background: #fff; color: var(--da-dark); font-weight: 700;
      }
      .sc-logo img { width: 100%; height: 100%; object-fit: contain; display: block; }

      .sc-band {
        position: sticky; top: calc(var(--nav-h) + var(--ticker-h, 0px)); z-index: 40;
        background: color-mix(in srgb, var(--da-orange) 9%, var(--da-darker));
        border-bottom: 1px solid color-mix(in srgb, var(--da-orange) 40%, transparent);
      }
      .sc-band__in {
        max-width: 1200px; margin: 0 auto; padding: 0 var(--gutter); min-height: 40px;
        display: flex; align-items: center; justify-content: space-between; gap: 16px;
      }
      .sc-band__text {
        margin: 0; min-width: 0; font-size: 13px; color: var(--da-text-strong);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .sc-band__text strong { color: var(--da-orange); font-weight: 700; }
      .sc-band__link {
        flex-shrink: 0; white-space: nowrap; color: var(--da-text-strong); font-size: 13px;
        text-decoration: underline; text-underline-offset: 3px;
      }
      .sc-band__link:hover { color: var(--da-text); }
      .sc-band__q--short { display: none; }
      @media (max-width: 900px) { .sc-band__long { display: none; } }
      @media (max-width: 640px) {
        .sc-band__q { display: none; }
        .sc-band__q--short { display: inline; }
      }

      .sc-head { max-width: 1200px; margin: 0 auto; padding: 40px var(--gutter) var(--sp-10); }
      .sc-head .ah-kicker__rubric { color: var(--da-orange); }
      .sc-mast {
        display: flex; align-items: center; gap: 16px; margin-top: 18px; padding: 18px 0;
        border-top: 2px solid var(--da-text); border-bottom: 1px solid var(--da-border);
      }
      .sc-mast__logo { display: block; flex-shrink: 0; }
      .sc-mast__id { flex: 1; min-width: 0; }
      .sc-mast__label { margin: 0; color: var(--da-muted); font-size: 13px; line-height: 1.3; }
      .sc-mast__name {
        margin: 3px 0 0; color: var(--da-text); font-family: var(--da-font-display);
        font-size: 22px; font-weight: 700; line-height: 1.2; letter-spacing: -0.01em;
      }
      .sc-mast__name a { color: inherit; text-decoration: none; }
      .sc-mast__name a:hover { text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px; }
      .sc-mast__place { color: var(--da-muted); font-family: var(--da-font-body); font-size: 15px; font-weight: 400; letter-spacing: 0; }
      .sc-mast__profile { flex-shrink: 0; white-space: nowrap; color: var(--da-text-strong); font-size: 14px; text-decoration: none; }
      .sc-mast__profile:hover { color: var(--da-text); text-decoration: underline; text-underline-offset: 3px; }

      .sc-head .ah-title { margin-top: 30px; }
      .sc-lead {
        display: grid; grid-template-columns: minmax(0, 1fr) 480px; column-gap: 48px;
        margin-top: 28px; align-items: stretch;
      }
      .sc-lead--plain { grid-template-columns: minmax(0, 1fr); }
      .sc-lead__text { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
      .sc-dek { color: #c6c6c6; font-size: 19px; line-height: 1.55; margin: 0; max-width: 640px; }
      .sc-byline {
        margin-top: auto; display: flex; align-items: center; justify-content: space-between;
        gap: 14px 20px; flex-wrap: wrap; padding-top: 18px; border-top: 1px solid var(--da-border);
      }
      .sc-lead .ah-figure { grid-area: auto; }
      @media (max-width: 1024px) {
        .sc-lead { display: flex; flex-direction: column; }
        .sc-lead__text { gap: 0; }
        .sc-dek { max-width: 760px; }
        .sc-byline { margin-top: 28px; padding: 18px 0; border-bottom: 1px solid var(--da-border); }
      }
      @media (max-width: 640px) {
        .sc-head { padding-top: 28px; }
        .sc-mast { flex-wrap: wrap; row-gap: 10px; padding: 14px 0; margin-top: 14px; }
        .sc-mast__name { font-size: 19px; }
        .sc-mast__profile { flex-basis: 100%; }
        .sc-head .ah-title { margin-top: 22px; }
        .sc-lead { margin-top: 0; }
        .sc-dek { font-size: 17px; margin-top: 20px; }
        .sc-byline { margin-top: 22px; padding: 16px 0; }
      }

      .sc-side { padding-bottom: 22px; margin-bottom: 20px; border-bottom: 1px solid var(--da-border); }
      .sc-side__head { display: flex; align-items: center; gap: 12px; }
      .sc-side__name { margin: 0; color: var(--da-text); font-size: 15px; font-weight: 700; line-height: 1.3; }
      .sc-side__facts { margin: 2px 0 0; color: var(--da-muted); font-size: 12px; }
      .sc-side__tag { margin: 12px 0 0; color: var(--da-text-strong); font-size: 14px; line-height: 1.5; }
      .sc-side__link { display: inline-block; margin-top: 10px; color: var(--da-text-strong); font-size: 13px; text-decoration: none; }
      .sc-side__link:hover { color: var(--da-text); text-decoration: underline; text-underline-offset: 3px; }

      .sc-about { margin-top: var(--sp-12); padding-top: 26px; border-top: 2px solid var(--da-text); }
      .sc-about__h { margin: 0 0 20px; color: var(--da-text); font-family: var(--da-font-display); font-size: 20px; font-weight: 700; }
      .sc-about__row { display: flex; align-items: flex-start; gap: 16px; }
      .sc-about__name { margin: 0; color: var(--da-text); font-size: 18px; font-weight: 700; line-height: 1.3; }
      .sc-about__tag { margin: 4px 0 0; color: var(--da-text-strong); font-size: 15px; line-height: 1.5; }
      .sc-about__facts { margin: 6px 0 0; color: var(--da-muted); font-size: 13px; }
      .sc-about__links { display: flex; align-items: center; gap: 8px 28px; flex-wrap: wrap; margin: 20px 0 0; font-size: 15px; }
      .sc-about__links a { color: var(--da-text); font-weight: 600; text-decoration: underline; text-underline-offset: 4px; text-decoration-color: var(--da-muted-soft); }
      .sc-about__links a:hover { text-decoration-color: var(--da-text); }
      .sc-about__aff {
        margin: 24px 0 0; padding: 2px 0 2px 16px; border-left: 2px solid var(--da-orange);
        color: var(--da-text-strong); font-size: 14px; line-height: 1.6;
      }
      .sc-about__aff strong { color: var(--da-text); font-weight: 600; }
      .sc-about__aff a, .sc-about__note a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
      .sc-about__aff a:hover, .sc-about__note a:hover { color: var(--da-text); }
      .sc-about__note { margin: 18px 0 0; color: var(--da-muted); font-size: 13px; line-height: 1.6; max-width: 620px; }

      .sc-rows__head {
        display: flex; align-items: baseline; justify-content: space-between; gap: 16px;
        padding-bottom: 14px; border-bottom: 2px solid var(--da-text);
      }
      .sc-rows__head h2 { margin: 0; color: var(--da-text); font-family: var(--da-font-display); font-size: 24px; font-weight: 700; line-height: 1.2; }
      .sc-rows__head a { color: var(--da-text-strong); font-size: 14px; text-decoration: none; white-space: nowrap; }
      .sc-rows__head a:hover { color: var(--da-text); text-decoration: underline; text-underline-offset: 3px; }
      .sc-more { max-width: 1200px; margin: var(--sp-16) auto 0; padding: 0 var(--gutter); }
      @media (max-width: 640px) {
        .sc-rows__head h2 { font-size: 20px; }
        .sc-more { margin-top: var(--sp-12); }
      }
    `}</style>
  );
}

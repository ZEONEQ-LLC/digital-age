import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import Footer from "@/components/Footer";
import ModuleCard from "@/components/module/ModuleCard";
import { resolveTheme } from "@/lib/ads/creativeTheme";
import {
  CREATIVE_SPECS, MEDIA_EXAMPLES, MEDIA_EXAMPLE_BRAND, MEDIA_EXAMPLE_ORDER, MEDIA_INQUIRY_HREF,
  MEDIA_PARTNERS, MEDIA_PLACEMENTS, MEDIA_PRICING, PRICE_NOTE, RETINA, TEXT_LIMITS,
  exampleSize, fileSize, formatSize, placementFormat, placementWhere, sameSize,
  type MediaPlacement,
} from "@/lib/ads/mediaKit";
import { buildListingMetadata } from "@/lib/listingMetadata";
import { getPublishedStartups } from "@/lib/startupApi";
import { createPublicClient } from "@/lib/supabase/public";
import { MdFrame, PlacementMobileMotif, PlacementSketch } from "./PlacementVisual";

// Oeffentliche Mediadaten fuer Werbekunden. ISR (stuendlich), nur Anon-Reads
// ueber createPublicClient: kein cookies(), kein Service-Client. Sie-Form.
// Neutrale Klassennamen (md-*). Masse aus PLACEMENTS via mediaKit.ts.
export const revalidate = 3600;

export const metadata: Metadata = buildListingMetadata({
  path: "/mediadaten",
  title: "Mediadaten – Werben auf digital age",
  description:
    "Mediadaten von digital age: fünf Platzierungen mit eigenen Motiven für Desktop und Mobile, Formate und Masse, Grundsätze, Ablauf und Preise für Ihre Anzeige.",
});

async function getCounts(): Promise<{ articles: number | null; startups: number | null }> {
  let articles: number | null = null;
  let startups: number | null = null;
  try {
    const supabase = createPublicClient();
    const { count, error } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");
    if (!error) articles = count ?? null;
  } catch {
    // ohne Zahl rendern
  }
  try {
    // Exakt der Filter der Swiss-AI-Listing-Seite (published + featured).
    startups = (await getPublishedStartups()).length;
  } catch {
    // ohne Zahl rendern
  }
  return { articles, startups };
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function Check({ muted = false }: { muted?: boolean }) {
  return (
    <svg className="md-price__check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={muted ? "var(--da-muted)" : "var(--da-green)"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const PRINCIPLES: { title: string; text: string; icon: React.ReactNode }[] = [
  {
    title: "Klar gekennzeichnet",
    text: "Jede bezahlte Platzierung trägt «Anzeige». Im Artikeltext steht sie in einem abgesetzten Band, wie es der Schweizer Presserat verlangt.",
    icon: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></>,
  },
  {
    title: "Kein Tracking von Dritten",
    text: "Keine fremden Skripte, keine Zählpixel. Wir zählen selbst – sichtbare Einblendungen und Klicks, ohne Cookies.",
    icon: <><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>,
  },
  {
    title: "Ruhige Formate",
    text: "Keine Pop-ups, keine Layer, nichts, was den Text verdeckt. Ihre Anzeige steht fest an ihrem Platz.",
    icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></>,
  },
  {
    title: "Redaktion bleibt unabhängig",
    text: "Redaktionelle Inhalte sind nicht käuflich. Wir prüfen jedes Motiv und können Anzeigen ablehnen.",
    icon: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3z" /></>,
  },
];

const STEPS: { title: string; text: string; link?: boolean }[] = [
  { title: "Anfrage", text: "Sie schreiben uns, welche Platzierung und welchen Zeitraum Sie möchten.", link: true },
  { title: "Offerte", text: "Wir prüfen die Verfügbarkeit und schicken Ihnen eine Offerte." },
  { title: "Motiv", text: "Sie liefern Desktop- und Mobile-Motiv – oder den Text für eine Text-Anzeige." },
  { title: "Vorschau und Freigabe", text: "Über Ihren persönlichen Link sehen Sie die Anzeige an den echten Positionen und geben sie frei." },
  { title: "Live und Zahlen", text: "Sichtbare Einblendungen, Klicks und Klickrate jederzeit über denselben Link. Sieben Tage vor Ende erinnern wir Sie." },
];

function SpecRows({ p }: { p: MediaPlacement }) {
  const f = placementFormat(p);
  const desktopFile = `Datei ${formatSize(fileSize(f.desktop))}${p.fileNote ? `, ${p.fileNote}` : ""}`;
  return (
    <dl className="md-spec">
      <div className="md-spec__row">
        <dt>Desktop</dt>
        <dd>
          {formatSize(f.desktop)}{"\u00a0"}px{p.desktopName ? ` · ${p.desktopName}` : ""}
          <span className="md-spec__sub">{desktopFile}</span>
        </dd>
      </div>
      <div className="md-spec__row">
        <dt>Mobile</dt>
        <dd>
          {f.mobile ? (
            <>
              {formatSize(f.mobile)}{"\u00a0"}px
              <span className="md-spec__sub">
                {sameSize(f.desktop, f.mobile) ? "dasselbe Motiv möglich" : `Datei ${formatSize(fileSize(f.mobile))}`}
              </span>
            </>
          ) : "wird nicht ausgespielt"}
        </dd>
      </div>
      <div className="md-spec__row"><dt>Belegung</dt><dd>{p.share}</dd></div>
      <div className="md-spec__row"><dt>Buchbar</dt><dd>{p.bookable}</dd></div>
    </dl>
  );
}

export default async function MediadatenPage() {
  const { articles, startups } = await getCounts();
  const stats = [
    articles != null ? { n: articles, label: "Fachartikel" } : null,
    startups != null ? { n: startups, label: "Unternehmen im Swiss AI Verzeichnis" } : null,
    { n: MEDIA_PLACEMENTS.length, label: "Platzierungen" },
  ].filter((s): s is { n: number; label: string } => s !== null);
  const [featured, ...otherPrices] = MEDIA_PRICING;
  const ex = CREATIVE_SPECS.text.example;

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <style>{`
        .md-shell { max-width: var(--max-content); margin: 0 auto; padding: 0 var(--sp-8); }
        .md-overline {
          margin: 0; color: var(--da-green); font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
        }
        .md-label {
          margin: 0; color: var(--da-faint); font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
        }
        .md-section { padding: 96px 0; }
        .md-section--alt { background: var(--da-darker); border-top: 1px solid var(--da-border-soft); border-bottom: 1px solid var(--da-border-soft); }
        .md-head { display: flex; flex-direction: column; gap: 14px; max-width: 760px; margin-bottom: 40px; }
        .md-h2 { margin: 0; color: var(--da-text); font-family: var(--da-font-display); font-size: 36px; font-weight: 700; line-height: 1.1; letter-spacing: -0.01em; }
        .md-lead { margin: 0; color: var(--da-muted); font-size: 16px; line-height: 1.65; }
        .md-btn { padding: 14px 22px; font-size: 15px; border-radius: var(--r-md); text-decoration: none; }
        .md-btn.da-btn--secondary { font-weight: 600; }

        /* Hero */
        .md-hero {
          border-bottom: 1px solid var(--da-border);
          background-color: var(--da-dark);
          background-image: radial-gradient(var(--da-card) 1px, transparent 1px);
          background-size: 22px 22px;
          padding: 72px 0;
        }
        .md-hero__grid { display: grid; grid-template-columns: minmax(0, 600px) minmax(0, 1fr); gap: 64px; align-items: center; }
        .md-hero__text { display: flex; flex-direction: column; gap: 22px; }
        .md-hero__title { margin: 0; color: var(--da-text); font-family: var(--da-font-display); font-size: 64px; font-weight: 700; line-height: 1; letter-spacing: -0.02em; }
        .md-hero__title em { font-style: normal; color: var(--da-green); }
        .md-hero__lead { margin: 0; color: var(--da-muted); font-size: 18px; line-height: 1.65; max-width: 580px; }
        .md-hero__stats { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; color: var(--da-muted); font-family: var(--da-font-mono); font-size: 13px; }
        .md-hero__stats strong { color: var(--da-text); }
        .md-hero__sep { color: var(--da-border); }
        .md-hero__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
        .md-hero__example { display: flex; flex-direction: column; gap: 14px; padding: 24px; background: var(--da-darker); border: 1px solid var(--da-border-soft); border-radius: var(--r-lg); }
        .md-hero__pair { display: flex; align-items: flex-end; gap: 16px; margin-top: 6px; }
        .md-hero__pair p { margin: 0; color: var(--da-faint); font-size: 13px; line-height: 1.5; }

        /* Modul-Rahmen wie ModuleCard (kind image) */
        .md-frame { display: flex; flex-direction: column; gap: 4px; border: 1px solid var(--da-border); border-radius: var(--r-md); overflow: hidden; flex-shrink: 0; }
        .md-frame__kicker { color: var(--da-muted); font-family: var(--da-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; padding: 6px 8px 0; }
        .md-frame__img { display: block; width: 100%; height: auto; }
        .md-frame--mark { box-shadow: 0 0 0 2px var(--da-green); }
        .md-frame--mini { gap: 2px; border-radius: var(--r-sm); }
        .md-frame--mini .md-frame__kicker { font-size: 5px; padding: 3px 4px 0; }

        /* Platzierungen */
        .md-pls { display: flex; flex-direction: column; gap: 24px; }
        .md-pl { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 40px; padding: 36px; background: var(--da-darker); border: 1px solid var(--da-border-soft); border-radius: 10px; }
        .md-pl__text { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
        .md-pl__head { display: flex; flex-direction: column; gap: 18px; }
        .md-pl__no { color: var(--da-green); font-family: var(--da-font-mono); font-size: 13px; font-weight: 700; }
        .md-pl__title { margin: 0; color: var(--da-text); font-family: var(--da-font-display); font-size: 26px; font-weight: 700; }
        .md-pl__where { margin: 0; color: var(--da-muted); font-size: 15px; line-height: 1.6; }
        .md-spec { margin: 6px 0 0; border-top: 1px solid var(--da-border-soft); }
        .md-spec__row { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--da-border-soft); }
        .md-spec dt { color: var(--da-faint); font-family: var(--da-font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; padding-top: 3px; }
        .md-spec dd { margin: 0; color: var(--da-text); font-size: 15px; text-align: right; }
        .md-spec__sub { display: block; color: var(--da-faint); font-size: 13px; }
        .md-only-narrow { display: none; }

        /* Skizzen */
        .md-vis { display: flex; gap: 28px; align-items: flex-start; }
        .md-vis__col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .md-vis__col:first-child { flex: 0 1 480px; }
        .md-vis__label { margin: 0; color: var(--da-faint); font-family: var(--da-font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
        .md-vis--rail .md-vis__col { flex: 1 1 auto; }
        .md-rail-note { margin: 10px 0 0; color: var(--da-faint); font-size: 13px; line-height: 1.5; max-width: 660px; }
        .md-sk-browser { width: 480px; max-width: 100%; background: var(--da-dark); border: 1px solid var(--da-border); border-radius: var(--r-lg); overflow: hidden; }
        .md-sk-browser__bar, .md-sk-screen__bar { height: 22px; display: flex; align-items: center; gap: 10px; padding: 0 14px; border-bottom: 1px solid var(--da-border-soft); }
        .md-sk-screen__bar { justify-content: center; }
        .md-sk-browser__body { padding: 14px 16px 18px; display: flex; flex-direction: column; gap: 12px; }
        .md-sk-browser__body > .md-frame { align-self: center; }
        .md-sk-logo { width: 30px; height: 7px; border-radius: 2px; background: var(--da-green); flex-shrink: 0; }
        .md-sk-logo--sm { width: 24px; height: 6px; }
        .md-sk-nav { width: 26px; height: 4px; border-radius: 2px; background: var(--da-border); }
        .md-sk-phone { width: 172px; flex-shrink: 0; background: var(--da-dark); border: 1px solid var(--da-border); border-radius: 20px; overflow: hidden; padding: 10px 0 14px; }
        .md-sk-phone__bar { height: 16px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; border-bottom: 1px solid var(--da-border-soft); }
        .md-sk-burger { width: 12px; height: 5px; border-top: 2px solid var(--da-muted); border-bottom: 2px solid var(--da-muted); }
        .md-sk-phone__body { padding: 10px 10px 0; display: flex; flex-direction: column; gap: 8px; }
        .md-sk-line { display: block; height: 5px; border-radius: 2px; background: var(--da-border); flex-shrink: 0; }
        .md-sk-line--strong { background: color-mix(in srgb, var(--da-border) 65%, var(--da-muted-soft)); }
        .md-sk-line--green { background: var(--da-green); }
        .md-sk-line--green-soft { background: var(--da-green); opacity: 0.6; }
        .md-sk-line--orange { background: var(--da-orange); }
        .md-sk-grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .md-sk-grid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        .md-sk-teaser { background: var(--da-card); border-radius: var(--r-sm); overflow: hidden; }
        .md-sk-teaser__img { background: var(--da-border); }
        .md-sk-teaser__text { padding: 8px; display: flex; flex-direction: column; gap: 5px; }
        .md-sk-block { height: 52px; background: var(--da-card); border-radius: var(--r-sm); }
        .md-sk-block--tall { height: 90px; }
        .md-sk-block--img { height: 70px; background: var(--da-border); margin: 4px 0; }
        .md-sk-head { display: flex; flex-direction: column; gap: 6px; padding-bottom: 10px; border-bottom: 1px solid var(--da-border-soft); }
        .md-sk-split { display: flex; gap: 16px; align-items: flex-start; }
        .md-sk-aside { flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
        .md-sk-main { flex-grow: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
        .md-sk-main--grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .md-sk-cat { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid var(--da-border-soft); }
        .md-sk-box { height: 40px; border: 1px solid var(--da-border-soft); border-radius: var(--r-sm); }
        .md-sk-row { display: flex; gap: 8px; padding-left: 6px; border-left: 2px solid var(--da-green); }
        .md-sk-row__img { width: 64px; height: 44px; background: var(--da-border); border-radius: var(--r-xs); flex-shrink: 0; }
        .md-sk-row__text { flex-grow: 1; display: flex; flex-direction: column; gap: 5px; padding-top: 4px; }
        .md-sk-row--sm { gap: 6px; padding-left: 4px; }
        .md-sk-row--sm .md-sk-row__img { width: 44px; height: 32px; }
        .md-sk-row--sm .md-sk-row__text { gap: 4px; padding-top: 3px; }
        .md-sk-search { height: 14px; border: 1px solid var(--da-border-soft); border-radius: var(--r-xs); flex-shrink: 0; }
        .md-sk-chips { display: flex; flex-wrap: wrap; gap: 4px; }
        .md-sk-chips span { height: 8px; width: 26px; border: 1px solid var(--da-border); border-radius: 2px; }
        .md-sk-cta { padding: 7px; border: 1px solid var(--da-orange); border-radius: var(--r-sm); display: flex; flex-direction: column; gap: 4px; }
        .md-sk-cta__btn { height: 10px; width: 42px; background: var(--da-orange); border-radius: 2px; margin-top: 2px; }
        .md-sk-cta--sm { padding: 6px; }
        .md-sk-cta--sm .md-sk-cta__btn { height: 8px; width: 38px; }
        .md-sk-company { background: var(--da-card); border: 1px solid var(--da-border); border-radius: var(--r-sm); padding: 8px; display: flex; flex-direction: column; gap: 5px; }
        .md-sk-company__logo { width: 16px; height: 16px; border-radius: var(--r-xs); background: var(--da-border); flex-shrink: 0; }
        .md-sk-company--row { flex-direction: row; align-items: center; gap: 6px; padding: 7px; border: 0; }
        .md-sk-company--row .md-sk-company__logo { width: 14px; height: 14px; }
        .md-sk-article { width: 290px; max-width: 100%; margin: 0 auto; display: flex; flex-direction: column; gap: 7px; }
        .md-sk-screen { position: relative; width: 660px; max-width: 100%; height: 300px; background: var(--da-dark); border: 1px solid var(--da-border); border-radius: var(--r-lg); overflow: hidden; }
        .md-sk-screen__content { width: 400px; max-width: calc(100% - 180px); margin: 14px auto 0; display: flex; flex-direction: column; gap: 10px; }
        .md-sk-rail { position: absolute; top: 40px; width: 58px; }
        .md-sk-rail--left { left: 12px; }
        .md-sk-rail--right { right: 12px; }

        /* Band im Artikel (wie ModuleCard frame="band") */
        .md-band { display: flex; flex-direction: column; gap: 10px; background: var(--da-dark); border-top: 1px solid var(--da-border); border-bottom: 1px solid var(--da-border); padding: 14px 20px 18px; box-shadow: 0 0 0 2px var(--da-green); }
        .md-band__head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
        .md-band__label { color: var(--da-muted); font-family: var(--da-font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
        .md-band__hint { color: var(--da-faint); font-size: 12px; }
        .md-band__img { display: block; width: 100%; height: auto; border-radius: var(--r-sm); }
        .md-band--mini { gap: 5px; padding: 7px 10px 9px; margin: 8px -10px; background: var(--da-darker); }
        .md-band--mini .md-band__head { gap: 4px; }
        .md-band--mini .md-band__label, .md-band--mini .md-band__hint { font-size: 5px; }
        .md-band--mini .md-band__img { border-radius: 2px; }
        .md-sk-phone .md-band--mini { margin: 6px -10px; padding: 6px 10px 8px; }
        .md-sk-phone .md-band--mini .md-band__label, .md-sk-phone .md-band--mini .md-band__hint { font-size: 4px; }

        /* Mobile-Motiv (unter 768 px) */
        .md-motif { display: flex; flex-direction: column; gap: 8px; }
        .md-motif--center { align-items: center; }
        .md-motif--rail { flex-direction: row; align-items: flex-end; gap: 16px; }
        .md-motif__note { margin: 0; color: var(--da-faint); font-size: 13px; line-height: 1.5; }
        .md-motif__band { margin: 8px -20px; }
        .md-motif__band .md-band__img { width: min(100%, 300px); }

        /* Formate */
        #formate { scroll-margin-top: calc(var(--nav-h) + 16px); }
        .md-formats { --md-scale: 0.33; display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 32px 24px; padding: 36px; background: var(--da-dark); border: 1px solid var(--da-border-soft); border-radius: 10px; margin-bottom: 24px; }
        .md-format { margin: 0; display: flex; flex-direction: column; gap: 12px; }
        .md-format__img { display: block; width: calc(var(--md-w) * var(--md-scale)); height: auto; border-radius: var(--r-xs); }
        .md-format figcaption { display: flex; flex-direction: column; gap: 2px; }
        .md-format__name { color: var(--da-text); font-size: 14px; font-weight: 600; }
        .md-format__size { color: var(--da-faint); font-family: var(--da-font-mono); font-size: 12px; }
        .md-cards2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
        .md-card { display: flex; flex-direction: column; gap: 20px; padding: 32px; background: var(--da-dark); border: 1px solid var(--da-border-soft); border-radius: 10px; min-width: 0; }
        .md-card__title { margin: 0; color: var(--da-text); font-family: var(--da-font-display); font-size: 24px; font-weight: 700; }
        .md-card__text { margin: 0; color: var(--da-muted); font-size: 15px; line-height: 1.6; }
        .md-card__note { margin: 0; color: var(--da-faint); font-size: 14px; line-height: 1.6; }
        .md-rows { margin: 0; }
        .md-rows__row { display: flex; justify-content: space-between; gap: 20px; padding: 13px 0; border-bottom: 1px solid var(--da-border-soft); }
        .md-rows dt { color: var(--da-muted); font-size: 15px; }
        .md-rows dd { margin: 0; color: var(--da-text); font-size: 15px; text-align: right; }
        .md-example { display: flex; }
        .md-limits { margin: 0; display: flex; flex-wrap: wrap; gap: 6px 14px; color: var(--da-muted); font-size: 14px; }
        .md-limits__sep { color: var(--da-border); }
        .md-themes { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 14px; }
        .md-themes__label { color: var(--da-muted); font-size: 14px; margin-right: 4px; }
        .md-theme { display: flex; align-items: center; gap: 7px; color: var(--da-text); font-size: 13px; }
        .md-theme__swatch { width: 18px; height: 18px; border-radius: var(--r-sm); flex-shrink: 0; }

        /* Grundsaetze */
        .md-principles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; }
        .md-principle { display: flex; flex-direction: column; gap: 12px; padding-top: 20px; border-top: 1px solid var(--da-border); }
        .md-principle h3 { margin: 0; color: var(--da-text); font-family: var(--da-font-display); font-size: 19px; font-weight: 700; }
        .md-principle p { margin: 0; color: var(--da-muted); font-size: 15px; line-height: 1.6; }

        /* Ablauf */
        .md-steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 20px; }
        .md-step { display: flex; flex-direction: column; gap: 12px; padding: 24px; background: var(--da-dark); border: 1px solid var(--da-border-soft); border-radius: var(--r-lg); }
        .md-step__no { color: var(--da-green); font-family: var(--da-font-mono); font-size: 13px; font-weight: 700; }
        .md-step__body { display: flex; flex-direction: column; gap: 12px; flex-grow: 1; }
        .md-step__title { color: var(--da-text); font-family: var(--da-font-display); font-size: 18px; font-weight: 700; }
        .md-step__text { color: var(--da-muted); font-size: 14px; line-height: 1.6; }
        .md-step__link { margin-top: auto; color: var(--da-green); font-size: 14px; font-weight: 600; text-decoration: none; }
        .md-step__link:hover { text-decoration: underline; }

        /* Preise */
        .md-prices { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 24px; align-items: stretch; }
        .md-price { display: flex; flex-direction: column; gap: 22px; padding: 36px; background: var(--da-darker); border: 1px solid var(--da-border-soft); border-radius: 10px; }
        .md-price--featured { border-color: var(--da-green); }
        .md-price__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .md-price__name { margin: 0; color: var(--da-text); font-family: var(--da-font-display); font-size: 24px; font-weight: 700; }
        .md-price__badge { color: var(--da-footer); background: var(--da-green); font-family: var(--da-font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.14em; padding: 6px 10px; border-radius: var(--r-pill); }
        .md-price__amount { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 12px; }
        .md-price__value { color: var(--da-text); font-family: var(--da-font-display); font-size: 52px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.05; }
        .md-price--plain .md-price__value { font-size: 40px; }
        .md-price__unit { color: var(--da-muted); font-size: 16px; }
        .md-price__lines { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
        .md-price__lines li { display: flex; gap: 12px; color: var(--da-text); font-size: 15px; line-height: 1.5; }
        .md-price--plain .md-price__lines li { color: var(--da-text-strong); }
        .md-price__check { flex-shrink: 0; margin-top: 2px; }
        .md-price__cta { align-self: flex-start; margin-top: 4px; }
        .md-price--plain .md-price__cta { margin-top: auto; }
        .md-note { margin: 16px 0 0; color: var(--da-faint); font-size: 14px; }
        .md-partners { margin-top: 40px; display: flex; flex-direction: column; gap: 14px; }
        .md-partners__list { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 12px 24px; }
        .md-partners__list a { color: var(--da-text); font-size: 15px; font-weight: 600; text-decoration: none; }
        .md-partners__list a:hover { color: var(--da-green); }

        /* Kontakt-Band */
        .md-contact { padding: 72px 0; background: var(--da-darker); border-top: 1px solid var(--da-border-soft); }
        .md-contact__inner { display: flex; align-items: center; justify-content: space-between; gap: 48px; }
        .md-contact__text { display: flex; flex-direction: column; gap: 12px; max-width: 720px; }
        .md-contact__title { margin: 0; color: var(--da-text); font-family: var(--da-font-display); font-size: 32px; font-weight: 700; line-height: 1.15; }

        @media (max-width: 1099px) {
          .md-pl { grid-template-columns: 1fr; gap: 32px; }
          .md-hero__grid { grid-template-columns: 1fr; gap: 40px; }
        }
        @media (max-width: 1023px) {
          .md-cards2 { grid-template-columns: 1fr; }
          .md-principles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .md-steps { grid-template-columns: 1fr; gap: 12px; }
          .md-step { flex-direction: row; gap: 16px; padding: 18px; }
          .md-step__no { padding-top: 3px; }
          .md-step__body { gap: 6px; }
          .md-step__title { font-size: 17px; }
          .md-step__link { padding: 6px 0; }
        }
        @media (max-width: 899px) {
          .md-prices { grid-template-columns: 1fr; }
          .md-contact__inner { flex-direction: column; align-items: stretch; gap: 20px; }
        }
        @media (max-width: 767px) {
          .md-shell { padding: 0 var(--sp-5); }
          .md-section { padding: 56px 0; }
          .md-head { margin-bottom: 24px; gap: 12px; }
          .md-h2 { font-size: 28px; line-height: 1.15; }
          .md-lead { font-size: 15px; line-height: 1.6; }
          .md-only-wide { display: none; }
          .md-only-narrow { display: block; }
          .md-hero { padding: 44px 0 48px; background-size: 20px 20px; }
          .md-hero__text { gap: 20px; }
          .md-hero__title { font-size: 46px; }
          .md-hero__lead { font-size: 16px; }
          .md-hero__stats { flex-direction: column; align-items: flex-start; }
          .md-hero__sep { display: none; }
          .md-hero__actions { flex-direction: column; gap: 10px; margin-top: 4px; }
          .md-hero__example { padding: 0; background: transparent; border: 0; gap: 10px; }
          .md-btn { justify-content: center; height: 52px; padding: 0 22px; font-size: 16px; }
          .md-pls { gap: 16px; }
          .md-pl { padding: 20px; gap: 16px; }
          .md-pl__text { gap: 16px; }
          .md-pl__head { flex-direction: row; align-items: baseline; gap: 12px; }
          .md-pl__title { font-size: 22px; }
          .md-spec { margin-top: 0; border-top: 0; }
          .md-spec__row { padding: 11px 0; }
          .md-spec__row:last-child { border-bottom: 0; }
          .md-formats { --md-scale: 0.3; justify-content: flex-start; gap: 22px 16px; padding: 20px; }
          .md-format--5 { order: 6; }
          .md-format--6 { order: 5; }
          .md-format figcaption { flex-direction: row; flex-wrap: wrap; gap: 0 6px; }
          .md-card { padding: 20px; gap: 16px; }
          .md-card__title { font-size: 21px; }
          .md-limits { flex-direction: column; gap: 2px; }
          .md-limits__sep { display: none; }
          .md-rows__row { padding: 11px 0; gap: 12px; }
          .md-rows dt, .md-rows dd { font-size: 14px; }
          .md-principles { grid-template-columns: 1fr; }
          .md-principle { gap: 10px; padding-top: 18px; }
          .md-principle h3 { font-size: 18px; }
          .md-price { padding: 24px 20px; gap: 18px; }
          .md-price__head { flex-direction: column-reverse; align-items: flex-start; }
          .md-price__name { font-size: 22px; }
          .md-price__amount { flex-direction: column; align-items: flex-start; gap: 2px; }
          .md-price__value { font-size: 42px; }
          .md-price--plain .md-price__value { font-size: 32px; }
          .md-price__cta { align-self: stretch; }
          .md-contact { padding: 48px 0; }
          .md-contact__title { font-size: 26px; line-height: 1.2; }
        }
      `}</style>

      {/* 1. Hero */}
      <section className="md-hero">
        <div className="md-shell md-hero__grid">
          <div className="md-hero__text">
            <p className="md-overline">&gt; Werben auf digital age</p>
            <h1 className="md-hero__title">Media<em>daten</em></h1>
            <p className="md-hero__lead">
              Das Schweizer Fachmedium für KI und Technologie. Ihre Anzeige erscheint neben Fachartikeln, in den Ressorts und im Swiss AI Verzeichnis – direkt verkauft, klar gekennzeichnet und ohne Tracking von Dritten.
            </p>
            <p className="md-hero__stats">
              {stats.map((s, i) => (
                <span key={s.label} style={{ display: "contents" }}>
                  {i > 0 && <span className="md-hero__sep" aria-hidden="true">/</span>}
                  <span><strong>{s.n}</strong> {s.label}</span>
                </span>
              ))}
            </p>
            <div className="md-hero__actions">
              <Link href={MEDIA_INQUIRY_HREF} className="da-btn da-btn--primary md-btn">Anfrage senden<Arrow /></Link>
              <a href="#formate" className="da-btn da-btn--secondary md-btn">Formate und Masse</a>
            </div>
          </div>

          <div className="md-hero__example md-only-wide">
            <p className="md-label">Beispiel · Startseite · Desktop</p>
            <MdFrame example="billboard" alt={`Billboard-Motiv von ${MEDIA_EXAMPLE_BRAND} auf der Startseite`} priority />
            <div className="md-hero__pair">
              <MdFrame example="mobile" width={250} alt={`Mobile-Motiv von ${MEDIA_EXAMPLE_BRAND}`} />
              <p>Dasselbe Angebot auf dem Handy: eigenes Motiv im Mobile-Format, automatisch ausgespielt.</p>
            </div>
          </div>
          <div className="md-hero__example md-only-narrow">
            <p className="md-label">Beispiel · Startseite · Mobile</p>
            <MdFrame example="mobile" alt={`Mobile-Motiv von ${MEDIA_EXAMPLE_BRAND} auf der Startseite`} />
          </div>
        </div>
      </section>

      {/* 2. Platzierungen */}
      <section className="md-section">
        <div className="md-shell">
          <div className="md-head">
            <p className="md-overline">Platzierungen</p>
            <h2 className="md-h2">Fünf Plätze, mit eigenen Motiven für Desktop und Mobile</h2>
            <p className="md-lead">
              Pro Platzierung liefern Sie ein Motiv für Desktop und eines für Mobile. Die Website spielt je nach Bildschirm automatisch das passende aus. Grün markiert: wo Ihre Anzeige steht.
            </p>
          </div>
          <div className="md-pls">
            {MEDIA_PLACEMENTS.map((p) => (
              <article key={p.no} className="md-pl">
                <div className="md-pl__text">
                  <div className="md-pl__head">
                    <span className="md-pl__no">{p.no}</span>
                    <h3 className="md-pl__title">{p.title}</h3>
                  </div>
                  <p className="md-pl__where">{placementWhere(p, startups)}</p>
                  <div className="md-only-narrow"><PlacementMobileMotif code={p.codes[0]} /></div>
                  <SpecRows p={p} />
                </div>
                <div className="md-only-wide">
                  <PlacementSketch code={p.codes[0]} />
                  {p.codes[0] === "rail_left" && (
                    <p className="md-rail-note">
                      Auf Laptops, Tablets und Handys erscheint die Rail nicht – dort wirken die übrigen vier Platzierungen.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Formate */}
      <section id="formate" className="md-section md-section--alt">
        <div className="md-shell">
          <div className="md-head">
            <p className="md-overline">Formate</p>
            <h2 className="md-h2">Alle Masse im Grössenvergleich</h2>
            <p className="md-lead">
              Am Beispiel von {MEDIA_EXAMPLE_BRAND}: sechs Motive, alle im Verhältnis zueinander dargestellt. Liefern Sie jedes Motiv in doppelter Auflösung, damit es auf hochauflösenden Bildschirmen scharf bleibt.
            </p>
          </div>
          <div className="md-formats">
            {MEDIA_EXAMPLE_ORDER.map((key, i) => {
              const e = MEDIA_EXAMPLES[key];
              const s = exampleSize(key);
              return (
                <figure key={key} className={`md-format md-format--${i + 1}`}>
                  <Image
                    className="md-format__img"
                    src={e.src}
                    alt={`${e.name}-Motiv von ${MEDIA_EXAMPLE_BRAND}, ${formatSize(s)} Pixel`}
                    width={s.w * RETINA}
                    height={s.h * RETINA}
                    unoptimized
                    style={{ ["--md-w" as string]: `${s.w}px` }}
                  />
                  <figcaption>
                    <span className="md-format__name">{e.name}</span>
                    <span className="md-format__size">{formatSize(s)}</span>
                  </figcaption>
                </figure>
              );
            })}
          </div>

          <div className="md-cards2">
            <div className="md-card">
              <h3 className="md-card__title">Bildmotiv</h3>
              <dl className="md-rows">
                {CREATIVE_SPECS.image.rows.map((r) => (
                  <div key={r.label} className="md-rows__row"><dt>{r.label}</dt><dd>{r.value}</dd></div>
                ))}
              </dl>
              <p className="md-card__note">{CREATIVE_SPECS.image.note}</p>
            </div>

            <div className="md-card">
              <h3 className="md-card__title">Text-Anzeige</h3>
              <p className="md-card__text">{CREATIVE_SPECS.text.intro}</p>
              <div className="md-example">
                <ModuleCard layout="wide" isHouse={false} headline={ex.headline} body={ex.body} ctaLabel={ex.cta} href="#formate" theme="card" preview />
              </div>
              <p className="md-limits">
                <span>Titel max. {TEXT_LIMITS.headline} Zeichen</span>
                <span className="md-limits__sep" aria-hidden="true">/</span>
                <span>Text max. {TEXT_LIMITS.body}</span>
                <span className="md-limits__sep" aria-hidden="true">/</span>
                <span>Button max. {TEXT_LIMITS.cta}</span>
              </p>
              <div className="md-themes">
                <span className="md-themes__label">Farbwelt</span>
                {CREATIVE_SPECS.text.themes.map((t) => {
                  const r = resolveTheme(t.code, null);
                  const swatch: React.CSSProperties = t.code === "custom"
                    ? { border: "1px dashed var(--da-muted)" }
                    : { background: r.background, border: `1px solid ${r.border === "transparent" ? r.background : r.border}` };
                  return (
                    <span key={t.code} className="md-theme">
                      <span className="md-theme__swatch" style={swatch} aria-hidden="true" />
                      {t.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Grundsaetze */}
      <section className="md-section">
        <div className="md-shell">
          <div className="md-head">
            <p className="md-overline">Grundsätze</p>
            <h2 className="md-h2">Werbung, der Leser vertrauen können</h2>
          </div>
          <div className="md-principles">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="md-principle">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--da-green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {p.icon}
                </svg>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Ablauf */}
      <section className="md-section md-section--alt">
        <div className="md-shell">
          <div className="md-head">
            <p className="md-overline">Ablauf</p>
            <h2 className="md-h2">Von der Anfrage bis zu Ihren Zahlen</h2>
          </div>
          <ol className="md-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="md-step">
                <span className="md-step__no">{String(i + 1).padStart(2, "0")}</span>
                <div className="md-step__body">
                  <span className="md-step__title">{s.title}</span>
                  <span className="md-step__text">{s.text}</span>
                  {s.link && <Link href={MEDIA_INQUIRY_HREF} className="md-step__link">Zum Anfrageformular{"\u00a0"}→</Link>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. Preise */}
      <section className="md-section">
        <div className="md-shell">
          <div className="md-head">
            <p className="md-overline">Preise</p>
            <h2 className="md-h2">Früh dabei sein</h2>
            <p className="md-lead">
              digital age ist jung und wächst. Partner der ersten Stunde sind drei Monate auf allen Plätzen präsent und behalten ihren Preis bei der Verlängerung.
            </p>
          </div>
          <div className="md-prices">
            {featured && (
              <div className="md-price md-price--featured">
                <div className="md-price__head">
                  <h3 className="md-price__name">{featured.name}</h3>
                  {featured.badge && <span className="md-price__badge">{featured.badge}</span>}
                </div>
                <div className="md-price__amount">
                  <span className="md-price__value">{featured.price}</span>
                  {featured.unit && <span className="md-price__unit">{featured.unit}</span>}
                </div>
                <ul className="md-price__lines">
                  {featured.lines.map((l) => <li key={l}><Check />{l}</li>)}
                </ul>
                <Link href={MEDIA_INQUIRY_HREF} className="da-btn da-btn--primary md-btn md-price__cta">Partner werden<Arrow /></Link>
              </div>
            )}
            {otherPrices.map((p) => (
              <div key={p.name} className="md-price md-price--plain">
                <div className="md-price__head">
                  <h3 className="md-price__name">{p.name}</h3>
                  {p.badge && <span className="md-price__badge">{p.badge}</span>}
                </div>
                <div className="md-price__amount">
                  <span className="md-price__value">{p.price}</span>
                  {p.unit && <span className="md-price__unit">{p.unit}</span>}
                </div>
                <ul className="md-price__lines">
                  {p.lines.map((l) => <li key={l}><Check muted />{l}</li>)}
                </ul>
                <Link href={MEDIA_INQUIRY_HREF} className="da-btn da-btn--secondary md-btn md-price__cta">Anfrage senden</Link>
              </div>
            ))}
          </div>
          <p className="md-note">{PRICE_NOTE}</p>

          {MEDIA_PARTNERS.length > 0 && (
            <div className="md-partners">
              <p className="md-label">Unsere Partner</p>
              <ul className="md-partners__list">
                {MEDIA_PARTNERS.map((p) => (
                  <li key={p.url}><a href={p.url} rel="sponsored nofollow noopener" target="_blank">{p.name}</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* 7. Kontakt-Band */}
      <section className="md-contact">
        <div className="md-shell md-contact__inner">
          <div className="md-contact__text">
            <h2 className="md-contact__title">Interesse an einer Platzierung?</h2>
            <p className="md-lead">
              Schreiben Sie uns, welche Fläche und welcher Zeitraum Sie interessiert. Wir melden uns mit Verfügbarkeiten und einer Offerte.
            </p>
          </div>
          <Link href={MEDIA_INQUIRY_HREF} className="da-btn da-btn--primary md-btn">Anfrage senden<Arrow /></Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

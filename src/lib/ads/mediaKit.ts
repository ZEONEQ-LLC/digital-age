// Mediadaten (/mediadaten): Inhalte fuer Werbekunden. Client-sicher.
// Masse kommen aus PLACEMENTS (placements.ts), Upload-Grenzen aus
// imageSpec.ts, Farbwelten aus creativeTheme.ts — hier nichts doppelt.
import {
  ASPECT_TOLERANCE, PLACEMENTS, expectedSize, type PlacementCode, type Size,
} from "@/lib/ads/placements";
import { CREATIVE_THEMES, type CreativeTheme } from "@/lib/ads/creativeTheme";
import { MODULE_IMAGE_MAX_BYTES, MODULE_IMAGE_MIME_EXT } from "@/lib/ads/imageSpec";

// Alle Anfrage-Buttons: Kontaktformular mit vorbelegtem Anliegen "werbung".
export const MEDIA_INQUIRY_HREF = "/kontakt?thema=werbung";

// Motive werden in doppelter Aufloesung geliefert (Retina).
export const RETINA = 2;

// Muss zu ad_placements.max_concurrent passen (Migration 20260924120000:
// alle Platzierungen 3). Gezaehlt werden Kunden, nicht Buchungen.
const SHARE = "max. 3 Kunden im Wechsel";

const RAIL_MIN_VIEWPORT = PLACEMENTS.rail_left.minViewport ?? 1680;

export type MediaPlacement = {
  no: string;
  // Der erste Code liefert die Masse; die Rail steht mit beiden Seiten.
  codes: PlacementCode[];
  title: string;
  where: string;
  bookable: string;
  share: string;
  // Formatname hinter den Desktop-Massen, z. B. "Half Page".
  desktopName?: string;
  // Zusatz zur Dateigroesse, z. B. "je Seite".
  fileNote?: string;
};

// Positionstexte geprueft gegen TopicListing.tsx (Aside links, Modul direkt
// unter den Kategorien, mobil ueber der Liste) und StartupsBrowser.tsx (Aside
// links, Modul unter "Eintragen", mobil ueber der Firmenliste).
export const MEDIA_PLACEMENTS: MediaPlacement[] = [
  {
    no: "01",
    codes: ["home_billboard"],
    title: "Startseite Billboard",
    where: "Auf der Startseite direkt unter den Aufmacher-Artikeln, vor den Ressorts. Die grösste Fläche der Website.",
    bookable: "Startseite",
    share: SHARE,
  },
  {
    no: "02",
    codes: ["hub_sidebar"],
    title: "Ressort-Sidebar",
    where: "In der linken Seitenleiste der Ressorts KI & Business und Future Tech, direkt unter den Kategorien. Auf dem Handy über der Artikelliste.",
    bookable: "beide Ressorts oder eines",
    share: SHARE,
    desktopName: "Half Page",
  },
  {
    no: "03",
    codes: ["swiss_ai_sidebar"],
    title: "Swiss AI Sidebar",
    where: "In der linken Seitenleiste des Swiss AI Verzeichnisses, unter dem Hinweis zum Eintragen. Auf dem Handy über der Firmenliste.",
    bookable: "Swiss AI Verzeichnis",
    share: SHARE,
    desktopName: "Medium Rectangle",
  },
  {
    no: "04",
    codes: ["article_inline"],
    title: "Artikel Inline",
    where: "Im oberen Teil des Artikels, nach den ersten Absätzen, in einem abgesetzten Band mit Kennzeichnung. Erscheint in allen längeren Artikeln.",
    bookable: "alle Artikel, ein Ressort oder einzelne Artikel",
    share: SHARE,
    desktopName: "Leaderboard",
  },
  {
    no: "05",
    codes: ["rail_left", "rail_right"],
    title: "Rail links und rechts",
    where: `Zwei senkrechte Flächen neben dem Inhalt, auf allen Seiten. Sie bleiben beim Scrollen stehen. Nur auf grossen Bildschirmen ab ${RAIL_MIN_VIEWPORT} Pixel Breite.`,
    bookable: "alle Seiten",
    share: SHARE,
    desktopName: "Skyscraper",
    fileNote: "je Seite",
  },
];

export function placementFormat(p: MediaPlacement): { desktop: Size; mobile: Size | null } {
  const code = p.codes[0];
  return { desktop: expectedSize(code, "desktop") as Size, mobile: expectedSize(code, "mobile") };
}

export function fileSize(s: Size): Size {
  return { w: s.w * RETINA, h: s.h * RETINA };
}

// Geschuetzte Leerzeichen: "1940 × 500" bricht nicht um.
export function formatSize(s: Size): string {
  return `${s.w}\u00a0×\u00a0${s.h}`;
}

export function sameSize(a: Size, b: Size | null): boolean {
  return !!b && a.w === b.w && a.h === b.h;
}

export const RAIL_MIN_WIDTH = RAIL_MIN_VIEWPORT;

// Beispielmotive (handyabo.com, Freigabe liegt vor). Lokal abgelegt, damit
// die Seite nicht an einer Kampagne haengt, die spaeter endet.
export const MEDIA_EXAMPLE_BRAND = "handyabo.com";

export type MediaExample = {
  name: string;
  src: string;
  code: PlacementCode;
  variant: "desktop" | "mobile";
};

export type MediaExampleKey = "billboard" | "leaderboard" | "halfpage" | "rectangle" | "mobile" | "rail";

export const MEDIA_EXAMPLES: Record<MediaExampleKey, MediaExample> = {
  billboard: { name: "Billboard", src: "/images/mediadaten/handyabo-billboard.png", code: "home_billboard", variant: "desktop" },
  leaderboard: { name: "Leaderboard", src: "/images/mediadaten/handyabo-leaderboard.png", code: "article_inline", variant: "desktop" },
  halfpage: { name: "Half Page", src: "/images/mediadaten/handyabo-halfpage.png", code: "hub_sidebar", variant: "desktop" },
  rectangle: { name: "Rectangle", src: "/images/mediadaten/handyabo-rectangle.png", code: "swiss_ai_sidebar", variant: "desktop" },
  mobile: { name: "Mobile Banner", src: "/images/mediadaten/handyabo-mobile-banner.png", code: "home_billboard", variant: "mobile" },
  rail: { name: "Rail", src: "/images/mediadaten/handyabo-rail.png", code: "rail_left", variant: "desktop" },
};

// Reihenfolge im Groessenvergleich.
export const MEDIA_EXAMPLE_ORDER: MediaExampleKey[] = ["billboard", "leaderboard", "halfpage", "rectangle", "mobile", "rail"];

export function exampleSize(key: MediaExampleKey): Size {
  const e = MEDIA_EXAMPLES[key];
  return expectedSize(e.code, e.variant) as Size;
}

// Zeichenlimits fuer Text-Anzeigen. Durchgesetzt in adActions.ts
// (typografische Kreative), angezeigt im Admin-Formular und hier.
export const TEXT_LIMITS = { headline: 60, body: 140, cta: 24 } as const;

const MIME_LABELS: Record<string, string> = { jpg: "JPG", png: "PNG", webp: "WebP", gif: "GIF" };

// Kundensprache fuer die Farbwelten (Admin nutzt die Labels aus creativeTheme.ts).
const THEME_LABELS: Record<CreativeTheme, string> = {
  card: "Karte",
  orange: "Orange",
  green: "Grün",
  dark: "Dunkel",
  custom: "Ihre Farbe",
};

export const CREATIVE_SPECS = {
  image: {
    rows: [
      { label: "Dateiformate", value: Object.values(MODULE_IMAGE_MIME_EXT).map((e) => MIME_LABELS[e] ?? e.toUpperCase()).join(", ") },
      { label: "Dateigrösse", value: `max. ${MODULE_IMAGE_MAX_BYTES / (1024 * 1024)} MB` },
      { label: "Auflösung", value: `doppelt empfohlen, z.\u00a0B. ${formatSize(fileSize(exampleSize("billboard")))}` },
      { label: "Seitenverhältnis", value: `exakt, ${Math.round(ASPECT_TOLERANCE * 100)} % Toleranz` },
      { label: "Motive", value: "je Platzierung Desktop und Mobile" },
      { label: "Link", value: "Ihre URL, öffnet in neuem Tab" },
    ],
    note: "Keine Skripte, kein HTML5 und keine Zählpixel im Motiv – nur das Bild und Ihr Link.",
  },
  text: {
    intro: "Kein Motiv zur Hand? Wir setzen Ihre Anzeige typografisch im Stil der Website – auf allen Platzierungen, Desktop und Mobile.",
    example: {
      headline: "Zahlst du zu viel für dein Abo?",
      body: "23 Anbieter, 148 Abos verglichen – in 60 Sekunden zum günstigsten Abo.",
      cta: "Jetzt vergleichen",
    },
    themes: CREATIVE_THEMES.map((t) => ({ code: t.code, label: THEME_LABELS[t.code] })),
  },
};

// Pakete: Preis-Karten auf /mediadaten und Vorbelegung auf /kontakt?paket=…
export const MEDIA_PACKAGES = ["komplett", "einzel"] as const;
export type MediaPackage = (typeof MEDIA_PACKAGES)[number];

export function isMediaPackage(value: string | null): value is MediaPackage {
  return value !== null && (MEDIA_PACKAGES as readonly string[]).includes(value);
}

// Anfrage-Link mit Paket, z. B. /kontakt?thema=werbung&paket=komplett.
export function mediaInquiryHref(key: MediaPackage): string {
  return `${MEDIA_INQUIRY_HREF}&paket=${key}`;
}

export type MediaPrice = {
  key: MediaPackage;
  name: string;
  price: string;
  unit?: string;
  badge?: string;
  lines: string[];
  cta: string;
};

const COMPLETE_TERM = "3 Monate";

const COMPLETE_PACKAGE: MediaPrice = {
  key: "komplett",
  name: "Komplettpaket",
  price: "CHF 1'500",
  unit: `für ${COMPLETE_TERM}`,
  // Geschuetzte Leerzeichen: bricht auf schmalen Bildschirmen hoechstens vor "MAX." um.
  badge: "EINFÜHRUNGSANGEBOT · MAX.\u00a03\u00a0KUNDEN",
  lines: [
    "Ihre Anzeige auf allen fünf Platzierungen, Desktop und Mobile",
    "Im Wechsel mit höchstens zwei weiteren Kunden",
    "Nennung Ihres Unternehmens auf dieser Seite",
    "Zahlen jederzeit über Ihren persönlichen Link",
    "Preis für die Verlängerung 12 Monate garantiert",
  ],
  cta: "Komplettpaket anfragen",
};

const SINGLE_BOOKING: MediaPrice = {
  key: "einzel",
  name: "Einzelbuchung",
  price: "auf Anfrage",
  lines: [
    "Eine Platzierung, ein Ressort oder einzelne Artikel",
    "Laufzeit ab einem Monat",
    "Dieselben Zahlen, derselbe Vorschau-Link",
  ],
  cta: "Einzelbuchung anfragen",
};

export const MEDIA_PRICING: MediaPrice[] = [COMPLETE_PACKAGE, SINGLE_BOOKING];

// Nachricht auf /kontakt?paket=… (nur in ein leeres Feld). Preis und
// Laufzeit kommen aus dem Paket oben, nicht doppelt getippt.
export const MEDIA_INQUIRY_MESSAGES: Record<MediaPackage, string> = {
  komplett: `Ich interessiere mich für das Komplettpaket (alle Platzierungen, ${COMPLETE_TERM}, ${COMPLETE_PACKAGE.price}).`,
  einzel: "Ich interessiere mich für eine Einzelbuchung. Platzierung und Zeitraum: ",
};

export const PRICE_NOTE = "Preise in CHF.";

// Werbekunden, die auf /mediadaten genannt werden. Leer = Abschnitt
// "Aktuelle Werbekunden" wird nicht gerendert.
export const MEDIA_PARTNERS: { name: string; url: string }[] = [];

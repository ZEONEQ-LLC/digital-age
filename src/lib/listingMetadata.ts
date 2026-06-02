import type { Metadata } from "next";

// Listing-Page-Metadata-Helper (Block-1-SEO).
//
// Bündelt das identische OG/Twitter/Canonical-Setup für die statischen
// Listing-Pages (Homepage, Kategorien, Index-Seiten). Article-Detail
// nutzt diesen Helper NICHT — dort ist alles dynamisch (locale, cover,
// excerpt) und lebt direkt in der Page-Datei.
//
// Pattern strict am Article-Detail-Vorbild orientiert: `alternates.canonical`
// mit relativem Pfad (Root-Layout setzt `metadataBase`, Next macht die
// Auflösung zu absoluter URL), OG-Default-Bild auf das vorhandene 1200×630-
// Asset.

const OG_IMAGE_PATH = "/images/digital-age-og-fallback.jpg";
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const SITE_NAME = "digital age";

// OG-Locale-Whitelist (FB/LinkedIn): `de_CH` ist nicht in der akzeptierten
// Liste, daher `de_DE` (deckt den deutschsprachigen Raum ab). Selber
// Reasoning wie im Article-Detail (siehe ogLocale-Kommentar dort).
const OG_LOCALE = "de_DE";

export function buildListingMetadata({
  path,
  title,
  description,
  imageAlt,
}: {
  path: string;
  title: string;
  description: string;
  imageAlt?: string;
}): Metadata {
  const altText = imageAlt ?? title;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: OG_LOCALE,
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      images: [
        {
          url: OG_IMAGE_PATH,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: altText,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: OG_IMAGE_PATH, alt: altText }],
    },
  };
}

import type { Metadata } from "next";
import { Inter, Roboto_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import NewsTicker from "@/components/NewsTicker";
import NewsTickerGate from "@/components/NewsTickerGate";
import ConsentInit from "@/components/ConsentInit";
import ConsentManagerGate from "@/components/ConsentManagerGate";
import AnalyticsGate from "@/components/AnalyticsGate";
import { getBaseUrl } from "@/lib/siteUrl";

// Self-hosted Google Fonts via next/font/google. Wird zur Build-Time von
// Google geladen und mit den Site-Assets ausgeliefert — keine Runtime-
// Requests an fonts.googleapis.com (DSGVO-relevant, BGH-Urteil 2022).
// latin-ext deckt Schweizer/Deutsche Umlaute + ßzfff... ab.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});
const robotoMono = Roboto_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-roboto-mono",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-space-grotesk",
});

// metadataBase macht `alternates.canonical: "/foo"` und relative OG-Image-
// Pfade pro Page auflösbar zu absoluten URLs. Quelle ist getBaseUrl()
// (NEXT_PUBLIC_SITE_URL → VERCEL_URL → localhost) — selbe Logik wie
// Sitemap und Article-Detail-Page.
//
// Default-OG/Twitter sind Fallback für Pages, die kein eigenes openGraph/
// twitter definieren. Listing-Pages überschreiben über buildListingMetadata,
// Article-Detail-Page überschreibt vollständig inline.
const DEFAULT_OG_IMAGE = "/images/digital-age-og-fallback.jpg";
const DEFAULT_TITLE = "digital age — Magazin für KI, Future Tech und Tools";
const DEFAULT_DESCRIPTION =
  "Nachrichten, Analysen und Empfehlungen rund um Künstliche Intelligenz und Future Tech. Schweizer Perspektive für Entscheider und Praktiker.";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "digital age",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: DEFAULT_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, alt: DEFAULT_TITLE }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="de"
      className={`${inter.variable} ${robotoMono.variable} ${spaceGrotesk.variable}`}
    >
      <body>
        <ConsentInit />
        <Navbar />
        {/* NewsTicker zentral im Layout (statt pro Page importiert) —
            verhindert dass Client-Pages den Server-Component direkt
            importieren und damit `@supabase/supabase-js`-createClient im
            Browser-Bundle landet. NewsTickerGate hidet auf /autor/-Pfaden. */}
        <NewsTickerGate>
          <NewsTicker />
        </NewsTickerGate>
        {children}
        <ConsentManagerGate />
        <AnalyticsGate />
      </body>
    </html>
  );
}

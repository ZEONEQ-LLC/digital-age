import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";
import NewsTicker from "@/components/NewsTicker";
import NewsTickerGate from "@/components/NewsTickerGate";
import ConsentInit from "@/components/ConsentInit";
import ConsentManagerGate from "@/components/ConsentManagerGate";
import AnalyticsGate from "@/components/AnalyticsGate";
import RailModules from "@/components/module/RailModules";
import { getBaseUrl } from "@/lib/siteUrl";

// Schriften liegen im Repo (src/app/fonts, Herkunft im README dort) und
// werden mit den Site-Assets ausgeliefert: kein Download von Google beim
// Build (der liess Deploys scheitern) und keine Runtime-Requests an
// fonts.googleapis.com (DSGVO, BGH-Urteil 2022). Je Schrift eine variable
// woff2 mit latin + latin-ext. Pro Gewicht ein Eintrag auf dieselbe Datei,
// wie bisher bei Google: Zwischengewichte fallen auf dieselben Schnitte.
const inter = localFont({
  src: [
    { path: "./fonts/inter-var.woff2", weight: "300", style: "normal" },
    { path: "./fonts/inter-var.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-var.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-var.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter-var.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-inter",
});
const robotoMono = localFont({
  src: [
    { path: "./fonts/roboto-mono-var.woff2", weight: "400", style: "normal" },
    { path: "./fonts/roboto-mono-var.woff2", weight: "500", style: "normal" },
    { path: "./fonts/roboto-mono-var.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-roboto-mono",
});
const spaceGrotesk = localFont({
  src: [
    { path: "./fonts/space-grotesk-var.woff2", weight: "500", style: "normal" },
    { path: "./fonts/space-grotesk-var.woff2", weight: "700", style: "normal" },
  ],
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
        <RailModules />
        <ConsentManagerGate />
        <AnalyticsGate />
      </body>
    </html>
  );
}

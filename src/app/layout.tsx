import type { Metadata } from "next";
import { Inter, Roboto_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import NewsTicker from "@/components/NewsTicker";
import NewsTickerGate from "@/components/NewsTickerGate";

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

export const metadata: Metadata = {
  title: "digital age",
  description: "KI, Future Tech & Tools",
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
        <Navbar />
        {/* NewsTicker zentral im Layout (statt pro Page importiert) —
            verhindert dass Client-Pages den Server-Component direkt
            importieren und damit `@supabase/supabase-js`-createClient im
            Browser-Bundle landet. NewsTickerGate hidet auf /autor/-Pfaden. */}
        <NewsTickerGate>
          <NewsTicker />
        </NewsTickerGate>
        {children}
      </body>
    </html>
  );
}

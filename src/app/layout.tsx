import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import NewsTicker from "@/components/NewsTicker";
import NewsTickerGate from "@/components/NewsTickerGate";

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
    <html lang="de">
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

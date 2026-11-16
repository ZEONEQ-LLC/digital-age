import { buildSitemapEntries } from "@/lib/sitemap/entries";
import { renderSitemapXml } from "@/lib/sitemap/xml";

// /sitemap.xml. Die Route laeuft bei jeder Anfrage, die an ihr ankommt; der
// CDN haelt die Antwort eine Stunde (s-maxage) und liefert waehrend der
// Erneuerung noch bis zu einem Tag die alte aus (stale-while-revalidate).
// So erscheint ein neuer Artikel spaetestens nach einer Stunde, ohne Deploy.
// Begruendung, warum nicht mehr app/sitemap.ts: src/lib/sitemap/entries.ts.
export const dynamic = "force-dynamic";

export async function GET() {
  const xml = renderSitemapXml(await buildSitemapEntries());
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

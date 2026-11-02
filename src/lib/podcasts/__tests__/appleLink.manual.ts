// Manueller Test-Runner fuer src/lib/podcasts/appleLink.ts.
//   npx tsx src/lib/podcasts/__tests__/appleLink.manual.ts
import { extractAppleUrl, parseAppleLink } from "../appleLink";

let fails = 0;
function eq(label: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`      erwartet: ${JSON.stringify(expected)}\n      erhalten: ${JSON.stringify(actual)}`);
}

eq("Folge mit Laendercode und l=", parseAppleLink("https://podcasts.apple.com/ch/podcast/the-great-ai-debate/id1291423644?i=1000790301141&l=en-GB"),
  { showId: "1291423644", episodeId: "1000790301141", url: "https://podcasts.apple.com/ch/podcast/the-great-ai-debate/id1291423644?i=1000790301141" });
eq("Show ohne Folge", parseAppleLink("https://podcasts.apple.com/de/podcast/der-ki-podcast/id1698961192"),
  { showId: "1698961192", episodeId: null, url: "https://podcasts.apple.com/de/podcast/der-ki-podcast/id1698961192" });
eq("Show mit Slash am Ende", parseAppleLink("https://podcasts.apple.com/de/podcast/der-ki-podcast/id1698961192/")?.showId, "1698961192");
eq("Leerzeichen aussen", parseAppleLink("  https://podcasts.apple.com/de/podcast/x/id123 ")?.showId, "123");
eq("kein Apple-Host", parseAppleLink("https://open.spotify.com/episode/4LkTOo2zKeaphGGyuoQKVr"), null);
eq("http abgelehnt", parseAppleLink("http://podcasts.apple.com/de/podcast/x/id123"), null);
eq("ohne id", parseAppleLink("https://podcasts.apple.com/de/podcast/x"), null);
eq("i ohne Ziffern ignoriert", parseAppleLink("https://podcasts.apple.com/de/podcast/x/id123?i=abc")?.episodeId, null);
eq("Muell", parseAppleLink("nicht-mal-eine-url"), null);

eq("extract aus Text", extractAppleUrl("Hör dir das an: https://podcasts.apple.com/ch/podcast/x/id1?i=2. Toll!"), "https://podcasts.apple.com/ch/podcast/x/id1?i=2");
eq("extract ohne Link", extractAppleUrl("nur Text"), null);

console.log(fails === 0 ? "\nalles gruen" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);

// Manueller Test-Runner fuer src/lib/ads/utm.ts (kein Vitest/Jest im Repo).
//
//   npx tsx src/lib/ads/__tests__/utm.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import { buildTrackedUrl, hasOwnUtmParams, isValidUtmCampaign, slugCampaign, utmContentFor } from "../utm";

let fails = 0;
function eq(label: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`      erwartet: ${String(expected)}\n      erhalten: ${String(actual)}`);
}

const opts = { campaign: "topinserate", placementCode: "home_billboard", variant: "desktop" };
const tail = "utm_source=digital-age&utm_medium=banner&utm_campaign=topinserate&utm_content=home-billboard-desktop";

eq("Root-URL", buildTrackedUrl("https://topinserate.ch", opts), `https://topinserate.ch/?${tail}`);
eq("URL mit Pfad", buildTrackedUrl("https://topinserate.ch/de", opts), `https://topinserate.ch/de?${tail}`);
eq("URL mit Query", buildTrackedUrl("https://example.ch/p?ref=x%20y&b=2", opts), `https://example.ch/p?ref=x%20y&b=2&${tail}`);
eq("URL mit Fragment", buildTrackedUrl("https://example.ch/p#abschnitt", opts), `https://example.ch/p?${tail}#abschnitt`);
eq("URL mit Query und Fragment", buildTrackedUrl("https://example.ch/p?a=1#f", opts), `https://example.ch/p?a=1&${tail}#f`);
eq("Eigenes utm_source bleibt", buildTrackedUrl("https://example.ch/?utm_source=kunde", opts), "https://example.ch/?utm_source=kunde");
eq("Eigenes UTM gross geschrieben bleibt", buildTrackedUrl("https://example.ch/?UTM_Campaign=x", opts), "https://example.ch/?UTM_Campaign=x");
eq("Relative URL bleibt", buildTrackedUrl("/newsletter", opts), "/newsletter");
eq("mailto bleibt", buildTrackedUrl("mailto:info@example.ch", opts), "mailto:info@example.ch");
eq("http bleibt http", buildTrackedUrl("http://example.ch/x", opts), `http://example.ch/x?${tail}`);
eq("Mobile-Variante", buildTrackedUrl("https://example.ch", { ...opts, placementCode: "article_inline", variant: "mobile" }), "https://example.ch/?utm_source=digital-age&utm_medium=banner&utm_campaign=topinserate&utm_content=article-inline-mobile");

eq("utmContentFor rail", utmContentFor("rail_left", "desktop"), "rail-left-desktop");
eq("hasOwnUtmParams ja", hasOwnUtmParams("https://x.ch/?utm_medium=cpc"), true);
eq("hasOwnUtmParams nein", hasOwnUtmParams("https://x.ch/?ref=1"), false);
eq("hasOwnUtmParams relativ", hasOwnUtmParams("/x?utm_source=a"), false);

eq("slugCampaign Umlaute", slugCampaign("Handyabo Frühling & Sommer 2026"), "handyabo-fruehling-und-sommer-2026");
eq("isValidUtmCampaign ok", isValidUtmCampaign("topinserate-herbst-2026"), true);
eq("isValidUtmCampaign Grossbuchstabe", isValidUtmCampaign("Topinserate"), false);
eq("isValidUtmCampaign Bindestrich am Rand", isValidUtmCampaign("-x"), false);
eq("isValidUtmCampaign leer", isValidUtmCampaign(""), false);
eq("isValidUtmCampaign zu lang", isValidUtmCampaign("a".repeat(81)), false);

console.log(fails === 0 ? "\nalles gruen" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);

// Manueller Test-Runner fuer die festen Quellen des Plattform-Jobs (PR 206):
// src/lib/platforms/sources.ts.
//
//   npx tsx src/lib/platforms/__tests__/sources.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import {
  digestHash,
  htmlToLines,
  isCovered,
  mergeByKey,
  normalizeKey,
  parseAppleChart,
  parseArenaRows,
  parseAudioRanking,
  priceDigest,
} from "../sources";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}

console.log("=== HTML und Preis-Auszug ===");
{
  const html = `<html><head><style>.x{}</style><script>var price="$999/month"</script></head><body>
    <h1>Pricing</h1><p>Choose your plan</p>
    <div><h3>Free</h3><p>$0 / month</p></div>
    <div><h3>Pro</h3><p>$20&nbsp;/ month</p><a href="#">Get <span>Pro</span></a></div>
    <p>Cookie-Hinweis vom 13.11.2026</p><!-- $5 kommentar --></body></html>`;
  const lines = htmlToLines(html);
  ok("Script, Style, Kommentar entfernt", !lines.join(" ").includes("999") && !lines.join(" ").includes("kommentar"));
  ok("Bloecke als Zeilen, Entities", lines.includes("$20 / month") && lines.includes("Pricing"), JSON.stringify(lines));
  ok("Inline-Elemente bleiben in der Zeile", lines.includes("Get Pro"), JSON.stringify(lines));
  const d = priceDigest(lines);
  ok("Auszug nur mit Preiszeilen", d.includes("$20 / month") && d.includes("Free") && !d.includes("Cookie"), d);
  const other = priceDigest(htmlToLines(html.replace("13.11.2026", "20.11.2026")));
  ok("Datum im Text aendert den Hash nicht", digestHash(d) === digestHash(other));
  ok("neuer Preis aendert den Hash", digestHash(d) !== digestHash(priceDigest(htmlToLines(html.replace("$20", "$25")))));
  ok("CHF und /Monat erkannt", priceDigest(["Business CHF 30 pro Nutzer", "Über uns"]).includes("CHF 30") && priceDigest(["9.– / Monat"]).length > 0);
}

console.log("=== Abgleich mit dem Bestand ===");
{
  const platforms = [
    { name: "ChatGPT", url: "https://chatgpt.com", source_keys: ["openai", "chatgpt"] },
    { name: "Gemini", url: "https://gemini.google.com", source_keys: ["google", "gemini"] },
    { name: "Mistral AI", url: "https://mistral.ai", source_keys: ["mistral", "le chat"] },
  ];
  ok("App ChatGPT bekannt", isCovered(["ChatGPT", "OpenAI OpCo, LLC"], platforms));
  ok("Arena-Hersteller openai bekannt", isCovered(["openai", "GPT-Image-2"], platforms));
  ok("Le Chat ueber Schluessel", isCovered(["Le Chat by Mistral AI", "Mistral AI"], platforms));
  ok("Kimi unbekannt", !isCovered(["moonshot", "Kimi K3"], platforms));
  ok("Teilwort zaehlt nicht («googled» ≠ google)", !isCovered(["googled app", "Foo"], platforms));
  ok("normalizeKey", normalizeKey("Zürich-AI, Inc.") === "zurich ai inc");
}

console.log("=== App Store ===");
{
  const feed = { feed: { results: [
    { id: "1", name: "Claude by Anthropic", artistName: "Anthropic PBC", genres: [{ genreId: "6007", name: "Produktivität" }] },
    { id: "2", name: "Ein Spiel", artistName: "X", genres: [{ genreId: "6014", name: "Spiele" }] },
    { id: "3", name: "Kimi", artistName: "Moonshot", genres: [] },
  ] } };
  const ch = parseAppleChart(feed, "ch");
  ok("Spiele fallen weg", ch.length === 2 && !ch.some((c) => c.label === "Ein Spiel"));
  ok("key, Platz, Hinweis", ch[1].key === "apple:3" && ch[1].priority === 3 && ch[1].hint.startsWith("App Store CH Platz 3"));
  const de = parseAppleChart({ feed: { results: [{ id: "3", name: "Kimi", artistName: "Moonshot", genres: [] }] } }, "de");
  const merged = mergeByKey([...ch, ...de]);
  ok("gleiche App in DE: bester Platz", merged.find((c) => c.key === "apple:3")?.priority === 1 && merged.find((c) => c.key === "apple:3")?.hint.includes("App Store DE Platz 1") === true);
  ok("kaputter Feed = leer", parseAppleChart({}, "ch").length === 0 && parseAppleChart(null, "ch").length === 0);
}

console.log("=== Arena ===");
{
  const row = (rank: number, org: string, model: string, category = "overall") => ({ row: { rank, organization: org, model_name: model, category } });
  const json = { rows: [row(2, "openai", "GPT-Image-2"), row(1, "openai", "GPT-Image-2.5"), row(3, "reve", "Reve 2.1"), row(1, "google", "Nano", "photorealistic")] };
  const r = parseArenaRows(json, "text_to_image");
  ok("nur overall, ein Eintrag pro Hersteller, nach Rang", r.map((c) => c.label).join() === "openai,reve", JSON.stringify(r.map((c) => c.label)));
  ok("Kategorie Bild, Prioritaet nach Apps", r[0].category === "Image" && r[0].priority === 1001);
  ok("unbekannte Konfiguration = leer", parseArenaRows(json, "gibtsnicht").length === 0);
  ok("ab Platz 21 kein Kandidat", parseArenaRows({ rows: [row(21, "diffbot", "X")] }, "search").length === 0);
}

console.log("=== Artificial Analysis (Audio) ===");
{
  const json = { tier: "free", data: [
    { name: "TTS A", model_creator: { name: "Inworld" }, elo: 1240 },
    { name: "TTS B", model_creator: { name: "ElevenLabs" }, elo: 1260 },
    { name: "TTS C", model_creator: { name: "Inworld" }, elo: 1100 },
  ] };
  const r = parseAudioRanking(json, "Sprachausgabe");
  ok("nach Elo, Hersteller einmal", r.map((c) => c.label).join() === "ElevenLabs,Inworld");
  ok("Kategorie Audio", r.every((c) => c.category === "Audio" && c.key.startsWith("audio:")));
}

console.log(fails === 0 ? "\nAlles gruen." : `\n${fails} Fehler.`);
process.exit(fails === 0 ? 0 : 1);

// Manueller Test-Runner fuer die KI-Plattformen-Pruefung (PR 197, feste
// Quellen PR 206): src/lib/platforms/research.ts.
//
//   npx tsx src/lib/platforms/__tests__/research.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import {
  MAX_ADDITIONS,
  MAX_UPDATES,
  PLATFORM_RESEARCH_STRATEGY,
  buildAdditionPrompt,
  buildAppFilterPrompt,
  buildPageCheckPrompt,
  parseAdditions,
  parseAppFilter,
  parsePageCheck,
  parseResearch,
  slugifyPlatform,
  type PlatformForResearch,
} from "../research";

let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
}

const base = (slug: string, extra: Partial<PlatformForResearch> = {}): PlatformForResearch => ({
  slug, name: slug.toUpperCase(), category: "LLM", tagline: `Tagline ${slug}`, hosting: "US", pricing: "Gratis + Pro",
  url: `https://${slug}.example.com`, status: "active", locked: false, ...extra,
});
const current = [
  base("claude", { name: "Claude", url: "https://claude.ai" }),
  base("mistral", { name: "Mistral AI", hosting: "EU", url: "https://mistral.ai/" }),
  base("swissgpt", { name: "Swiss GPT", url: null, hosting: "CH" }),
  base("locked", { locked: true }),
  base("alt", { status: "archived" }),
];
const SRC = ["https://quelle.example.com/preise"];
const parse = (o: unknown) => parseResearch(JSON.stringify(o), current);

console.log("=== Prompts (feste Quellen) ===");
{
  const page = buildPageCheckPrompt(current[0], "https://claude.com/pricing", "Pro $20/month\nMax $100/month");
  ok("Preisseite: Strategie und Aufgabe", page.system.includes(PLATFORM_RESEARCH_STRATEGY.split("\n")[0]) && page.system.includes('"discontinued"'));
  ok("Preisseite: Auszug und Quelle im Prompt", page.prompt.includes("Max $100/month") && page.prompt.includes("https://claude.com/pricing") && page.prompt.includes("«Gratis + Pro»"));
  ok("Override ersetzt Strategie", !buildPageCheckPrompt(current[0], "https://x.ch", "", "EIGEN").system.includes("GRUNDSATZ:"));
  ok("keine Websuche mehr im Auftrag", !PLATFORM_RESEARCH_STRATEGY.toLowerCase().includes("websuche"));
  ok("CN in den Textregeln", PLATFORM_RESEARCH_STRATEGY.includes("CN"));
  const apps = buildAppFilterPrompt([{ key: "apple:1", label: "Kimi", hint: "App Store CH Platz 40" }]);
  ok("App-Filter: Liste mit key", apps.prompt.includes("apple:1 | Kimi |") && apps.system.includes('"ai"'));
  const add = buildAdditionPrompt([{ key: "arena:moonshot", label: "moonshot", hint: "Arena Text Platz 5", category: "LLM" }], ["Claude"]);
  ok("Neuaufnahme: Kandidat und Bestand", add.prompt.includes("arena:moonshot | moonshot") && add.prompt.includes("Bereits im Verzeichnis: Claude"));
}

console.log("=== parsePageCheck ===");
{
  const url = "https://claude.com/pricing";
  const r = parsePageCheck(JSON.stringify({ pricing: "Gratis + Pro + Max", discontinued: false, reason: "Seite nennt Max." }), current[0], url);
  ok("Preis-Update mit Seite als Quelle", r?.updates.length === 1 && r.updates[0].fields.pricing === "Gratis + Pro + Max" && r.updates[0].sources[0] === url);
  ok("null = keine Aenderung, aber geprueft", (() => { const x = parsePageCheck(JSON.stringify({ pricing: null, discontinued: false, reason: "stimmt" }), current[0], url); return x?.updates.length === 0 && x.archive.length === 0 && x.checked[0] === "claude"; })());
  ok("eingestellt → archivieren", parsePageCheck(JSON.stringify({ pricing: null, discontinued: true, reason: "Seite: eingestellt" }), current[0], url)?.archive.length === 1);
  ok("gesperrt bleibt unberuehrt", parsePageCheck(JSON.stringify({ pricing: "X", discontinued: true, reason: "r" }), current[3], url)?.updates.length === 0);
  ok("kein JSON → null", parsePageCheck("Der Preis stimmt.", current[0], url) === null);
}

console.log("=== parseAppFilter ===");
{
  const keys = ["apple:1", "apple:2", "apple:3"];
  const r = parseAppFilter(JSON.stringify({ ai: [{ key: "apple:1", category: "LLM" }, { key: "apple:9", category: "LLM" }, { key: "apple:2", category: "Spiele" }, { key: "apple:1", category: "Image" }] }), keys);
  ok("nur bekannte keys, gueltige Kategorie, keine Dubletten", r?.length === 1 && r[0].key === "apple:1" && r[0].category === "LLM", JSON.stringify(r));
  ok("kein JSON → null", parseAppFilter("keine", keys) === null);
}

console.log("=== parseAdditions ===");
{
  const cands = [{ key: "arena:moonshot", sourceUrl: "https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset" }];
  const kimi = { key: "arena:moonshot", name: "Kimi", category: "LLM", tagline: "KI-Assistent von Moonshot AI.", hosting: "CN", pricing: "Gratis + Pro", url: "https://www.kimi.com", pricing_url: "https://www.kimi.com/membership/pricing", reason: "Arena Text Platz 5" };
  const r = parseAdditions(JSON.stringify({ additions: [kimi] }), current, cands);
  ok("CN-Eintrag angenommen, Quelle = Liste", r?.length === 1 && r[0].hosting === "CN" && r[0].sources[0].includes("huggingface.co") && r[0].pricingUrl === "https://www.kimi.com/membership/pricing", JSON.stringify(r));
  ok("unbekannter key verworfen", parseAdditions(JSON.stringify({ additions: [{ ...kimi, key: "arena:xyz" }] }), current, cands)?.length === 0);
  ok("schon vorhanden (Name) verworfen", parseAdditions(JSON.stringify({ additions: [{ ...kimi, name: "Claude" }] }), current, cands)?.length === 0);
  ok("ohne Link verworfen", parseAdditions(JSON.stringify({ additions: [{ ...kimi, url: null }] }), current, cands)?.length === 0);
  ok("Preisseite http → null", parseAdditions(JSON.stringify({ additions: [{ ...kimi, pricing_url: "http://kimi.com" }] }), current, cands)?.[0].pricingUrl === null);
}

console.log("=== Parser: Updates ===");
{
  const r = parse({ updates: [{ slug: "claude", fields: { pricing: "Gratis, Pro, Max" }, reason: "Neue Stufe", sources: SRC }] });
  ok("Update angenommen", r?.updates.length === 1 && r.updates[0].fields.pricing === "Gratis, Pro, Max");
  ok("ohne Quelle verworfen", parse({ updates: [{ slug: "claude", fields: { pricing: "X" }, reason: "r", sources: [] }] })?.updates.length === 0);
  ok("http-Quelle zaehlt nicht", parse({ updates: [{ slug: "claude", fields: { pricing: "X" }, reason: "r", sources: ["http://a.ch"] }] })?.updates.length === 0);
  ok("gesperrt verworfen", parse({ updates: [{ slug: "locked", fields: { pricing: "X" }, reason: "r", sources: SRC }] })?.updates.length === 0);
  ok("archiviert verworfen", parse({ updates: [{ slug: "alt", fields: { pricing: "X" }, reason: "r", sources: SRC }] })?.updates.length === 0);
  ok("unbekannt verworfen", parse({ updates: [{ slug: "gibtsnicht", fields: { pricing: "X" }, reason: "r", sources: SRC }] })?.updates.length === 0);
  ok("gleicher Wert = keine Aenderung", parse({ updates: [{ slug: "claude", fields: { pricing: "Gratis + Pro" }, reason: "r", sources: SRC }] })?.updates.length === 0);
  ok("Link nur mit Schraegstrich anders = keine Aenderung",
    parse({ updates: [{ slug: "mistral", fields: { url: "https://mistral.ai" }, reason: "r", sources: SRC }] })?.updates.length === 0);
  ok("Link fuer Swiss GPT gesetzt",
    parse({ updates: [{ slug: "swissgpt", fields: { url: "https://swissgpt.ch" }, reason: "r", sources: SRC }] })?.updates[0]?.fields.url === "https://swissgpt.ch");
  ok("http-Link verworfen", parse({ updates: [{ slug: "claude", fields: { url: "http://claude.ai" }, reason: "r", sources: SRC }] })?.updates.length === 0);
  ok("unbekanntes Hosting ignoriert", parse({ updates: [{ slug: "claude", fields: { hosting: "Mars" }, reason: "r", sources: SRC }] })?.updates.length === 0);
  ok("Eszett wird ss", parse({ updates: [{ slug: "claude", fields: { tagline: "Grösser und schneller, ß" }, reason: "r", sources: SRC }] })?.updates[0]?.fields.tagline?.endsWith("ss") === true);
  const many = Array.from({ length: 10 }, (_, i) => ({ slug: i % 2 ? "claude" : "mistral", fields: { pricing: `P${i}` }, reason: "r", sources: SRC }));
  ok(`hoechstens ${MAX_UPDATES} Updates`, (parse({ updates: many })?.updates.length ?? 99) <= MAX_UPDATES);
}

console.log("=== Parser: Neuaufnahmen ===");
{
  const add = (o: Record<string, unknown>) => ({ name: "Aleph Alpha", category: "LLM", tagline: "Souveräne KI aus Deutschland.", hosting: "EU", pricing: "Enterprise", url: "https://aleph-alpha.com", reason: "Relevant", sources: SRC, ...o });
  ok("Neuaufnahme angenommen", parse({ additions: [add({})] })?.additions.length === 1);
  ok("ohne Link verworfen", parse({ additions: [add({ url: null })] })?.additions.length === 0);
  ok("bekannter Name verworfen", parse({ additions: [add({ name: "claude" })] })?.additions.length === 0);
  ok("bekannter Host verworfen", parse({ additions: [add({ name: "Claude Neu", url: "https://claude.ai/neu" })] })?.additions.length === 0);
  ok("archivierter Name zaehlt als bekannt", parse({ additions: [add({ name: "ALT" })] })?.additions.length === 0);
  ok("Dublette im selben Lauf", parse({ additions: [add({}), add({ url: "https://aa.example.com" })] })?.additions.length === 1);
  ok("unbekannte Kategorie verworfen", parse({ additions: [add({ category: "Robotik" })] })?.additions.length === 0);
  const five = Array.from({ length: 5 }, (_, i) => add({ name: `Tool ${i}`, url: `https://tool${i}.example.com` }));
  ok(`hoechstens ${MAX_ADDITIONS} Neuaufnahmen`, parse({ additions: five })?.additions.length === MAX_ADDITIONS);
}

console.log("=== Parser: Archiv, checked, Format ===");
{
  ok("Archiv angenommen", parse({ archive: [{ slug: "claude", reason: "eingestellt", sources: SRC }] })?.archive.length === 1);
  ok("Archiv + Update derselben Plattform: nur Update",
    (() => { const r = parse({ updates: [{ slug: "claude", fields: { pricing: "Neu" }, reason: "r", sources: SRC }], archive: [{ slug: "claude", reason: "x", sources: SRC }] }); return r?.updates.length === 1 && r.archive.length === 0; })());
  ok("checked nur bekannte Slugs", JSON.stringify(parse({ checked: ["claude", "claude", "erfunden"] })?.checked) === '["claude"]');
  ok("kein JSON → null", parseResearch("Leider konnte ich nichts finden.", current) === null);
  ok("JSON nach Text mit Klammern",
    parseResearch('Ich habe {viel} gesucht.\n{"updates": [], "additions": [], "archive": [], "checked": ["mistral"]}', current)?.checked[0] === "mistral");
  ok("JSON im Code-Block", parseResearch('```json\n{"checked": ["claude"]}\n```', current)?.checked[0] === "claude");
}

console.log("=== slugifyPlatform ===");
ok("Umlaute", slugifyPlatform("Künstliche Ölmühle") === "kuenstliche-oelmuehle");
ok("Sonderzeichen", slugifyPlatform("DALL·E 3") === "dall-e-3");

console.log(fails === 0 ? "\nAlles gruen." : `\n${fails} Fehler.`);
process.exit(fails === 0 ? 0 : 1);

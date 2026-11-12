// Manueller Test-Runner fuer die KI-Plattformen-Pruefung (PR 197):
// src/lib/platforms/research.ts.
//
//   npx tsx src/lib/platforms/__tests__/research.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.
import {
  MAX_ADDITIONS,
  MAX_UPDATES,
  PLATFORM_RESEARCH_STRATEGY,
  buildResearchPrompt,
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

console.log("=== Prompt ===");
{
  const { system, prompt } = buildResearchPrompt(current);
  ok("Strategie im System", system.includes(PLATFORM_RESEARCH_STRATEGY.split("\n")[0]));
  ok("Ausgabeformat im System", system.includes('"updates"') && system.includes('"checked"'));
  ok("Gesperrt markiert", prompt.includes("locked |") && prompt.includes("GESPERRT"));
  ok("Kein Link sichtbar", prompt.includes("(kein Link)"));
  const custom = buildResearchPrompt(current, "EIGENE STRATEGIE");
  ok("Override ersetzt Strategie", custom.system.includes("EIGENE STRATEGIE") && !custom.system.includes("AUFTRAG:"));
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

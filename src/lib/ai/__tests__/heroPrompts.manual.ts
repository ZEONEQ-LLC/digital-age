// Manueller Test-Runner fuer src/lib/ai/heroPrompts.ts (Parser mit Fixture-Antworten).
//   npx tsx src/lib/ai/__tests__/heroPrompts.manual.ts
// Exit 0 = alles gruen, 1 = mind. ein Fail.

import {
  buildHeroProposalsPrompt, buildHeroProposalsSystem, buildSocialPostsSystem,
  finishPost, heroContentHash, parseHeroProposals, parseHeroProposalsStore, parseSocialPosts,
  HERO_PROPOSALS_STRATEGY, SOCIAL_POSTS_STRATEGY,
} from "../heroPrompts";

let passes = 0, fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

const ICONS = new Set(["landmark", "brain", "rocket", "hand-coins", "digital-age-bot"]);

section("System-Prompts (Drei-Teiler)");
{
  const sys = buildHeroProposalsSystem("de");
  ok("beginnt mit SPRACHE-Zeile", sys.startsWith("SPRACHE "));
  ok("enthaelt Strategie", sys.includes(HERO_PROPOSALS_STRATEGY));
  ok("Schema am Ende, ohne d", sys.trim().endsWith("Kein Text ausserhalb des JSON.") && sys.includes('kein Feld "d"'));
  ok("Override ersetzt Strategie", buildHeroProposalsSystem("en", "MEINE STRATEGIE").includes("MEINE STRATEGIE") && !buildHeroProposalsSystem("en", "MEINE STRATEGIE").includes(HERO_PROPOSALS_STRATEGY));
  ok("Strategien sprachneutral", !HERO_PROPOSALS_STRATEGY.includes("SPRACHE ") && !SOCIAL_POSTS_STRATEGY.includes("SPRACHE "));
  ok("Strategie rund 1500 Zeichen", HERO_PROPOSALS_STRATEGY.length > 900 && HERO_PROPOSALS_STRATEGY.length < 2200, String(HERO_PROPOSALS_STRATEGY.length));
  ok("Posts-System englisch", buildSocialPostsSystem("en").includes("Englisch"));
}

section("User-Prompt");
{
  const p = buildHeroProposalsPrompt({
    headline: "H", rubrik: "KI & Business", author: "A", keyword: "KW", lead: "L".repeat(2000), body: "B".repeat(9000),
    animList: "- zeichnen (Zeichnen): x", motionList: "- decode (Decode): y", schemeList: "  gruen = Grün: z", recent: ["1. Linie: Bank"], iconNames: "a, b, c",
  });
  ok("Lead auf 800 gekappt", /L{800}(?!L)/.test(p) && !/L{801}/.test(p));
  ok("Text auf 3500 gekappt", /B{3500}(?!B)/.test(p) && !/B{3501}/.test(p));
  ok("Listen enthalten", p.includes("zeichnen (Zeichnen)") && p.includes("decode (Decode)") && p.includes("gruen = Grün") && p.includes("Lucide-Symbole (exakte Namen): a, b, c"));
  ok("letzte Heroes", p.includes("1. 1. Linie: Bank") || p.includes("Linie: Bank"));
  const p2 = buildHeroProposalsPrompt({ headline: "H", rubrik: "R", author: "", keyword: "", lead: "", body: "", animList: "", motionList: "", schemeList: "", recent: [], iconNames: "" });
  ok("ohne Lead/Text keine Zeilen", !p2.includes("- Lead:") && !p2.includes("- Text") && p2.includes("keine") && p2.includes("Redaktion"));
}

section("parseHeroProposals");
{
  const good = JSON.stringify({
    schlagwort: "  AI   Money Moves extra lang lang lang ", kennzahl: "73 %",
    linie: [
      { titel: "Bank mit Säulen", warum: "passt", icon: "Lucide-Landmark", stichworte: ["Bank", "banking", 7], animation: "faden", farbe: "gruen" },
      { titel: "Falsch", warum: "x", icon: "not-an-icon", animation: "zeichnen" },
      { titel: "Rakete", warum: "y", icon: "rocket", animation: "unbekannt", farbe: "lila" },
      { titel: "Zu viel", warum: "z", icon: "brain" },
    ],
    typo: [
      { titel: "Decode", warum: "a", text: "AI MONEY MOVES", motion: "decode", sub: "2", farbe: "gruen_orange", texture: "none", style: "fill", weight: "700", upper: true },
      { titel: "Kaputt", warum: "b", text: "x", motion: "nope" },
      { titel: "Welle", warum: "c", text: "Y", motion: "wave", sub: 9, weight: 123, texture: "holz" },
    ],
  });
  const r = parseHeroProposals("```json\n" + good + "\n```", ICONS);
  ok("parst mit Code-Fence", !!r);
  if (r) {
    ok("Schlagwort geklemmt auf 26", r.schlagwort.length <= 26 && r.schlagwort.startsWith("AI Money Moves"));
    ok("Kennzahl", r.kennzahl === "73 %");
    ok("2 Linie, ungueltiges Icon raus", r.linie.length === 2 && r.linie[0].icon === "landmark" && r.linie[1].icon === "rocket");
    ok("Animation/Farbe validiert", r.linie[0].animation === "faden" && r.linie[0].farbe === "gruen" && r.linie[1].animation === undefined && r.linie[1].farbe === undefined);
    ok("Stichworte nur Strings, klein", r.linie[0].stichworte.join(",") === "bank,banking");
    ok("2 Typo, ungueltige motion raus", r.typo.length === 2 && r.typo[0].motion === "decode" && r.typo[1].motion === "wave");
    ok("Typo-Felder validiert", r.typo[0].sub === 2 && r.typo[0].weight === 700 && r.typo[0].style === "fill" && r.typo[1].sub === 2 && r.typo[1].weight === undefined && r.typo[1].texture === undefined);
  }
  ok("kein brauchbarer Vorschlag → null", parseHeroProposals(JSON.stringify({ linie: [{ icon: "nope" }], typo: [{ motion: "x" }] }), ICONS) === null);
  ok("kein JSON → null", parseHeroProposals("Hier ist mein Vorschlag", ICONS) === null);
  ok("Zeichnung (d) ohne icon wird verworfen", parseHeroProposals(JSON.stringify({ linie: [{ titel: "Eigen", d: "M 1 1 L 2 2" }], typo: [] }), ICONS) === null);
}

section("Store");
{
  const store = parseHeroProposalsStore({ version: 1, contentHash: "abc", createdAt: "2026-11-02", schlagwort: "x", kennzahl: "", linie: [{ titel: "t", warum: "w", icon: "any-icon", stichworte: [] }], typo: [] });
  ok("Store parst (Icons nicht geprueft)", !!store && store.linie.length === 1 && store.contentHash === "abc");
  ok("Store ohne version → null", parseHeroProposalsStore({ contentHash: "abc", linie: [] }) === null);
  ok("Store JSON-null → null", parseHeroProposalsStore(null) === null);
}

section("contentHash");
{
  const a = { headline: "H", keyword: "K", lead: "L", body: "B", rubrik: "R" };
  ok("stabil", heroContentHash(a) === heroContentHash({ ...a }));
  ok("aendert sich mit Titel", heroContentHash(a) !== heroContentHash({ ...a, headline: "H2" }));
  ok("Text jenseits 3500 egal", heroContentHash({ ...a, body: "B".repeat(3600) }) === heroContentHash({ ...a, body: "B".repeat(3700) }));
  ok("hex", /^[0-9a-f]+$/.test(heroContentHash(a)));
}

section("parseSocialPosts + finishPost");
{
  const r = parseSocialPosts(JSON.stringify({ linkedin: "Banken kennen jede Transaktion. {{LINK}} – von A.", instagram: "Link in Bio", hashtags: ["#AgenticBanking", "KIinBanken", "", 3] }));
  ok("parst", !!r && r.hashtags.join(" ") === "#AgenticBanking #KIinBanken");
  if (r) {
    const li = finishPost(r.linkedin, "https://digital-age.ch/artikel/x", r.hashtags);
    ok("LINK ersetzt, Hashtags angehaengt", li.includes("https://digital-age.ch/artikel/x") && li.endsWith("#AgenticBanking #KIinBanken"));
    ok("Hashtags nicht doppelt", finishPost("Text #AgenticBanking #KIinBanken", "u", r.hashtags) === "Text #AgenticBanking #KIinBanken");
  }
  ok("leer → null", parseSocialPosts(JSON.stringify({ linkedin: "", instagram: "" })) === null);
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);

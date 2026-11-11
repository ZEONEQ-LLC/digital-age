// Manueller Test-Runner: npx tsx src/lib/pitch/__tests__/draftFromPitch.manual.ts
import { normalizePitchMarkdown, pitchCategorySlug, pitchToDocument, pitchWebsite } from "../draftFromPitch";
import { escapeIlike } from "../../authorSlug";

let pass = 0;
let fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  const a = JSON.stringify(got);
  const b = JSON.stringify(want);
  if (a === b) { pass++; return; }
  fail++;
  console.log(`  FAIL  ${name}: ${a} != ${b}`);
}

const known = ["ki-business", "future-tech", "swiss-ai", "tools"];
eq("kategorie bekannt", pitchCategorySlug("tools", known), "tools");
eq("kategorie andere", pitchCategorySlug("andere", known), "ki-business");
eq("kategorie null", pitchCategorySlug(null, known), "ki-business");

eq("website https", pitchWebsite(" https://example.ch/a "), "https://example.ch/a");
eq("website javascript", pitchWebsite("javascript:alert(1)"), null);
eq("website leer", pitchWebsite(null), null);

eq("H1 = Titel faellt weg", normalizePitchMarkdown("# Manga: Über KI\n\nText", "Manga – über KI"), "Text");
eq("H1 anders wird H2", normalizePitchMarkdown("# Andere Zeile\n\nText", "Titel"), "## Andere Zeile\n\nText");
eq("spaetere H1 wird H2", normalizePitchMarkdown("Intro\n\n# Titel\n\nText", "Titel"), "Intro\n\n## Titel\n\nText");
eq("H2 bleibt", normalizePitchMarkdown("## Abschnitt", "Titel"), "## Abschnitt");
eq("Code bleibt", normalizePitchMarkdown("```\n# Kommentar\n```", "Titel"), "```\n# Kommentar\n```");
eq("CRLF", normalizePitchMarkdown("Zeile 1\r\n\r\nZeile 2", "T"), "Zeile 1\n\nZeile 2");

const md = "# Der Titel\n\nErster Absatz mit Beleg [1].\n\n## Abschnitt\n\nZweiter Absatz.\n\n## Quellen\n\n[1] Beispiel-Studie, https://example.org/studie";
const { doc, warnings } = pitchToDocument(md, "Der Titel");
eq("blocks", doc.blocks.map((b) => b.type), ["paragraph", "heading", "paragraph"]);
eq("erste Zeile ohne Raute", (doc.blocks[0] as { content: string }).content, "Erster Absatz mit Beleg [^1].");
eq("quellen", doc.sources.length, 1);
eq("quelle url", doc.sources[0].url, "https://example.org/studie");
eq("keine warnung", warnings, []);

const broken = pitchToDocument("Text\n\n## Quellen\n\nunlesbare zeile ohne link", "T");
eq("warnung unlesbar", broken.warnings.length, 1);

eq("ilike escape", escapeIlike("a_b%c@x.ch"), "a\\_b\\%c@x.ch");

console.log(`${fail === 0 ? "ALL GREEN" : "FAILURES"} — ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);

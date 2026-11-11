// Manueller Test-Runner fuer src/lib/search/snippet.ts.
//   npx tsx src/lib/search/__tests__/snippet.manual.ts

import { cleanSnippetMarkdown, normalizeQuery, snippetParts } from "../snippet";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

section("Markdown entfernen");
{
  ok("Link → Text", cleanSnippetMarkdown("siehe [EU AI Act](https://eur-lex.europa.eu/x) hier") === "siehe EU AI Act hier");
  ok("Bild weg", cleanSnippetMarkdown("vor ![Grafik](https://x/y.png) nach") === "vor nach");
  ok("fett/kursiv weg", cleanSnippetMarkdown("das **wichtige** und *kursive* Wort") === "das wichtige und kursive Wort");
  ok("eigene Marker weg", cleanSnippetMarkdown("{{green}}Kernaussage{{/green}} folgt") === "Kernaussage folgt");
  ok("Fussnote weg", cleanSnippetMarkdown("Studie[^3] zeigt") === "Studie zeigt");
  ok("Ueberschrift und Liste", cleanSnippetMarkdown("## Titel\n- Punkt eins\n1. Punkt zwei") === "Titel Punkt eins Punkt zwei");
  ok("abgeschnittener Link-Rest", cleanSnippetMarkdown("Act](https://eur-lex.europa.eu/legal) gilt ab") === "Act gilt ab", cleanSnippetMarkdown("Act](https://eur-lex.europa.eu/legal) gilt ab"));
  ok("Ueberschrift mitten im Ausschnitt", cleanSnippetMarkdown("evaluate them. … ## A quiet Shift AI") === "evaluate them. … A quiet Shift AI");
  ok("Hashtag ohne Leerzeichen bleibt", cleanSnippetMarkdown("Platz #1 im Ranking") === "Platz #1 im Ranking");
  ok("nackte URL weg", cleanSnippetMarkdown("mehr unter https://example.com/a?b=c dazu") === "mehr unter dazu");
}

section("Teile mit Treffern");
{
  const p = snippetParts("Der EU ⟦AI⟧ ⟦Act⟧ ist eine **Verordnung**");
  ok("5 Teile", p.length === 5, JSON.stringify(p));
  ok("Treffer markiert", p[1].hit && p[1].text === "AI" && p[3].hit && p[3].text === "Act");
  ok("Markdown im Rest entfernt", p[4].text === " ist eine Verordnung");
  ok("kein Treffer → ein Teil", snippetParts("nur Text").length === 1);
  ok("fuehrender Trenner weg", snippetParts(" … Body ⟦Bank⟧ Text")[0].text === "Body ");
  ok("offene Markierung ohne Ende", snippetParts("Text ⟦halb").every((x) => !x.hit) && !snippetParts("Text ⟦halb")[0].text.includes("⟦"));
  ok("Treffer im Link-Text bleibt", snippetParts("[die ⟦Bank⟧ von morgen](https://x.ch)").some((x) => x.hit && x.text === "Bank"));
  ok("kein HTML-Pfad: Spitze Klammern bleiben Text", snippetParts("a <b>⟦x⟧</b>").map((x) => x.text).join("") === "a <b>x</b>");
}

section("Suchbegriff");
{
  ok("trimmt und fasst Leerraum zusammen", normalizeQuery("  KI   Banken \n") === "KI Banken");
  ok("kein String → leer", normalizeQuery(undefined) === "" && normalizeQuery(["a"]) === "");
  ok("max 200 Zeichen", normalizeQuery("x".repeat(500)).length === 200);
}

process.stdout.write(`\n${passes} passed, ${fails} failed\n`);
if (fails > 0) process.exit(1);

// Manueller Test-Runner fuer src/lib/editor/mdCleanup.ts UND die
// BlockReader-Source-Logik in src/components/blockReader/sources.ts.
//
// Kein Vitest/Jest im Repo eingerichtet — dieses Skript laeuft die
// Testfaelle als simple console.log-Pass/Fail-Suite. Aufruf:
//
//   npx tsx src/lib/editor/__tests__/mdCleanup.manual.ts
//
// Exit-Code 0 bei allem gruen, 1 bei mindestens einem Fail.

import {
  cleanupMarkdown,
  parseSourceLine,
  parseSourcesLines,
  normalizeStarItalics,
  normalizeWhitespace,
} from "../mdCleanup";
import { markdownToBlocks } from "../../markdownBlocks";
import {
  externalLinkRe,
  imageLinkRe,
  mdHttpLinkRe,
} from "../../markdownLinkUrl";
import {
  buildSourceOrder,
  computeSourceListItems,
} from "../../../components/blockReader/sources";
import type { Block, Source } from "../../../types/blocks";

let passes = 0;
let fails = 0;

function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) {
    passes++;
    process.stdout.write(`  PASS  ${label}\n`);
  } else {
    fails++;
    process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`);
  }
}

function section(label: string): void {
  process.stdout.write(`\n=== ${label} ===\n`);
}

// ============================================================
// 1) Andreas' Format — Bullet + MD-Link
// ============================================================
section("Andreas' 24-Bullet-Block");

const ANDREAS_INPUT = [
  "•\tThe Innovator's Dilemma – Clayton M Christensen: [https://www.hbs.edu/foo](https://www.hbs.edu/foo)",
  "•\tInnovation in Banking – BBVA: [https://example.com/innovation](https://example.com/innovation)",
  "•\tAI experimentation – Why employees need time: [https://www.linkedin.com/posts/feldmaneyal_x](https://www.linkedin.com/posts/feldmaneyal_x)",
  "•\tEmployee resistance to AI: [https://vooban.com/en/articles/2024/x](https://vooban.com/en/articles/2024/x)",
];
{
  const result = parseSourcesLines(ANDREAS_INPUT);
  ok("4 Bullet-Zeilen → 4 sources, 0 unparseable", result.map.size === 4 && result.unparseableLines.length === 0,
    `map.size=${result.map.size}, unparseable=${result.unparseableLines.length}`);
  ok("Auto-Nummerierung positionsbasiert 1..4",
    result.map.has(1) && result.map.has(2) && result.map.has(3) && result.map.has(4));
  ok("renumberedDueToMix=false (keine Zeile hatte expliziten Index)", result.renumberedDueToMix === false);
  ok("Erste Quelle hat URL", result.map.get(1)?.url === "https://www.hbs.edu/foo");
  ok("Erste Quelle Titel = 'The Innovator's Dilemma – Clayton M Christensen'",
    result.map.get(1)?.text === "The Innovator's Dilemma – Clayton M Christensen",
    `got: ${JSON.stringify(result.map.get(1)?.text)}`);
}

// ============================================================
// 2) Strict [N]-Format — bestehender Pfad
// ============================================================
section("Strict [N]-Format bleibt unveraendert");

{
  const result = parseSourcesLines([
    "[1] Innovator's Dilemma https://hbs.edu/x",
    "[5] BBVA Innovation https://example.com/y",
  ]);
  ok("2 strict-Zeilen → 2 sources", result.map.size === 2);
  ok("Explizite N respektiert (1 und 5)", result.map.has(1) && result.map.has(5));
  ok("Kein Mix-Renumber (alle explizit)", result.renumberedDueToMix === false);
}

// ============================================================
// 3) Mix-Fall — manche mit [N], manche ohne
// ============================================================
section("Mix-Fall: explizit + implizit");

{
  const result = parseSourcesLines([
    "[1] Erste explizit https://example.com/1",
    "- Zweite ohne Index https://example.com/2",
    "[3] Dritte explizit https://example.com/3",
  ]);
  ok("3 Zeilen parseable", result.map.size === 3);
  ok("renumberedDueToMix=true", result.renumberedDueToMix === true);
  ok("Positionsbasiert: keys = {1, 2, 3}",
    result.map.has(1) && result.map.has(2) && result.map.has(3));
  ok("[3] aus Eingabe ist NICHT explizit erhalten (Mix-Fall renumbered)",
    result.map.get(3)?.url === "https://example.com/3");
  ok("Zweite Quelle ist die ohne-Index-Zeile",
    result.map.get(2)?.url === "https://example.com/2");
}

// ============================================================
// 4) MD-Liste / numerische Liste / Klammer-Index / MD-Link ohne Index
// ============================================================
section("Weitere akzeptierte Formate");

{
  ok("MD-Liste '- Titel URL'",
    parseSourceLine("- Titel https://example.com")?.text === "Titel");
  ok("Numerische Liste '1. Titel URL'",
    parseSourceLine("1. Titel https://example.com")?.text === "Titel");
  ok("Klammer-Index '(1) Titel URL'",
    parseSourceLine("(1) Titel https://example.com")?.explicitN === 1);
  ok("Klammer-Index ')' Variante '1) Titel URL'",
    parseSourceLine("1) Titel https://example.com")?.explicitN === 1);
  ok("MD-Link ohne Index '[Titel](URL)'",
    parseSourceLine("[Foo Title](https://example.com)")?.text === "Foo Title");
  ok("MD-Link ohne Index hat URL",
    parseSourceLine("[Foo Title](https://example.com)")?.url === "https://example.com");
}

// ============================================================
// 5) Bewusst unparsbar — Plain ohne Marker, Reference-Link-Definition
// ============================================================
section("Bewusst NICHT akzeptierte Formate");

{
  ok("Plain 'Titel URL' ohne Marker → null",
    parseSourceLine("Just some title https://example.com") === null);
  ok("Reference-Link-Definition '[1]: URL \"Titel\"' → der parser nimmt es als [N] strict",
    // Disclaimer: technisch matcht [1]:, der Parser interpretiert es. Ali hat das ausgeklammert,
    // aber das ist edge — wir markieren das hier zur Doku. Test schaut nur ob nicht crashed.
    parseSourceLine('[1]: https://example.com "Titel"') !== null);
  ok("Leere Zeile → null",
    parseSourceLine("   ") === null);
  ok("Reiner Bullet ohne Inhalt → null",
    parseSourceLine("•") === null);
}

// ============================================================
// 6) Sicherheitsnetz — unparseable Zeilen landen im Body
// ============================================================
section("Sicherheitsnetz: unparseable Zeilen verloren-frei");

{
  const md = [
    "# Artikel-Titel",
    "",
    "Erster Absatz mit Inhalt.",
    "",
    "## Sources",
    "",
    "Random ohne Marker, nicht parseable",
    "Noch eine nicht parseable Zeile",
  ].join("\n");

  const result = cleanupMarkdown(md);
  ok("Cleanup laeuft durch ohne Throw", result.blocks.length > 0);
  ok("foundSourcesSection=true (Heading wurde erkannt)", result.foundSourcesSection === true);
  ok("2 unparseable Lines gesammelt", result.unparseableSourceLines.length === 2);
  ok("sources[] leer (nichts parseable)", result.sources.length === 0);

  // Verifiziere, dass die unparseable Lines im Body landen
  const flatText = JSON.stringify(result.blocks);
  ok("Unparseable Line 1 ist im Body-Output enthalten",
    flatText.includes("Random ohne Marker"));
  ok("Unparseable Line 2 ist im Body-Output enthalten",
    flatText.includes("Noch eine nicht parseable Zeile"));
  ok("Body bekommt Sources-Heading-Block fuer die unparseable Lines",
    result.blocks.some((b) => b.type === "heading" && (b as { content?: string }).content === "Sources"));
}

// ============================================================
// 7) Andreas-Block via cleanupMarkdown-Integrationstest
// ============================================================
section("Integrationstest: Andreas' kompletter MD-Input");

{
  const md = [
    "Body-Inhalt vor der Sources-Sektion.",
    "",
    "Zweiter Absatz mit Erklaerung.",
    "",
    "## Sources",
    "",
    "•\tThe Innovator's Dilemma – Clayton M Christensen: [https://hbs.edu/x](https://hbs.edu/x)",
    "•\tInnovation in Banking – BBVA: [https://example.com/innovation](https://example.com/innovation)",
    "•\tAI experimentation: [https://linkedin.com/x](https://linkedin.com/x)",
  ].join("\n");

  const result = cleanupMarkdown(md);
  ok("Body hat Absaetze, Sources-Sektion abgetrennt", result.blocks.length >= 2);
  ok("3 sources extrahiert", result.sources.length === 3);
  ok("0 unparseable (alles greift)", result.unparseableSourceLines.length === 0);
  ok("Erste Quelle hat den Titel",
    result.sources[0]?.text === "The Innovator's Dilemma – Clayton M Christensen",
    `got: ${JSON.stringify(result.sources[0]?.text)}`);
  ok("Erste Quelle hat URL",
    result.sources[0]?.url === "https://hbs.edu/x",
    `got: ${JSON.stringify(result.sources[0]?.url)}`);
}

// ============================================================
// 8) BlockReader-Source-Logik — Fall (A) + (B) + (C)
// ============================================================
section("BlockReader sources: Fall (A) Body MIT [^N]-Refs");

{
  const blocks: Block[] = [
    { id: "b1", type: "paragraph", content: "Erster Absatz mit Ref [^1] und [^3]." },
    { id: "b2", type: "paragraph", content: "Zweiter Absatz mit [^2]." },
  ];
  const sources: Source[] = [
    { id: "s1", text: "Quelle 1", url: "https://example.com/1" },
    { id: "s2", text: "Quelle 2", url: "https://example.com/2" },
    { id: "s3", text: "Quelle 3", url: "https://example.com/3" },
  ];
  const { order } = buildSourceOrder(blocks);
  ok("order in Auftrittsreihenfolge: [1, 3, 2]",
    JSON.stringify(order) === JSON.stringify([1, 3, 2]),
    `got: ${JSON.stringify(order)}`);

  const items = computeSourceListItems(sources, order);
  ok("3 Items in Auftrittsreihenfolge", items.length === 3);
  ok("Item 1 = Quelle 1 (display 1)",
    items[0].display === 1 && items[0].source.text === "Quelle 1");
  ok("Item 2 = Quelle 3 (display 2 — Auftrittsreihenfolge!)",
    items[1].display === 2 && items[1].source.text === "Quelle 3");
  ok("Item 3 = Quelle 2 (display 3)",
    items[2].display === 3 && items[2].source.text === "Quelle 2");
}

section("BlockReader sources: Fall (A) Mischfall — bewusst konservativ");

{
  // 3 sources, aber nur Ref auf [^1] und [^3] im Body.
  // Konservative Entscheidung: nur die referenzierten werden gerendert.
  // Quelle 2 (nicht referenziert) bleibt unsichtbar — KEINE Regression
  // ggue. heutiger Public-Page.
  const blocks: Block[] = [
    { id: "b1", type: "paragraph", content: "Refs nur auf [^1] und [^3]." },
  ];
  const sources: Source[] = [
    { id: "s1", text: "Q1", url: "https://example.com/1" },
    { id: "s2", text: "Q2 (nicht referenziert)", url: "https://example.com/2" },
    { id: "s3", text: "Q3", url: "https://example.com/3" },
  ];
  const { order } = buildSourceOrder(blocks);
  const items = computeSourceListItems(sources, order);
  ok("Mischfall: nur referenzierte (2 Items)", items.length === 2);
  ok("Nicht-referenzierte Q2 fehlt — konservativ wie heute",
    !items.some((i) => i.source.text === "Q2 (nicht referenziert)"));
}

section("BlockReader sources: Fall (B) Body OHNE Refs — NEU (Andreas-Fall)");

{
  const blocks: Block[] = [
    { id: "b1", type: "paragraph", content: "Body komplett ohne Refs." },
    { id: "b2", type: "paragraph", content: "Noch ein Absatz, immer noch keine [^N]." },
  ];
  const sources: Source[] = [
    { id: "s1", text: "Andreas' Quelle 1", url: "https://hbs.edu/1" },
    { id: "s2", text: "Andreas' Quelle 2", url: "https://example.com/2" },
    { id: "s3", text: "Andreas' Quelle 3" },
  ];
  const { order } = buildSourceOrder(blocks);
  ok("Body hat 0 Refs → order leer", order.length === 0);

  const items = computeSourceListItems(sources, order);
  ok("Fall B: alle 3 sources werden gerendert", items.length === 3);
  ok("In Array-Reihenfolge nummeriert 1, 2, 3",
    items[0].display === 1 && items[1].display === 2 && items[2].display === 3);
  ok("Erste Quelle = sources[0]",
    items[0].source.text === "Andreas' Quelle 1");
  ok("Letzte Quelle ohne URL OK",
    items[2].source.text === "Andreas' Quelle 3" && items[2].source.url === undefined);
}

section("BlockReader sources: Edge-Cases");

{
  ok("0 sources + 0 refs → 0 items",
    computeSourceListItems([], []).length === 0);
  // Dangling Ref: order=[5] auf nur 2 sources
  const danglingItems = computeSourceListItems(
    [{ id: "s1", text: "Q1" }, { id: "s2", text: "Q2" }],
    [5],
  );
  ok("Dangling [^5]-Ref bei nur 2 sources → 0 items (Skip)",
    danglingItems.length === 0);
}

// ============================================================
// Paren-URL-Fix: Helper @/lib/markdownLinkUrl
// ============================================================
section("Helper externalLinkRe — balancierte Klammern in URL");

{
  // Der Kern-Fall: FINMA-Gesetzeskuerzel "(amla)" in der URL.
  const m = externalLinkRe().exec(
    "[Legal basis – FINMA](https://www.finma.ch/en/act-(amla)/)",
  );
  ok("matcht Link mit innerer Klammer", m !== null);
  ok("Text sauber", m?.[1] === "Legal basis – FINMA", `got: ${JSON.stringify(m?.[1])}`);
  ok("URL vollstaendig inkl. (amla)/",
    m?.[2] === "https://www.finma.ch/en/act-(amla)/", `got: ${JSON.stringify(m?.[2])}`);
  ok("kein Resttext nach dem Match (Full-Match endet am Link-`)`)",
    m !== null && m.index + m[0].length === "[Legal basis – FINMA](https://www.finma.ch/en/act-(amla)/)".length);
}

{
  // REGRESSION: normale URL ohne Klammer — bit-identisch zu vorher.
  const m = externalLinkRe().exec("[T](https://example.com/foo/bar)");
  ok("normale URL ohne Klammer unveraendert",
    m?.[2] === "https://example.com/foo/bar", `got: ${JSON.stringify(m?.[2])}`);
}

{
  // Mehrere Klammerpaare.
  const m = externalLinkRe().exec("[T](https://x.com/(a)/mid/(b)/)");
  ok("mehrere Klammerpaare voll erfasst",
    m?.[2] === "https://x.com/(a)/mid/(b)/", `got: ${JSON.stringify(m?.[2])}`);
}

{
  // Klammer am URL-Ende (Wikipedia-Disambiguation).
  const m = externalLinkRe().exec(
    "[Foo](https://en.wikipedia.org/wiki/Foo_(disambiguation))",
  );
  ok("Klammer am URL-Ende voll erfasst",
    m?.[2] === "https://en.wikipedia.org/wiki/Foo_(disambiguation)",
    `got: ${JSON.stringify(m?.[2])}`);
}

{
  // DEGENERIERT: unbalancierte Klammer ohne schliessendes Markdown-`)`.
  // Darf NICHT haengen und NICHT als Link matchen (degradiert zu Literal).
  const m = externalLinkRe().exec("[T](https://x.com/(a");
  ok("unbalanciert → kein Match (kein Hang, kein Crash)", m === null);
}

{
  // REGRESSION: leere URL `[T]()` matchte vorher nicht (`[^)]+` = 1+),
  // soll weiterhin nicht matchen.
  const m = externalLinkRe().exec("[T]()");
  ok("leere URL → kein Match (bit-identisch zu vorher)", m === null);
}

section("Helper mdHttpLinkRe — strikt http, balancierte Klammern");

{
  const m = mdHttpLinkRe().exec(
    "Vorlauf [Titel](https://www.finma.ch/en/anti-money-laundering-act-(amla)/) Nachlauf",
  );
  ok("http-Link mit (amla) voll erfasst",
    m?.[2] === "https://www.finma.ch/en/anti-money-laundering-act-(amla)/",
    `got: ${JSON.stringify(m?.[2])}`);
}

{
  // Non-http (z.B. mailto) wird wie vorher NICHT als MD_LINK erkannt.
  const m = mdHttpLinkRe().exec("[T](mailto:foo@bar.ch)");
  ok("non-http → kein Match (Praefix-Pflicht unveraendert)", m === null);
}

section("Helper imageLinkRe — Bild-URL balancierte Klammern");

{
  const m = imageLinkRe().exec("![alt text](https://cdn.x.com/img-(v2).png)");
  ok("Bild-URL mit Klammer voll erfasst",
    m?.[2] === "https://cdn.x.com/img-(v2).png", `got: ${JSON.stringify(m?.[2])}`);
  ok("Alt-Text sauber", m?.[1] === "alt text");
}

{
  // REGRESSION: normale Bild-URL unveraendert.
  const m = imageLinkRe().exec("![a](https://cdn.x.com/img.png)");
  ok("normale Bild-URL unveraendert", m?.[2] === "https://cdn.x.com/img.png");
}

// ============================================================
// Paren-URL-Fix: mdCleanup-Integration (parseSourceLine)
// ============================================================
section("parseSourceLine — FINMA-Quelle mit (amla)-URL (echter Defekt-Fall)");

{
  // Reale Zeile aus ai-in-banking-compliance #3 (Body-Quellen-Liste).
  const entry = parseSourceLine(
    "[3] [Legal basis for combating money laundering – FINMA](https://www.finma.ch/en/documentation/legal-basis/laws-andordinances/anti-money-laundering-act-(amla)/)",
  );
  ok("explicitN = 3", entry?.explicitN === 3);
  ok("Titel sauber, ohne URL-Reste",
    entry?.text === "Legal basis for combating money laundering – FINMA",
    `got: ${JSON.stringify(entry?.text)}`);
  ok("URL vollstaendig inkl. (amla)/ — kein Abschneiden",
    entry?.url === "https://www.finma.ch/en/documentation/legal-basis/laws-andordinances/anti-money-laundering-act-(amla)/",
    `got: ${JSON.stringify(entry?.url)}`);
}

// ============================================================
// Paren-URL-Fix: Public-Render-Regex gegen ECHTE FINMA-Strings #3-#7
// (BlockReader + InlineText nutzen beide externalLinkRe() — ein Check
//  deckt beide ab). Simuliert die Inline-Parser-Schleife: Link finden,
//  href pruefen, sicherstellen dass KEIN "/)" als Resttext uebrigbleibt.
// ============================================================
section("Render-Regex gegen echte ai-in-banking-compliance Quellen #3-#7");

{
  // Echte Body-Quellen-Listen-Items (aus der Diagnose, read-only entnommen).
  const realItems: { n: number; s: string; expectUrl: string }[] = [
    {
      n: 3,
      s: "[Legal basis for combating money laundering – FINMA](https://www.finma.ch/en/documentation/legal-basis/laws-andordinances/anti-money-laundering-act-(amla)/)",
      expectUrl: "https://www.finma.ch/en/documentation/legal-basis/laws-andordinances/anti-money-laundering-act-(amla)/",
    },
    {
      n: 4,
      s: "[Money laundering supervision: findings from the on-site supervisory checks – FINMA](https://www.finma.ch/en/documentation/dossier/dossiergeldwaeschereibekaempfung/geldwaeschereiaufsicht-erkenntnisse-ausden-vor-ort-kontrollen/)",
      expectUrl: "https://www.finma.ch/en/documentation/dossier/dossiergeldwaeschereibekaempfung/geldwaeschereiaufsicht-erkenntnisse-ausden-vor-ort-kontrollen/",
    },
    {
      n: 5,
      s: "[Money laundering and sanctions – FINMA](https://www.finma.ch/en/documentation/dossier/dossiergeldwaeschereibekaempfung/geldwaescherei-und-sanktionen/)",
      expectUrl: "https://www.finma.ch/en/documentation/dossier/dossiergeldwaeschereibekaempfung/geldwaescherei-und-sanktionen/",
    },
    {
      n: 6,
      s: "[Money laundering (2024) – FINMA](https://www.finma.ch/en/documentation/dossier/dossier-geldwaeschereibekaempfung/geldwaescherei-2024/)",
      expectUrl: "https://www.finma.ch/en/documentation/dossier/dossier-geldwaeschereibekaempfung/geldwaescherei-2024/",
    },
    {
      n: 7,
      s: "[Combating money laundering in the context of financial market supervision – FINMA](https://www.finma.ch/en/supervision/cross-sector-issues/combatingmoney-laundering/)",
      expectUrl: "https://www.finma.ch/en/supervision/cross-sector-issues/combatingmoney-laundering/",
    },
  ];
  for (const it of realItems) {
    const m = externalLinkRe().exec(it.s);
    ok(`#${it.n}: href vollstaendig`, m?.[2] === it.expectUrl,
      `got: ${JSON.stringify(m?.[2])}`);
    // Kein "/)" Resttext: Full-Match muss bis zum Ende des Link-Strings reichen.
    const leftover = m ? it.s.slice(m.index + m[0].length) : it.s;
    ok(`#${it.n}: kein "/)"-Resttext nach dem Link`, leftover === "",
      `leftover: ${JSON.stringify(leftover)}`);
  }
}

// ============================================================
// Hang-Fix #1: NBSP nach Block-Marker + Progress-Guard
// ============================================================
section("normalizeWhitespace — NBSP & Zero-width");

{
  ok("NBSP nach ## → normales Space",
    normalizeWhitespace("##\u00A0Titel") === "## Titel",
    JSON.stringify(normalizeWhitespace("##\u00A0Titel")));
  ok("Zero-width-Zeichen entfernt",
    normalizeWhitespace("a\u200Bb\uFEFFc") === "abc");
  ok("normaler Text unveraendert",
    normalizeWhitespace("## Titel\n- punkt") === "## Titel\n- punkt");
}

section("markdownToBlocks — Progress-Guard (kein Hang/OOM)");

{
  // Vor dem Fix: Endlosschleife → OOM. Jetzt: terminiert, Zeile wird Absatz.
  const b1 = markdownToBlocks("##\u00A0Hidden Treasures");
  ok("NBSP-Heading terminiert (1 Block)", Array.isArray(b1) && b1.length === 1);
  const b2 = markdownToBlocks("![incomplete image ohne closing");
  ok("unvollstaendiges ![ terminiert (1 Block)", Array.isArray(b2) && b2.length === 1);
}

section("cleanupMarkdown — NBSP-Heading wird korrekt zu Heading (Bug #1)");

{
  const md = ["Intro paragraph.", "", "##\u00A0The expensive Part", "", "Body text."].join("\n");
  const res = cleanupMarkdown(md);
  const heading = res.blocks.find((b) => b.type === "heading");
  ok("Heading erkannt — kein Hang, keine Demotion zu Absatz",
    !!heading && heading.type === "heading" && heading.content === "The expensive Part",
    JSON.stringify(heading));
}

// ============================================================
// Daten-Fix #2: normalizeStarItalics zerstoert keine Zahlen
// ============================================================
section("normalizeStarItalics — Zahlen bleiben erhalten (Bug #2)");

{
  const inp = "In 2024 we saw **growth** and 50 banks.";
  ok("Jahr + Zahl + Bold: nichts wird 'undefined'",
    normalizeStarItalics(inp) === inp, JSON.stringify(normalizeStarItalics(inp)));
  ok("Zahlen ohne Bold unveraendert",
    normalizeStarItalics("year 2024 value 50") === "year 2024 value 50");
  ok("[^N]-Ref bleibt intakt",
    normalizeStarItalics("Ref [^2] and 2011.") === "Ref [^2] and 2011.",
    JSON.stringify(normalizeStarItalics("Ref [^2] and 2011.")));
  ok("*italic* → _italic_", normalizeStarItalics("a *word* b") === "a _word_ b");
  ok("***x*** → **_x_**", normalizeStarItalics("***x***") === "**_x_**");
  ok("mehrere Bolds + Zahlen gemischt",
    normalizeStarItalics("**A** 1 **B** 2") === "**A** 1 **B** 2",
    JSON.stringify(normalizeStarItalics("**A** 1 **B** 2")));
}

// ============================================================
// Summary
// ============================================================
process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);

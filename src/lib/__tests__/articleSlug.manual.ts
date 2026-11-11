// Manueller Test-Runner: npx tsx src/lib/__tests__/articleSlug.manual.ts
import { isArticleSlugConflict, isDraftSlug, normalizeArticleSlug, slugFollowsTitle, slugFromTitle } from "../articleSlug";

let pass = 0;
let fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  if (got === want) { pass++; return; }
  fail++;
  console.log(`  FAIL  ${name}: ${JSON.stringify(got)} != ${JSON.stringify(want)}`);
}

// slugFromTitle
eq("umlaute", slugFromTitle("Künstliche Intelligenz für Größenwahn"), "kuenstliche-intelligenz-fuer-groessenwahn");
eq("grossbuchstaben umlaut", slugFromTitle("ÄRGER ÖFFNET ÜBER"), "aerger-oeffnet-ueber");
eq("zerlegtes umlaut (macOS-Paste)", slugFromTitle("Künstlich"), "kuenstlich");
eq("akzente", slugFromTitle("Café à la carte"), "cafe-a-la-carte");
eq("satzzeichen", slugFromTitle("  KI & Business: Was jetzt?  "), "ki-business-was-jetzt");
eq("leer", slugFromTitle("  ...  "), "");
const long = slugFromTitle("Warum die Schweizer Banken ihre Kundenbeziehung an autonome Agenten verlieren werden und was bleibt");
eq("lang <= 60", long.length <= 60, true);
eq("lang an Wortgrenze", long, "warum-die-schweizer-banken-ihre-kundenbeziehung-an-autonome");
eq("lang ohne Trenner", slugFromTitle("a".repeat(80)).length, 60);
eq("genau 60", slugFromTitle(`${"a".repeat(30)} ${"b".repeat(29)}`).length, 60);

// normalizeArticleSlug (KI-Pfade): gleiche Transliteration wie der Titel, ohne Kuerzen
eq("ki umlaute", normalizeArticleSlug("KI-Agenten für Größere Büros"), "ki-agenten-fuer-groessere-bueros");
eq("ki akzente", normalizeArticleSlug("Café Économie"), "cafe-economie");
eq("ki schon normal", normalizeArticleSlug("ki-im-treuhandbuero"), "ki-im-treuhandbuero");
eq("ki raender", normalizeArticleSlug("  -Agenten & Co.-  "), "agenten-co");
eq("ki leer", normalizeArticleSlug("   "), "");
eq("ki wie titel", normalizeArticleSlug("Künstliche Intelligenz"), slugFromTitle("Künstliche Intelligenz"));

// isDraftSlug
eq("draft ja", isDraftSlug("draft-1783429699290-rukrng"), true);
eq("draft nein", isDraftSlug("draft-der-zukunft"), false);

// slugFollowsTitle
const t = "Künstliche Intelligenz";
eq("platzhalter folgt", slugFollowsTitle("draft-1783429699290-rukrng", t), true);
eq("leer folgt", slugFollowsTitle("", t), true);
eq("gleich folgt", slugFollowsTitle("kuenstliche-intelligenz", t), true);
eq("suffix folgt", slugFollowsTitle("kuenstliche-intelligenz-2", t), true);
eq("wort-suffix folgt nicht", slugFollowsTitle("kuenstliche-intelligenz-heute", t), false);
eq("manuell folgt nicht", slugFollowsTitle("ki-kurz", t), false);
eq("SEO-Variante folgt nicht", slugFollowsTitle("kunstliche-intelligenz", t), false);
eq("leerer titel, slug bleibt", slugFollowsTitle("ki-kurz", ""), false);

// isArticleSlugConflict
eq("konflikt", isArticleSlugConflict({ code: "23505", message: 'duplicate key value violates unique constraint "articles_slug_key"' }), true);
eq("anderer unique", isArticleSlugConflict({ code: "23505", message: 'violates unique constraint "one_hero_per_category"' }), false);
eq("null", isArticleSlugConflict(null), false);

console.log(`${fail === 0 ? "ALL GREEN" : "FAILURES"} — ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);

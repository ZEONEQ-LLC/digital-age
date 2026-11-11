// Manueller Test-Runner fuer src/lib/hero-studio/recipe.ts (Rezept v1: Bauen, Validieren).
//   npx tsx src/lib/hero-studio/__tests__/recipe.manual.ts
// Exit 0 = alles gruen, 1 = mind. ein Fail.

import {
  buildHeroRecipe, heroStaleChanges, parseHeroRecipe, recipeByteLength, recipeToSpec, sanitizeOverrides,
} from "../recipe";
import { isHeroAssetPath } from "../upload";

let passes = 0, fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) { passes++; process.stdout.write(`  PASS  ${label}\n`); }
  else { fails++; process.stdout.write(`  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`); }
}
function section(l: string): void { process.stdout.write(`\n=== ${l} ===\n`); }

section("sanitizeOverrides");
{
  const ov = sanitizeOverrides("line", { motif: "bank", anim: "faden", scale: 1.1, upper: true, bogus: "x", motion: "decode", speed: Infinity });
  ok("nur erlaubte Schluessel der Engine", Object.keys(ov).sort().join(",") === "anim,motif,scale");
  ok("Infinity verworfen", !("speed" in ov));
  const tv = sanitizeOverrides("typo", { motion: "decode", sub: 1, motif: "bank" });
  ok("typo: motion+sub, kein motif", Object.keys(tv).sort().join(",") === "motion,sub");
  ok("kein Objekt → leer", Object.keys(sanitizeOverrides("line", "nope")).length === 0);
}

section("buildHeroRecipe");
{
  const r = buildHeroRecipe({
    spec: { engine: "line", variant: 3.7, overrides: { motif: "ki-icon-landmark", anim: "morph", motif2: "gehirn" }, text: "  AI   Money  ", figure: " 73 % ", kiMotifs: [{ id: "ki-icon-landmark", titel: "Bank", icon: "landmark" }, { id: "ki-abc", titel: "Eigen", d: "M 1 1" }] },
    animated: true, seedKey: "ai-agents", fp: { motif: "bank", anim: "morph", n: 2 },
    snapshot: { title: "T", author: "A", date: "01.11.2026", category: "KI & Business" },
    files: { hero: "id/hero-1.png", og: "id/og-1.png", video: "id/hero-1.mp4" },
  });
  ok("version 1, engine, variant ganzzahlig", r.version === 1 && r.engine === "line" && r.variant === 3);
  ok("Text normalisiert", r.text === "AI Money" && r.figure === "73 %");
  ok("kiMotifs nur icon (d verworfen)", r.kiMotifs.length === 1 && r.kiMotifs[0].icon === "landmark");
  ok("files + animated", r.animated && r.files.video === "id/hero-1.mp4");
  ok("deutlich unter 32 KB", recipeByteLength(r) < 4096, String(recipeByteLength(r)));
  ok("roundtrip parse", JSON.stringify(parseHeroRecipe(JSON.parse(JSON.stringify(r)))) === JSON.stringify(r));
  ok("recipeToSpec", recipeToSpec(r).source === "saved" && recipeToSpec(r).overrides.anim === "morph" && recipeToSpec(r).id === "saved");
}

section("parseHeroRecipe");
{
  ok("JSON-null → null (Restore alter Snapshots)", parseHeroRecipe(null) === null);
  ok("version fehlt → null", parseHeroRecipe({ engine: "line", seedKey: "x", files: { hero: "a", og: "b" } }) === null);
  ok("version 2 → null", parseHeroRecipe({ version: 2, engine: "line", seedKey: "x", files: { hero: "a", og: "b" } }) === null);
  ok("engine ungueltig → null", parseHeroRecipe({ version: 1, engine: "foo", seedKey: "x", files: { hero: "a", og: "b" } }) === null);
  ok("files fehlen → null", parseHeroRecipe({ version: 1, engine: "line", seedKey: "x" }) === null);
  const min = parseHeroRecipe({ version: 1, engine: "typo", seedKey: "x", files: { hero: "a", og: "b" }, overrides: { motion: "decode", motif: "nein" }, animated: "ja" });
  ok("Minimalform mit Defaults", !!min && min.variant === 0 && min.text === "" && min.animated === false && min.overrides.motion === "decode" && !("motif" in min.overrides) && min.files.video === null);
}

section("heroStaleChanges");
{
  const r = parseHeroRecipe({ version: 1, engine: "line", seedKey: "x", files: { hero: "a", og: "b" }, snapshot: { title: "T", author: "A", date: "01.11.2026", category: "K" } });
  if (r) {
    ok("gleich → keine", heroStaleChanges(r, { title: "T ", author: "A", date: "01.11.2026", category: "K" }).length === 0);
    ok("Titel + Datum", heroStaleChanges(r, { title: "T2", author: "A", date: "02.11.2026", category: "K" }).join(",") === "Titel,Datum");
    ok("Autor + Rubrik", heroStaleChanges(r, { title: "T", author: "B", date: "01.11.2026", category: "F" }).join(",") === "Autor,Rubrik");
  } else ok("Rezept parst", false);
}

section("isHeroAssetPath (Loeschpfad)");
{
  const id = "961c0197-606a-4a27-8cd0-1d76edb4fe1a";
  ok("exaktes Studio-Schema erlaubt", isHeroAssetPath(id, `${id}/hero-0a1b2c3d.png`) && isHeroAssetPath(id, `${id}/og-ffffffff.png`) && isHeroAssetPath(id, `${id}/hero-00000000.mp4`));
  ok("alles andere nie", [
    `${id}/cover.webp`, `${id}/hero-0a1b2c3d.webp`, `${id}/hero-0a1b2c3.png`, `${id}/hero-0A1B2C3D.png`, `${id}/sub/hero-0a1b2c3d.png`,
    `${id}/../x/hero-0a1b2c3d.png`, `../${id}/hero-0a1b2c3d.png`, `00000000-0000-0000-0000-000000000000/hero-0a1b2c3d.png`, `${id}/hero-0a1b2c3d.png?x=1`, `${id}/hero-0a1b2c3d.png\n`, "",
  ].every((p) => !isHeroAssetPath(id, p)) && !isHeroAssetPath("", "/hero-0a1b2c3d.png"));
}

process.stdout.write(`\nResult: ${passes} pass, ${fails} fail\n`);
if (fails > 0) process.exit(1);

// Build-Guard (npm prebuild): haelt src/lib/siteChrome.ts mit dem Route-Baum
// unter src/app/autor/ synchron.
//   1. Jede Route direkt unter src/app/autor/(suite)/ muss in
//      AUTHOR_SUITE_PREFIXES stehen — sonst bekommt die Suite-Seite Navbar,
//      Ticker, Rails, CMP-Banner und GA4.
//   2. Jedes statische Segment direkt unter /autor/ (Suite oder ausserhalb der
//      Route-Groups, z.B. artikel/neu) muss in RESERVED_AUTHOR_HANDLES stehen —
//      sonst koennte ein gleichnamiges Autoren-Handle vergeben werden, dessen
//      Profil /autor/<handle> von der Route verdeckt wird.
// Fehlt etwas, bricht der Build ab (lokal und auf Vercel).
// Aufruf: tsx scripts/check-suite-prefixes.ts [projekt-root]
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { AUTHOR_SUITE_PREFIXES, RESERVED_AUTHOR_HANDLES } from "../src/lib/siteChrome";

const root = process.argv[2] ?? process.cwd();
const autorDir = join(root, "src", "app", "autor");

// Statische URL-Segmente eines Ordners. Route-Groups "(x)" sind URL-transparent
// (hineinschauen), private Ordner "_x" und dynamische "[x]" sind kein fester Pfad.
function staticSegments(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (name.startsWith("_") || name.startsWith("[")) continue;
    if (name.startsWith("(") && name.endsWith(")")) {
      out.push(...staticSegments(join(dir, name)));
      continue;
    }
    out.push(name);
  }
  return out;
}

const suiteListed = new Set(AUTHOR_SUITE_PREFIXES.map((p) => p.slice("/autor/".length).split("/")[0]));
const reserved = new Set(RESERVED_AUTHOR_HANDLES);

const suiteSegments = staticSegments(join(autorDir, "(suite)"));
const allSegments = Array.from(new Set(staticSegments(autorDir)));

const missingSuite = suiteSegments.filter((s) => !suiteListed.has(s));
const missingReserved = allSegments.filter((s) => !reserved.has(s));

if (missingSuite.length > 0 || missingReserved.length > 0) {
  console.error("\n[siteChrome] Route-Baum und src/lib/siteChrome.ts sind nicht synchron.");
  for (const s of missingSuite) {
    console.error(`  - Suite-Route /autor/${s} fehlt in AUTHOR_SUITE_PREFIXES ("/autor/${s}" ergaenzen).`);
  }
  for (const s of missingReserved.filter((s) => !missingSuite.includes(s))) {
    console.error(`  - Segment /autor/${s} ist nicht in RESERVED_AUTHOR_HANDLES (Handle "${s}" wuerde die Route verdecken).`);
  }
  console.error("  Siehe CLAUDE.md, Abschnitt Author-Routing-Split.\n");
  process.exit(1);
}

// Eintraege ohne Ordner sind harmlos (reservieren nur ein Handle) — nur Hinweis.
const stale = Array.from(suiteListed).filter((s) => !allSegments.includes(s));
if (stale.length > 0) {
  console.warn(`[siteChrome] Hinweis: ohne Route unter /autor/: ${stale.join(", ")}`);
}
console.log(`[siteChrome] ${suiteSegments.length} Suite-Routen geprueft, alle in AUTHOR_SUITE_PREFIXES.`);

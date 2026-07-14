// Manueller Test-Runner fuer Podcast-Helfer.
//   npx tsx src/lib/podcast/__tests__/podcast.manual.ts

import { slugifyPodcast } from "@/lib/podcastSlug";
import {
  formatDuration,
  formatFileSize,
  validatePodcastSource,
} from "@/lib/podcast/format";

let passes = 0;
let fails = 0;
function ok(label: string, cond: boolean, detail?: string): void {
  if (cond) {
    passes++;
    process.stdout.write(`  PASS  ${label}\n`);
  } else {
    fails++;
    process.stdout.write(
      `  FAIL  ${label}${detail ? "\n        " + detail : ""}\n`,
    );
  }
}
function section(l: string): void {
  process.stdout.write(`\n=== ${l} ===\n`);
}

function main() {
  section("slugifyPodcast");
  ok("lowercase + spaces", slugifyPodcast("Der KI Podcast") === "der-ki-podcast");
  ok("Umlaut-Translit", slugifyPodcast("Zukünfte & Träume") === "zukuenfte-und-traeume");
  ok("Sonderzeichen kollabieren", slugifyPodcast("A.I. — 2025!") === "a-i-2025");
  ok("Raender getrimmt", slugifyPodcast("  Hallo  ") === "hallo");
  ok("leer -> podcast", slugifyPodcast("") === "podcast");
  ok("nur Sonderzeichen -> podcast", slugifyPodcast("!!!") === "podcast");
  ok("ss-Translit", slugifyPodcast("Straße") === "strasse");

  section("formatDuration");
  ok("0 -> 0:00", formatDuration(0) === "0:00");
  ok("65 -> 1:05", formatDuration(65) === "1:05");
  ok("600 -> 10:00", formatDuration(600) === "10:00");
  ok("3661 -> 1:01:01", formatDuration(3661) === "1:01:01");
  ok("nachkomma abgeschnitten 65.9 -> 1:05", formatDuration(65.9) === "1:05");
  ok("null -> 0:00", formatDuration(null) === "0:00");
  ok("negativ -> 0:00", formatDuration(-5) === "0:00");
  ok("NaN -> 0:00", formatDuration(NaN) === "0:00");

  section("formatFileSize");
  ok("null -> ''", formatFileSize(null) === "");
  ok("0 -> ''", formatFileSize(0) === "");
  ok("500 KB", formatFileSize(512000) === "500 KB");
  ok("MB gerundet", formatFileSize(3_500_000) === "3.3 MB");

  section("validatePodcastSource");
  ok(
    "self_hosted ohne audio -> Fehler",
    validatePodcastSource({
      title: "X",
      sourceType: "self_hosted",
      audioUrl: null,
      externalUrls: [],
    }) !== null,
  );
  ok(
    "self_hosted mit audio -> ok",
    validatePodcastSource({
      title: "X",
      sourceType: "self_hosted",
      audioUrl: "https://x.supabase.co/a.mp3",
      externalUrls: [],
    }) === null,
  );
  ok(
    "external ohne Links -> Fehler",
    validatePodcastSource({
      title: "X",
      sourceType: "external",
      audioUrl: null,
      externalUrls: [null, "", "  "],
    }) !== null,
  );
  ok(
    "external mit einem Link -> ok",
    validatePodcastSource({
      title: "X",
      sourceType: "external",
      audioUrl: null,
      externalUrls: [null, "https://open.spotify.com/x"],
    }) === null,
  );

  process.stdout.write(`\n${passes} passed, ${fails} failed\n`);
  if (fails > 0) process.exit(1);
}

main();

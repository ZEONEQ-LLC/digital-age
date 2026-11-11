// Manueller Test-Runner: npx tsx src/lib/editor/__tests__/localImageUrls.manual.ts
import { countLocalImages, isLocalImageUrl, localImageMessage } from "../localImageUrls";
import type { BlockDocument } from "@/types/blocks";

let pass = 0;
let fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  if (got === want) { pass++; return; }
  fail++;
  console.log(`  FAIL  ${name}: ${JSON.stringify(got)} != ${JSON.stringify(want)}`);
}

eq("blob", isLocalImageUrl("blob:https://digital-age.ch/a6a354be"), true);
eq("data", isLocalImageUrl("data:image/png;base64,AAA"), true);
eq("Grossschreibung", isLocalImageUrl("  BLOB:x"), true);
eq("https", isLocalImageUrl("https://dkmvadaypxiaxwfkbghz.supabase.co/storage/v1/object/public/articles/a/b.webp"), false);
eq("leer", isLocalImageUrl(""), false);
eq("null", isLocalImageUrl(null), false);
eq("blob im Pfad", isLocalImageUrl("https://example.com/blob:x"), false);

const img = (url: string) => ({ id: url, type: "image", url, filename: "", alt: "", size: "full", alignment: "center" });
const doc = {
  version: 1,
  blocks: [img("blob:https://x/1"), { id: "p", type: "paragraph", content: "blob:https://x/2 im Text ist kein Bild" }, img("https://ok/x.webp"), img("data:image/png;base64,A")],
  sources: [],
} as unknown as BlockDocument;
eq("zwei lokale Bilder", countLocalImages(doc), 2);
eq("null-Dokument", countLocalImages(null), 0);
eq("Meldung eins", localImageMessage(1).startsWith("Ein Bild im Text"), true);
eq("Meldung zwei", localImageMessage(2).startsWith("2 Bilder im Text"), true);

console.log(`${fail === 0 ? "ALL GREEN" : "FAILURES"} — ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);

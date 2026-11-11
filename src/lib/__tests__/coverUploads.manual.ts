// Manueller Test-Runner: npx tsx src/lib/__tests__/coverUploads.manual.ts
import { coverUploadFilename, discardableCoverUploads } from "../coverUploads";

let pass = 0;
let fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) { pass++; return; }
  fail++;
  console.log(`  FAIL  ${name}: ${g} != ${w}`);
}

const id = "0b6f1c2e-1111-4a2b-9c3d-123456789abc";
const base = "https://dkmvadaypxiaxwfkbghz.supabase.co/storage/v1/object/public/articles";
const url = (name: string, art = id) => `${base}/${art}/${name}`;

// coverUploadFilename
eq("eigener Upload", coverUploadFilename(id, url("1a2b3c4d-bild.webp")), "1a2b3c4d-bild.webp");
eq("mit Query", coverUploadFilename(id, `${url("1a2b3c4d-bild.webp")}?v=2`), "1a2b3c4d-bild.webp");
eq("encodiert", coverUploadFilename(id, url("1a2b3c4d-b%C3%BCro.webp")), "1a2b3c4d-büro.webp");
eq("leer", coverUploadFilename(id, ""), null);
eq("null", coverUploadFilename(id, null), null);
eq("extern", coverUploadFilename(id, "https://example.com/bild.webp"), null);
eq("fremder Artikel", coverUploadFilename(id, url("1a2b3c4d-bild.webp", "andere-id")), null);
eq("Unterordner", coverUploadFilename(id, url("sub/bild.webp")), null);
eq("Punkte", coverUploadFilename(id, url("..%2Fx.webp")), null);
eq("Hero-Studio-Bild", coverUploadFilename(id, url("hero-1a2b3c4d.png")), null);
eq("Hero-Studio-Video", coverUploadFilename(id, url("hero-1a2b3c4d.mp4")), null);
eq("OG-Bild", coverUploadFilename(id, url("og-1a2b3c4d.png")), null);
eq("Hero-aehnlicher Upload", coverUploadFilename(id, url("hero-shot.webp")), "hero-shot.webp");
eq("anderer Bucket", coverUploadFilename(id, url("x.webp").replace("/articles/", "/avatars/")), null);
eq("kaputtes Encoding", coverUploadFilename(id, url("%E0%A4%A.webp")), null);

// discardableCoverUploads
const a = url("aaaaaaaa-a.webp");
const b = url("bbbbbbbb-b.webp");
eq("aktuelles bleibt", discardableCoverUploads(id, [a, b], [b]), ["aaaaaaaa-a.webp"]);
eq("nichts zu tun", discardableCoverUploads(id, [a], [a]), []);
eq("Cover entfernt", discardableCoverUploads(id, [a, b], [""]), ["aaaaaaaa-a.webp", "bbbbbbbb-b.webp"]);
eq("Hero ersetzt Upload", discardableCoverUploads(id, [a], [url("hero-1a2b3c4d.png")]), ["aaaaaaaa-a.webp"]);
eq("fremde URL ignoriert", discardableCoverUploads(id, ["https://example.com/x.webp"], []), []);
eq("doppelt nur einmal", discardableCoverUploads(id, [a, `${a}?v=1`], []), ["aaaaaaaa-a.webp"]);

console.log(`${pass} pass, ${fail} fail`);
if (fail) process.exit(1);

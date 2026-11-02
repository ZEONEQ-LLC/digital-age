// Direkt-Upload der Studio-Dateien aus dem Browser in den Bucket `articles`,
// nach dem Podcast-Muster (src/lib/podcast/upload.ts): Browser-Supabase-Client,
// RLS ueber can_modify_article_image(<articleId>), NICHT ueber Server Actions
// (Body-Limit 4,5 MB auf Vercel). Nur im Browser aufrufbar.

import { createClient } from "@/lib/supabase/client";

const BUCKET = "articles";
const IMMUTABLE_CACHE = "31536000"; // 1 Jahr, Dateien sind immutable (uuid im Namen)

export type HeroAssetKind = "hero" | "og" | "video";

const KIND: Record<HeroAssetKind, { prefix: string; ext: string; contentType: string }> = {
  hero: { prefix: "hero", ext: "png", contentType: "image/png" },
  og: { prefix: "og", ext: "png", contentType: "image/png" },
  video: { prefix: "hero", ext: "mp4", contentType: "video/mp4" },
};

function uuid8(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(16).slice(2, 10).padEnd(8, "0");
}

export type HeroUploadResult = { path: string; url: string };

export async function uploadHeroAsset(articleId: string, blob: Blob, kind: HeroAssetKind): Promise<HeroUploadResult> {
  const k = KIND[kind];
  const path = `${articleId}/${k.prefix}-${uuid8()}.${k.ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: IMMUTABLE_CACHE,
    contentType: k.contentType,
    upsert: false,
  });
  if (error) throw new Error(`Upload fehlgeschlagen (${k.prefix}.${k.ext}): ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

// Nur Pfade des eigenen Artikels im exakten Studio-Schema
// `<articleId>/hero-<8 hex>.png|mp4` bzw. `<articleId>/og-<8 hex>.png|mp4`.
// Alles andere (Unterordner, `..`, fremde Dateinamen, andere Artikel) wird nie geloescht.
export function isHeroAssetPath(articleId: string, path: string): boolean {
  if (!articleId || typeof path !== "string") return false;
  const id = articleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${id}/(hero|og)-[0-9a-f]{8}\\.(png|mp4)$`).test(path);
}

// Best-effort: Fehler werden verschluckt, Rueckgabe = Zahl der angefragten Loeschungen.
export async function deleteHeroAssets(articleId: string, paths: string[]): Promise<number> {
  const own = [...new Set(paths.filter((p) => typeof p === "string" && isHeroAssetPath(articleId, p)))];
  if (!own.length) return 0;
  try {
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove(own);
  } catch {
    // best-effort
  }
  return own.length;
}

// Storage-Pfad aus einer Public-URL des articles-Buckets:
// .../storage/v1/object/public/articles/<articleId>/<datei> → <articleId>/<datei>
export function heroAssetPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/articles\/([^?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

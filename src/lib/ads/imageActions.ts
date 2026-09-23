"use server";

import { randomBytes } from "node:crypto";
import { imageSize } from "image-size";
import { requireEditor } from "@/lib/ads/editorGate";
import { isModuleImagePath } from "@/lib/ads/imagePath";
import { expectedSize, isPlacementCode, matchesExpectedSize } from "@/lib/ads/placements";

// Upload von Bild-Kreativen (G2/G4). Server Action mit FormData und ssr-Client
// (Muster storageActions.uploadArticleImage). Keine client-seitige Kompression:
// Kundenmotive bleiben unveraendert, animierte GIFs bleiben animiert. Die
// Masse werden serverseitig mit image-size aus dem Buffer gelesen — dem
// Client wird nichts geglaubt.
const MAX_BYTES = 2 * 1024 * 1024; // 2 MiB (Bucket-Limit)
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type UploadCreativeImageResult =
  | { ok: true; path: string; width: number; height: number }
  | { ok: false; error: string };

export async function uploadCreativeImage(
  campaignId: string,
  variant: "desktop" | "mobile",
  placementCode: string,
  formData: FormData,
): Promise<UploadCreativeImageResult> {
  try {
    const { supabase } = await requireEditor();
    if (!UUID_RE.test(campaignId)) return { ok: false, error: "Kampagne ungültig." };
    if (!isPlacementCode(placementCode)) return { ok: false, error: "Platzierung unbekannt." };
    if (variant !== "desktop" && variant !== "mobile") return { ok: false, error: "Variante ungültig." };

    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "Keine Datei übermittelt." };
    const ext = MIME_EXT[file.type];
    if (!ext) return { ok: false, error: "Nur JPG, PNG, WebP oder GIF erlaubt." };
    if (file.size > MAX_BYTES) return { ok: false, error: "Datei zu gross (max 2 MB)." };

    const exp = expectedSize(placementCode, variant);
    if (!exp) return { ok: false, error: "Diese Platzierung liefert in dieser Variante nicht aus." };

    const buf = Buffer.from(await file.arrayBuffer());
    let dims: { width?: number; height?: number };
    try {
      dims = imageSize(buf);
    } catch {
      return { ok: false, error: "Bild konnte nicht gelesen werden." };
    }
    const w = dims.width ?? 0;
    const h = dims.height ?? 0;
    if (!matchesExpectedSize(w, h, exp)) {
      return { ok: false, error: `Motiv hat ${w}×${h}, erwartet ${exp.w}×${exp.h} (oder ein Vielfaches).` };
    }

    const path = `${campaignId}/${randomBytes(12).toString("hex")}.${ext}`;
    const { error } = await supabase.storage
      .from("modules")
      .upload(path, buf, { cacheControl: "31536000", upsert: false, contentType: file.type });
    if (error) return { ok: false, error: `Upload fehlgeschlagen: ${error.message}` };

    return { ok: true, path, width: w, height: h };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Loescht eine Datei im Bucket "modules". Nur Pfade im erwarteten Muster.
export async function deleteCreativeImage(path: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { supabase } = await requireEditor();
    if (!isModuleImagePath(path)) return { ok: false, error: "Pfad ungültig." };
    const { error } = await supabase.storage.from("modules").remove([path]);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

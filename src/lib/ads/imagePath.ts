// Pfade im Storage-Bucket "modules": <campaign_id>/<24 hex>.<ext> (G4).
// Client-sicher (nur NEXT_PUBLIC-Env). Kein ad/banner/... in URL oder Pfad.
export const MODULE_IMAGE_PATH_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{24}\.(jpg|png|webp|gif)$/;

export function isModuleImagePath(path: string): boolean {
  return MODULE_IMAGE_PATH_RE.test(path);
}

export function moduleImageUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/modules/${path}`;
}

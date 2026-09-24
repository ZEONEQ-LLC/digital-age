// Grenzen fuer Bild-Kreative. Client-sicher: genutzt vom Upload
// (imageActions.ts, "use server" darf selbst keine Konstanten exportieren) und
// von der Mediadaten-Seite (mediaKit.ts). Muss zum Bucket "modules" passen
// (file_size_limit / allowed_mime_types, Migration 20260923090000).
export const MODULE_IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB

export const MODULE_IMAGE_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

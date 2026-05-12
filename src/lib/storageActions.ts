"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

// Upload-Server-Action für Avatare.
//
// - Owner-Check: nur eigenes authors-Row oder Editor-Rolle (Editor-UI für
//   fremde Avatare kommt in einer Folge-Session — Policy lässt's schon zu).
// - Bildgröße max 2 MB, MIME-Whitelist: JPEG/PNG/WebP.
// - Pfad-Konvention: `<author_id>/<timestamp>.<ext>`.
// - URL wird mit Supabase Image-Transformation (256×256 cover) gespeichert,
//   damit die Anzeige konsistent ist.
// - Altes Avatar im Bucket wird beim Upload gelöscht (Best-Effort —
//   externe URLs aus alten Mock-Daten werden nicht angefasst).
// - DB-Update-Rollback: wenn das authors-Update fehlschlägt, wird der
//   eben hochgeladene File wieder entfernt.
export async function uploadAvatar(
  authorId: string,
  formData: FormData,
): Promise<{ url: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Keine Datei übermittelt.");
  if (file.size > MAX_BYTES) throw new Error("Datei zu gross (max 2 MB).");
  if (!ALLOWED_MIMES.includes(file.type)) {
    throw new Error("Nur JPEG, PNG oder WebP erlaubt.");
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");

  const { data: target } = await supabase
    .from("authors")
    .select("id, avatar_url, handle")
    .eq("id", authorId)
    .maybeSingle();
  if (!target) throw new Error("Author nicht gefunden.");

  const { data: me } = await supabase
    .from("authors")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) throw new Error("Aktueller Author nicht gefunden.");

  const isOwn = me.id === target.id;
  const isEditor = me.role === "editor";
  if (!isOwn && !isEditor) {
    throw new Error("Keine Berechtigung für dieses Avatar.");
  }

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const filename = `${Date.now()}.${ext}`;
  const path = `${authorId}/${filename}`;

  const { error: uploadErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (uploadErr) {
    throw new Error(`Upload fehlgeschlagen: ${uploadErr.message}`);
  }

  // Object-Endpoint statt Render-Endpoint: Image-Transformation-API ist ein
  // Pro-Plan-Feature und auf Free-Tier nicht verfügbar. Client resized vor
  // Upload via Canvas (siehe ProfileEditor), Server-Transform daher unnötig.
  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
  const newUrl = urlData.publicUrl;

  const { error: updateErr } = await supabase
    .from("authors")
    .update({ avatar_url: newUrl })
    .eq("id", authorId);
  if (updateErr) {
    await supabase.storage.from("avatars").remove([path]);
    throw new Error(`DB-Update fehlgeschlagen: ${updateErr.message}`);
  }

  // Cleanup: altes File im Bucket entfernen, falls vorhanden.
  if (target.avatar_url) {
    const oldPath = extractAvatarPath(target.avatar_url);
    if (oldPath && oldPath !== path) {
      await supabase.storage.from("avatars").remove([oldPath]);
    }
  }

  revalidatePath("/autor/profil");
  if (target.handle) {
    revalidatePath(`/autor/${target.handle}`);
  }
  return { url: newUrl };
}

// Public-URL-Formate:
//   .../storage/v1/object/public/avatars/<author_id>/<filename>
//   .../storage/v1/render/image/public/avatars/<author_id>/<filename>?...
// Beide enthalten `/avatars/<path>` — Regex matched beide.
function extractAvatarPath(url: string): string | null {
  const match = url.match(/\/avatars\/([^?]+)/);
  return match ? match[1] : null;
}

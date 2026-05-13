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

// =============================================================================
// Article-Images
// =============================================================================

const ARTICLE_MAX_BYTES = 5 * 1024 * 1024;
const ARTICLE_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Slugifier für den lesbaren Filename-Teil. Umlaute → Translit, Sonderzeichen
// → Bindestriche, max 50 Zeichen. Identisch zum Schema im Slug-RPC für
// Startups, hier aber rein in TS weil File-Upload client-getriggert ist.
function slugifyFilename(name: string): string {
  const withoutExt = name.replace(/\.[^.]+$/, "");
  const translit = withoutExt
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
  const slug = translit.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.slice(0, 50) || "image";
}

async function requireArticleAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  articleId: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");

  const { data: me } = await supabase
    .from("authors")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) throw new Error("Author-Profil nicht gefunden.");

  if (me.role === "editor") return;

  const { data: article } = await supabase
    .from("articles")
    .select("author_id")
    .eq("id", articleId)
    .maybeSingle();
  if (!article) throw new Error("Artikel nicht gefunden.");

  if (article.author_id !== me.id) {
    throw new Error("Keine Berechtigung für dieses Artikel-Bild.");
  }
}

// Upload-Server-Action für Artikel-Bilder.
//
// - Compression läuft client-seitig in der ImageUploader-Komponente
//   (`browser-image-compression`). Hier kommt der bereits komprimierte File an.
// - Filename: `<shortUuid>-<slugifiedOriginalName>.<ext>` — UUID-Prefix für
//   Kollisionssicherheit, slugged Name für SEO/Debugging.
// - Pfad: `<articleId>/<filename>` — Storage-RLS prüft erstes Segment gegen
//   `articles.author_id` bzw. Editor-Rolle.
// - Auth: doppelt-gated — Application-Layer + Storage-RLS-Policy.
export async function uploadArticleImage(
  articleId: string,
  formData: FormData,
): Promise<{ url: string; path: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Keine Datei übermittelt.");
  if (file.size > ARTICLE_MAX_BYTES) {
    throw new Error("Datei zu gross (max 5 MB).");
  }
  if (!ARTICLE_ALLOWED_MIMES.includes(file.type)) {
    throw new Error("Nur JPEG, PNG, WebP oder GIF erlaubt.");
  }

  const supabase = await createClient();
  await requireArticleAccess(supabase, articleId);

  const originalName = file.name || "image";
  const ext = (originalName.split(".").pop() ?? "jpg").toLowerCase();
  const shortUuid = crypto.randomUUID().slice(0, 8);
  const filename = `${shortUuid}-${slugifyFilename(originalName)}.${ext}`;
  const path = `${articleId}/${filename}`;

  const { error: uploadErr } = await supabase.storage
    .from("articles")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (uploadErr) {
    throw new Error(`Upload fehlgeschlagen: ${uploadErr.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("articles")
    .getPublicUrl(path);

  return { url: urlData.publicUrl, path };
}

// Löscht ein einzelnes Article-Bild. Auth doppelt-gated wie Upload.
export async function deleteArticleImage(
  articleId: string,
  filename: string,
): Promise<void> {
  const supabase = await createClient();
  await requireArticleAccess(supabase, articleId);

  const path = `${articleId}/${filename}`;
  const { error } = await supabase.storage.from("articles").remove([path]);
  if (error) throw new Error(`Delete fehlgeschlagen: ${error.message}`);
}

// Listet alle Filenames im Folder eines Articles. Wird für Debug/Cleanup
// und für `deleteAllArticleImages` benutzt.
export async function listArticleImages(
  articleId: string,
): Promise<string[]> {
  const supabase = await createClient();
  await requireArticleAccess(supabase, articleId);

  const { data, error } = await supabase.storage
    .from("articles")
    .list(articleId, { limit: 1000 });
  if (error) throw new Error(`List fehlgeschlagen: ${error.message}`);
  return (data ?? []).map((entry) => entry.name);
}

// Löscht den gesamten Folder eines Articles (Cleanup-Cascade vor Article-Delete
// und Orphan-Cleanup). Best-Effort: wenn der Folder leer ist, ist das kein
// Fehler. RLS-Auth läuft über `listArticleImages` / `remove`.
export async function deleteAllArticleImages(articleId: string): Promise<void> {
  const supabase = await createClient();
  await requireArticleAccess(supabase, articleId);

  const { data: entries, error: listErr } = await supabase.storage
    .from("articles")
    .list(articleId, { limit: 1000 });
  if (listErr) {
    throw new Error(`List fehlgeschlagen: ${listErr.message}`);
  }
  if (!entries || entries.length === 0) return;

  const paths = entries.map((e) => `${articleId}/${e.name}`);
  const { error: removeErr } = await supabase.storage
    .from("articles")
    .remove(paths);
  if (removeErr) {
    throw new Error(`Cleanup fehlgeschlagen: ${removeErr.message}`);
  }
}

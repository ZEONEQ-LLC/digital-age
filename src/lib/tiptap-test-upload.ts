"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Image-Upload für die Tiptap-Test-Sandbox.
// Pfad-Schema: tiptap-test/<timestamp>-<slugified-filename>.<ext>.
// Liegt ausserhalb des regulären articles/<article-id>/-Schemas, daher
// RLS-Policy can_modify_article_image() würde anon-Pfade ablehnen. Wir
// nutzen den Service-Role-Client, gaten aber serverseitig hart auf eine
// gültige Author-Session — externe Uploads sind nicht möglich.
export async function uploadTiptapTestImage(
  formData: FormData,
): Promise<{ url: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Keine Datei übermittelt.");
  if (file.size > MAX_BYTES) throw new Error("Datei zu gross (max 5 MB).");
  if (!ALLOWED_MIMES.includes(file.type)) {
    throw new Error("Nur JPEG, PNG, WebP oder GIF erlaubt.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Login erforderlich.");

  const { data: author, error: authorErr } = await supabase
    .from("authors")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (authorErr || !author) throw new Error("Author-Profil nicht gefunden.");
  if (author.role !== "author" && author.role !== "editor") {
    throw new Error("Nur Authors und Editors dürfen Bilder hochladen.");
  }

  const slug = (file.name || "image")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `tiptap-test/${Date.now()}-${slug}.${ext}`;

  const service = createServiceClient();
  const { error: uploadErr } = await service.storage
    .from("articles")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (uploadErr) throw new Error(`Upload fehlgeschlagen: ${uploadErr.message}`);

  const { data: urlData } = service.storage
    .from("articles")
    .getPublicUrl(path);

  return { url: urlData.publicUrl };
}

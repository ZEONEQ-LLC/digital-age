import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type AuthorRow = Database["public"]["Tables"]["authors"]["Row"];

// Server-side: liest die aktuelle Supabase-Session und holt den zugehörigen
// authors-Row. Kommt null zurück, ist niemand eingeloggt.
//
// Hinweis: Die DB-Shape (slug, display_name, role-as-enum, avatar_url) deckt
// nicht alle Felder ab, die das Author-Suite-UI heute aus dem Mock zieht
// (handle, social, location, joinedAt, role-as-Job-Title). Diese
// Schema-Lücken werden in Session C mit einer eigenen Migration ergänzt,
// bevor die client-side Konsumenten von mockAuthorApi auf Supabase
// umgestellt werden.
export async function getCurrentAuthor(): Promise<AuthorRow | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: author } = await supabase
    .from("authors")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return author;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

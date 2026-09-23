import "server-only";
import { createClient } from "@/lib/supabase/server";

// Jede Admin-Action beginnt hiermit (Muster admin/startups). RLS auf ad_*
// gatet zusaetzlich ueber is_editor().
export async function requireEditor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");
  const { data: me } = await supabase
    .from("authors")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) throw new Error("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new Error("Nur Editor:innen.");
  return { supabase, editorId: me.id };
}

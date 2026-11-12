import "server-only";

import { FormError } from "@/lib/actionResult";
import { createClient } from "@/lib/supabase/server";

// Editor-Pruefung fuer die Admin-Actions der KI-Jobs. Liefert die Author-ID,
// damit ein Klick auf «Jetzt …» die KI-Kosten dem Editor zuschreibt.
export async function requireEditorId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new FormError("Nicht eingeloggt.");
  const { data: me } = await supabase.from("authors").select("id, role").eq("user_id", user.id).maybeSingle();
  if (!me) throw new FormError("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new FormError("Nur Editoren dürfen das.");
  return me.id;
}

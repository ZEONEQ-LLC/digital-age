"use server";

import { createClient } from "@/lib/supabase/server";
import { checkUrls, type UrlCheckOutcome } from "./urlCheck";

// Editor-Gate (gleiches Pattern wie authorAdminActions.requireEditor). Der
// Check ist ein server-seitiger Fetch-Proxy auf fremde URLs — daher nur fuer
// Editor:innen, nicht fuer anon/Author.
async function requireEditor(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt.");
  const { data: me } = await supabase
    .from("authors")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) throw new Error("Author-Profil nicht gefunden.");
  if (me.role !== "editor") throw new Error("Nur Editor:innen dürfen Quellen-URLs prüfen.");
}

// Prueft die uebergebenen URLs (aligned by index, null = keine URL) und gibt
// die Outcomes zurueck. Schreibt NICHT in die DB — der Client merged die
// Status in doc.sources, persistiert wird beim naechsten Speichern.
export async function checkSourceUrlsAction(
  urls: (string | null)[],
): Promise<(UrlCheckOutcome | null)[]> {
  await requireEditor();
  // Defensiv: Obergrenze, damit der Proxy nicht zweckentfremdet wird.
  return checkUrls(urls.slice(0, 100));
}

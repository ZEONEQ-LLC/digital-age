"use server";

import { createClient } from "@/lib/supabase/server";
import { parseAppleLink } from "@/lib/podcasts/appleLink";
import { fetchApplePageMeta } from "@/lib/podcasts/appleMeta";
import { findYouTubeUrl } from "@/lib/podcasts/platformLinks";
import { FormError, guardMessage } from "@/lib/actionResult";

// Button «Suchen» neben dem YouTube-Feld im Podcast-Formular. Gleiche Suche
// wie die Anreicherung per Kurzbefehl; mit Apple-Link kommt der Show-Name
// von der Apple-Seite (Kanal-Pruefung), ohne Apple-Link nur der Titel.

export type LookupResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

async function requireInternalAuthor(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new FormError("Nicht eingeloggt.");
  const { data: author } = await supabase.from("authors").select("role").eq("user_id", user.id).maybeSingle();
  if (!author || author.role === "external") throw new FormError("Keine Berechtigung.");
}

export async function lookupYouTubeLink(input: { title: string; appleUrl?: string | null }): Promise<LookupResult> {
  const denied = await guardMessage(requireInternalAuthor);
  if (denied) return { ok: false, message: denied };
  if (!process.env.YOUTUBE_API_KEY) return { ok: false, message: "YouTube-Suche nicht konfiguriert (YOUTUBE_API_KEY fehlt)." };

  const title = input.title.trim();
  const link = input.appleUrl ? parseAppleLink(input.appleUrl) : null;
  const meta = link ? await fetchApplePageMeta(link.url) : null;
  const isEpisode = link ? !!link.episodeId : true;
  const showName = meta?.showName ?? (link && !link.episodeId ? (meta?.title ?? title) : null);
  const episodeTitle = isEpisode ? (meta?.title ?? title) : null;
  if (!showName && !episodeTitle) return { ok: false, message: "Titel oder Apple-Link eingeben." };

  const url = await findYouTubeUrl({ showName, episodeTitle });
  if (!url) return { ok: false, message: "Kein passendes Video gefunden. Link bitte manuell eintragen." };
  return { ok: true, url };
}

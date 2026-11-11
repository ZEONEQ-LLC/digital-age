import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { callLLMForAuthor } from "@/lib/ai/systemCall";
import { resolveSystemAuthorId } from "@/lib/ai/systemAuthor";
import { PODCAST_CATEGORIES, isPodcastCategory } from "@/lib/podcastCategories";
import { slugifyPodcast } from "@/lib/podcastSlug";
import { parseAppleLink, type AppleLink } from "@/lib/podcasts/appleLink";
import { fetchApplePageMeta, lookupAppleShow, type ApplePageMeta, type AppleShowMeta } from "@/lib/podcasts/appleMeta";
import { sendPodcastDraftNotification } from "@/lib/podcasts/mail";
import { findPlatformLinks } from "@/lib/podcasts/platformLinks";
import { PODCAST_LANGUAGES } from "@/lib/mappers/podcastMappers";

// Empfehlung per Teilen: Apple-Link -> Entwurf (sofort) -> Anreicherung im
// Hintergrund (Metadaten + KI) -> Freigabe durch einen Editor unter
// /autor/freigaben. Der Endpoint veroeffentlicht nie.
//
// Zwei Phasen, damit der Kurzbefehl in unter 2 s eine Antwort bekommt:
//   ingestAppleLink   : Link lesen, Dublette pruefen, Entwurf mit Titel anlegen
//   enrichPodcastDraft: Apple-Seite + iTunes Lookup + KI, Zeile vervollstaendigen
//
// Fehler landen sichtbar auf der Zeile (ingest_status = failed, ingest_error)
// und nie still im Log allein. Mit notify=true (Endpoint) geht danach eine
// Mail an den Empfehler (authors.email), ready wie failed; der Retry aus der
// Freigaben-Seite verschickt keine Mail.

export type IngestOutcome =
  | { status: "created"; id: string; message: string }
  | { status: "exists"; id: string; message: string }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };

type Sb = ReturnType<typeof createServiceClient>;

const DEFAULT_CATEGORY = PODCAST_CATEGORIES[0];
const LANGS = new Set(["de", "en", "fr", "it"]);

// Titel-Notnagel aus dem Pfad-Slug, falls die Apple-Seite nicht lesbar ist.
function titleFromLink(link: AppleLink): string {
  const seg = new URL(link.url).pathname.split("/").filter(Boolean);
  const slug = seg.length >= 2 ? seg[seg.length - 2] : seg[seg.length - 1] ?? "";
  const words = slug.replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Podcast-Empfehlung";
}

async function findExisting(supabase: Sb, link: AppleLink): Promise<{ id: string; title: string } | null> {
  const q = supabase.from("podcasts").select("id, title");
  const { data } = link.episodeId
    ? await q.eq("apple_episode_id", link.episodeId).maybeSingle()
    : await q.eq("apple_show_id", link.showId).is("apple_episode_id", null).maybeSingle();
  return data ?? null;
}

export async function ingestAppleLink(rawUrl: string): Promise<IngestOutcome> {
  const link = parseAppleLink(rawUrl);
  if (!link) {
    return { status: "invalid", message: "Kein Apple-Podcasts-Link erkannt. Bitte den Link einer Folge oder Show teilen." };
  }
  const supabase = createServiceClient();

  const existing = await findExisting(supabase, link);
  if (existing) return { status: "exists", id: existing.id, message: `Schon vorhanden: ${existing.title}` };

  // Empfehler: feste Author-ID aus der Env, sonst der erste Editor.
  const recommenderId = await resolveSystemAuthorId(supabase, "PODCAST_INGEST_AUTHOR_ID");
  if (!recommenderId) return { status: "error", message: "Kein Empfehler konfiguriert (PODCAST_INGEST_AUTHOR_ID oder Editor fehlt)." };

  // Titel sofort von der Apple-Seite (kurz), damit die Mitteilung aussagekraeftig ist.
  const meta = await fetchApplePageMeta(link.url);
  const title = (meta?.title ?? titleFromLink(link)).slice(0, 200);

  const base = {
    title,
    description: null,
    cover_image_url: meta?.image ?? null,
    language: "de",
    podcast_category: DEFAULT_CATEGORY,
    source_type: "external",
    apple_podcasts_url: link.url,
    apple_show_id: link.showId,
    apple_episode_id: link.episodeId,
    duration_seconds: meta?.durationSeconds ?? null,
    ai_generated: false,
    is_published: false,
    recommended_by_id: recommenderId,
    recommended_at: new Date().toISOString(),
    ingest_status: "pending",
    ingest_error: null,
  };

  let slug = slugifyPodcast(title) || `podcast-${Date.now()}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase.from("podcasts").insert({ ...base, slug }).select("id").single();
    if (!error && data) {
      return { status: "created", id: data.id, message: `Erhalten: ${title}` };
    }
    if (error?.code === "23505") {
      // Slug oder Apple-ID kollidiert: Apple-ID -> parallel eingetroffen = vorhanden.
      const again = await findExisting(supabase, link);
      if (again) return { status: "exists", id: again.id, message: `Schon vorhanden: ${again.title}` };
      slug = `${slugifyPodcast(title)}-${Math.floor(Math.random() * 9000 + 1000)}`;
      continue;
    }
    console.error("[podcast-ingest] Insert fehlgeschlagen:", error?.message);
    return { status: "error", message: "Entwurf konnte nicht gespeichert werden." };
  }
  return { status: "error", message: "Kein eindeutiger Slug gefunden." };
}

// ── Anreicherung ──────────────────────────────────────────────────────────
type Draft = {
  id: string;
  title: string;
  apple_podcasts_url: string | null;
  apple_show_id: string | null;
  apple_episode_id: string | null;
  recommended_by_id: string | null;
  cover_image_url: string | null;
};

type AiFields = { description: string; category: string; language: string; title?: string };

function stripCodeFence(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function parseAiFields(raw: string): AiFields | null {
  try {
    const p = JSON.parse(stripCodeFence(raw)) as Record<string, unknown>;
    const description = typeof p.description === "string" ? p.description.trim() : "";
    const category = typeof p.category === "string" ? p.category.trim() : "";
    const language = typeof p.language === "string" ? p.language.trim().toLowerCase() : "";
    const title = typeof p.title === "string" ? p.title.trim() : undefined;
    if (!description) return null;
    return { description, category, language, title };
  } catch (err) {
    console.error("[podcast-ingest] KI-Antwort kein JSON:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

function buildSystem(): string {
  return [
    "Du schreibst fuer digital-age.ch, ein Schweizer Magazin fuer KI und Future Tech.",
    "Aufgabe: Aus Metadaten einer Podcast-Folge oder eines Podcasts eine Empfehlung erstellen.",
    "Antworte NUR mit einem JSON-Objekt, ohne Erklaerung, ohne Code-Fence:",
    '{"description": string, "category": string, "language": "de"|"en"|"fr"|"it", "title": string}',
    "description: 2 bis 3 Saetze auf Deutsch (Schweizer Schreibweise, ss statt ß), in eigenen Worten, sachlich, kein Marketing, keine Anbieterbeschreibung kopieren, keine Ich-Form.",
    `category: genau einer dieser Werte: ${PODCAST_CATEGORIES.map((c) => `"${c}"`).join(", ")}.`,
    "language: Sprache, in der der Podcast gesprochen wird (aus Titel/Beschreibung ableiten).",
    "title: der Originaltitel, bereinigt um Folgennummern-Praefixe wie '#541 -' oder 'Ep. 12:', sonst unveraendert.",
  ].join("\n");
}

function buildPrompt(d: Draft, meta: ApplePageMeta | null, show: AppleShowMeta | null): string {
  const kind = d.apple_episode_id ? "Podcast-Folge" : "Podcast (ganze Show)";
  const lines = [
    `Art: ${kind}`,
    `Titel: ${meta?.title ?? d.title}`,
    show?.name || meta?.showName ? `Podcast/Show: ${show?.name ?? meta?.showName}` : null,
    show?.genre ? `Genre laut Apple: ${show.genre}` : null,
    meta?.releaseDate ? `Veroeffentlicht: ${meta.releaseDate}` : null,
    meta?.durationSeconds ? `Dauer: ${Math.round(meta.durationSeconds / 60)} Minuten` : null,
    meta?.description ? `Beschreibung des Anbieters (nur als Quelle, nicht kopieren):\n${meta.description.slice(0, 3000)}` : "Keine Anbieterbeschreibung verfuegbar.",
  ].filter((l): l is string => !!l);
  return lines.join("\n");
}

type EnrichOptions = { notify?: boolean };

function langLabel(code: string): string {
  return PODCAST_LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

function durationLabel(sec: number | null): string | null {
  if (!sec) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h} Std. ${m} Min.` : `${m} Min.`;
}

// Liest die fertige Zeile und schickt die Mail. Fehler nur ins Log: die Mail
// ist Komfort, der Entwurf liegt so oder so auf der Freigaben-Seite.
async function notifyRecommender(supabase: Sb, id: string): Promise<void> {
  const { data: row } = await supabase
    .from("podcasts")
    .select("title, description, cover_image_url, podcast_category, language, duration_seconds, apple_podcasts_url, spotify_url, youtube_url, apple_episode_id, ingest_status, ingest_error, recommended_by_id")
    .eq("id", id)
    .maybeSingle();
  if (!row || !row.recommended_by_id || (row.ingest_status !== "ready" && row.ingest_status !== "failed")) return;
  const { data: author } = await supabase.from("authors").select("email").eq("id", row.recommended_by_id).maybeSingle();
  if (!author?.email) {
    console.error(`[podcast-ingest] ${id}: Empfehler ohne E-Mail, keine Mail.`);
    return;
  }
  await sendPodcastDraftNotification({
    to: author.email,
    props: {
      status: row.ingest_status,
      kind: row.apple_episode_id ? "Folge" : "Podcast",
      title: row.title,
      coverUrl: row.cover_image_url,
      description: row.description,
      category: row.podcast_category,
      languageLabel: langLabel(row.language),
      durationLabel: durationLabel(row.duration_seconds),
      appleUrl: row.apple_podcasts_url,
      spotifyUrl: row.spotify_url,
      youtubeUrl: row.youtube_url,
      error: row.ingest_error,
    },
  });
}

export async function enrichPodcastDraft(id: string, opts: EnrichOptions = {}): Promise<void> {
  const supabase = createServiceClient();
  await enrich(supabase, id);
  if (opts.notify) await notifyRecommender(supabase, id);
}

async function enrich(supabase: Sb, id: string): Promise<void> {
  const { data } = await supabase
    .from("podcasts")
    .select("id, title, apple_podcasts_url, apple_show_id, apple_episode_id, recommended_by_id, cover_image_url")
    .eq("id", id)
    .maybeSingle();
  const draft = data as Draft | null;
  if (!draft || !draft.apple_podcasts_url || !draft.recommended_by_id) return;

  const fail = async (msg: string) => {
    console.error(`[podcast-ingest] ${draft.id}: ${msg}`);
    await supabase.from("podcasts").update({ ingest_status: "failed", ingest_error: msg.slice(0, 500) }).eq("id", draft.id);
  };

  try {
    const [meta, show] = await Promise.all([
      fetchApplePageMeta(draft.apple_podcasts_url),
      draft.apple_show_id ? lookupAppleShow(draft.apple_show_id) : Promise.resolve(null),
    ]);
    if (!meta && !show) {
      await fail("Weder Apple-Seite noch iTunes Lookup lieferten Daten.");
      return;
    }

    // KI und YouTube-Suche parallel; die Suche ist fehlertolerant und
    // liefert null, wenn Key oder Treffer fehlen.
    const [ai, links] = await Promise.all([
      callLLMForAuthor(draft.recommended_by_id, {
        system: buildSystem(),
        prompt: buildPrompt(draft, meta, show),
        maxTokens: 400,
        task: "podcast_ingest",
      }),
      findPlatformLinks({
        showName: show?.name ?? meta?.showName ?? null,
        episodeTitle: draft.apple_episode_id ? (meta?.title ?? draft.title) : null,
      }),
    ]);
    if (!ai.ok) {
      await fail(`KI-Schritt fehlgeschlagen (${ai.kind}): ${ai.message}`);
      return;
    }
    const fields = parseAiFields(ai.text);
    if (!fields) {
      await fail("KI-Antwort hatte nicht das erwartete Format.");
      return;
    }

    // Cover: Folge -> Bild der Apple-Seite, Show -> 600px-Artwork aus dem Lookup.
    const cover = draft.apple_episode_id
      ? (meta?.image ?? show?.artwork ?? draft.cover_image_url)
      : (show?.artwork ?? meta?.image ?? draft.cover_image_url);

    const { error } = await supabase
      .from("podcasts")
      .update({
        title: (fields.title || meta?.title || draft.title).slice(0, 200),
        description: fields.description.slice(0, 1500),
        podcast_category: isPodcastCategory(fields.category) ? fields.category : DEFAULT_CATEGORY,
        language: LANGS.has(fields.language) ? fields.language : "de",
        cover_image_url: cover,
        youtube_url: links.youtubeUrl,
        duration_seconds: meta?.durationSeconds ?? null,
        ai_generated: true,
        ingest_status: "ready",
        ingest_error: null,
      })
      .eq("id", draft.id);
    if (error) await fail(`Speichern fehlgeschlagen: ${error.message}`);
  } catch (err) {
    await fail(err instanceof Error ? err.message : String(err));
  }
}

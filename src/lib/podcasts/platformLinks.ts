import "server-only";

import { bestSimilarity, pickBest, type Candidate } from "@/lib/podcasts/titleMatch";

// YouTube-Link zu einer Podcast-Folge oder Show (Data API v3, API-Key).
// Deterministische Suche mit Titelabgleich, keine KI: ein Sprachmodell kennt
// die URLs nicht.
//
// Spotify bewusst nicht: Seit Februar 2026 verlangt Spotify fuer Development-
// Mode-Apps ein Premium-Konto des Besitzers und zieht sich beim Client-
// Credentials-Flow von Metadaten-Endpunkten zurueck (PR #177/#178, 403 auf
// /search). Spotify-Links werden manuell gepflegt.
//
// Fehlt der Key, liefert die Suche null und loggt einmal; Anreicherung und
// Formular laufen weiter. Treffer nur oberhalb der Schwelle, sonst bleibt das
// Feld leer.

const TIMEOUT_MS = 6_000;

// Fehlerantworten mit Body loggen: Spotify und YouTube schicken den Grund
// (z.B. Premium-Pflicht, Quota, Key-Einschraenkung) im JSON-Body mit, der
// Status allein sagt nichts.
async function errorDetail(res: Response): Promise<string> {
  try {
    const text = (await res.text()).replace(/\s+/g, " ").trim();
    return text ? ` ${text.slice(0, 300)}` : "";
  } catch {
    return "";
  }
}
const EPISODE_THRESHOLD = 0.6;
const SHOW_THRESHOLD = 0.7;

export type PlatformLookupInput = {
  showName: string | null;
  episodeTitle: string | null; // null = ganze Show
};

export type PlatformLinks = {
  youtubeUrl: string | null;
};

// Kandidaten mit Score fuers Log, damit sich die Schwellen aus echten
// Faellen nachjustieren lassen.
function describe<T>(wanted: string, cands: Candidate<T>[]): string {
  if (cands.length === 0) return "keine Kandidaten";
  return cands
    .map((c) => `${bestSimilarity(wanted, c.title).toFixed(2)} "${c.title.slice(0, 80)}"`)
    .join(" | ");
}

// ── YouTube ────────────────────────────────────────────────────────────────
type YtSearchItem = {
  id: { kind: string; videoId?: string; channelId?: string };
  snippet: { title: string; channelTitle: string; channelId: string };
};

function decodeHtml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

async function youtubeSearch(params: Record<string, string>): Promise<YtSearchItem[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  const qs = new URLSearchParams({ part: "snippet", maxResults: "5", key, ...params });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${qs}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`[podcast-ingest:youtube] search ${res.status}${await errorDetail(res)}`);
    return [];
  }
  const json = (await res.json()) as { items?: YtSearchItem[] };
  return json.items ?? [];
}

export async function findYouTubeUrl(input: PlatformLookupInput): Promise<string | null> {
  if (!process.env.YOUTUBE_API_KEY) return null;
  if (!input.showName && !input.episodeTitle) return null;

  // Ohne Show-Namen (Formular ohne Apple-Link): nur Titel, dafuer strengere
  // Schwelle, weil die Kanal-Pruefung entfaellt.
  if (!input.showName) {
    const videos = await youtubeSearch({ type: "video", q: input.episodeTitle!.slice(0, 200) });
    const cands = videos.map((v): Candidate<YtSearchItem> => ({ item: v, title: decodeHtml(v.snippet.title) }));
    const hit = pickBest(input.episodeTitle!, cands, SHOW_THRESHOLD);
    if (!hit) {
      console.warn(`[podcast-ingest:youtube] kein Video zu "${input.episodeTitle}" (ohne Show): ${describe(input.episodeTitle!, cands)}`);
      return null;
    }
    return hit.item.id.videoId ? `https://www.youtube.com/watch?v=${hit.item.id.videoId}` : null;
  }

  if (!input.episodeTitle) {
    const channels = await youtubeSearch({ type: "channel", q: input.showName });
    const ch = pickBest(input.showName, channels.map((c): Candidate<YtSearchItem> => ({ item: c, title: decodeHtml(c.snippet.title) })), SHOW_THRESHOLD);
    return ch?.item.id.channelId ? `https://www.youtube.com/channel/${ch.item.id.channelId}` : null;
  }

  const videos = await youtubeSearch({ type: "video", q: `${input.showName} ${input.episodeTitle}`.slice(0, 200) });
  // Video muss zum Folgentitel passen UND vom Kanal der Show kommen; sonst
  // landen Clips oder Fremdvideos als Link auf der Seite.
  const showName = input.showName;
  const sameChannel = videos.filter((v) => pickBest(showName, [{ item: v, title: decodeHtml(v.snippet.channelTitle) }], 0.5));
  const hit = pickBest(input.episodeTitle, sameChannel.map((v): Candidate<YtSearchItem> => ({ item: v, title: decodeHtml(v.snippet.title) })), EPISODE_THRESHOLD);
  if (!hit) {
    const all = videos.map((v): Candidate<YtSearchItem> => ({ item: v, title: `${decodeHtml(v.snippet.channelTitle)} › ${decodeHtml(v.snippet.title)}` }));
    console.warn(`[podcast-ingest:youtube] kein Video zu "${input.episodeTitle}" (${sameChannel.length}/${videos.length} vom Kanal): ${describe(input.episodeTitle, all)}`);
    return null;
  }
  return hit.item.id.videoId ? `https://www.youtube.com/watch?v=${hit.item.id.videoId}` : null;
}

// ── Fehlertolerant fuer die Anreicherung ──────────────────────────────────
export async function findPlatformLinks(input: PlatformLookupInput): Promise<PlatformLinks> {
  const youtube = await findYouTubeUrl(input).catch((err) => {
    console.error("[podcast-ingest:youtube]", err instanceof Error ? err.message : String(err));
    return null;
  });
  return { youtubeUrl: youtube };
}

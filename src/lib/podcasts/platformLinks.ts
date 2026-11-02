import "server-only";

import { pickBest, type Candidate } from "@/lib/podcasts/titleMatch";

// Plattform-Links zu einer Apple-Empfehlung: Spotify (Web API, Client
// Credentials) und YouTube (Data API v3, API-Key). Beides deterministische
// Suchen mit Titelabgleich, keine KI: ein Sprachmodell kennt die URLs nicht.
//
// Fehlt ein Key, liefert die Quelle null und loggt einmal; die Anreicherung
// laeuft weiter. Treffer nur oberhalb der Schwelle, sonst bleibt das Feld leer
// und der Editor ergaenzt den Link bei Bedarf am Desktop.

const TIMEOUT_MS = 6_000;
const EPISODE_THRESHOLD = 0.6;
const SHOW_THRESHOLD = 0.7;
const SPOTIFY_MARKET = "CH";

export type PlatformLookupInput = {
  showName: string | null;
  episodeTitle: string | null; // null = ganze Show
};

export type PlatformLinks = {
  spotifyUrl: string | null;
  youtubeUrl: string | null;
};

// ── Spotify ────────────────────────────────────────────────────────────────
let spotifyToken: { value: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (spotifyToken && spotifyToken.expiresAt > Date.now() + 30_000) return spotifyToken.value;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`[podcast-ingest:spotify] Token-Request ${res.status}`);
    return null;
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  spotifyToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return spotifyToken.value;
}

async function spotifyGet<T>(token: string, path: string): Promise<T | null> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`[podcast-ingest:spotify] ${path.split("?")[0]} ${res.status}`);
    return null;
  }
  return (await res.json()) as T;
}

type SpotifyShow = { id: string; name: string; external_urls: { spotify: string } };
type SpotifyEpisode = { id: string; name: string; external_urls: { spotify: string }; show?: { id: string } };

export async function findSpotifyUrl(input: PlatformLookupInput): Promise<string | null> {
  if (!input.showName) return null;
  const token = await getSpotifyToken();
  if (!token) return null;

  const q = encodeURIComponent(input.showName);
  const shows = await spotifyGet<{ shows: { items: SpotifyShow[] } }>(token, `/search?q=${q}&type=show&market=${SPOTIFY_MARKET}&limit=5`);
  const show = pickBest(input.showName, (shows?.shows.items ?? []).map((s): Candidate<SpotifyShow> => ({ item: s, title: s.name })), SHOW_THRESHOLD);
  if (!show) return null;
  if (!input.episodeTitle) return show.item.external_urls.spotify;

  // Folge: erst die 50 neuesten Folgen der Show, dann Suche + Show-Pruefung.
  const eps = await spotifyGet<{ items: SpotifyEpisode[] }>(token, `/shows/${show.item.id}/episodes?market=${SPOTIFY_MARKET}&limit=50`);
  const hit = pickBest(input.episodeTitle, (eps?.items ?? []).filter(Boolean).map((e): Candidate<SpotifyEpisode> => ({ item: e, title: e.name })), EPISODE_THRESHOLD);
  if (hit) return hit.item.external_urls.spotify;

  const eq = encodeURIComponent(input.episodeTitle.slice(0, 100));
  const found = await spotifyGet<{ episodes: { items: SpotifyEpisode[] } }>(token, `/search?q=${eq}&type=episode&market=${SPOTIFY_MARKET}&limit=10`);
  const cand = pickBest(input.episodeTitle, (found?.episodes.items ?? []).filter(Boolean).map((e): Candidate<SpotifyEpisode> => ({ item: e, title: e.name })), EPISODE_THRESHOLD);
  if (!cand) return null;
  const full = await spotifyGet<SpotifyEpisode>(token, `/episodes/${cand.item.id}?market=${SPOTIFY_MARKET}`);
  return full?.show?.id === show.item.id ? full.external_urls.spotify : null;
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
    console.error(`[podcast-ingest:youtube] search ${res.status}`);
    return [];
  }
  const json = (await res.json()) as { items?: YtSearchItem[] };
  return json.items ?? [];
}

export async function findYouTubeUrl(input: PlatformLookupInput): Promise<string | null> {
  if (!process.env.YOUTUBE_API_KEY || !input.showName) return null;

  if (!input.episodeTitle) {
    const channels = await youtubeSearch({ type: "channel", q: input.showName });
    const ch = pickBest(input.showName, channels.map((c): Candidate<YtSearchItem> => ({ item: c, title: decodeHtml(c.snippet.title) })), SHOW_THRESHOLD);
    return ch?.item.id.channelId ? `https://www.youtube.com/channel/${ch.item.id.channelId}` : null;
  }

  const videos = await youtubeSearch({ type: "video", q: `${input.showName} ${input.episodeTitle}`.slice(0, 200) });
  // Video muss zum Folgentitel passen UND vom Kanal der Show kommen; sonst
  // landen Clips oder Fremdvideos als Link auf der Seite.
  const sameChannel = videos.filter((v) => pickBest(input.showName!, [{ item: v, title: decodeHtml(v.snippet.channelTitle) }], 0.5));
  const hit = pickBest(input.episodeTitle, sameChannel.map((v): Candidate<YtSearchItem> => ({ item: v, title: decodeHtml(v.snippet.title) })), EPISODE_THRESHOLD);
  return hit?.item.id.videoId ? `https://www.youtube.com/watch?v=${hit.item.id.videoId}` : null;
}

// ── Beides, fehlertolerant ─────────────────────────────────────────────────
export async function findPlatformLinks(input: PlatformLookupInput): Promise<PlatformLinks> {
  const [spotify, youtube] = await Promise.all([
    findSpotifyUrl(input).catch((err) => { console.error("[podcast-ingest:spotify]", err instanceof Error ? err.message : String(err)); return null; }),
    findYouTubeUrl(input).catch((err) => { console.error("[podcast-ingest:youtube]", err instanceof Error ? err.message : String(err)); return null; }),
  ]);
  return { spotifyUrl: spotify, youtubeUrl: youtube };
}

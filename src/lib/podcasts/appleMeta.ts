import "server-only";

// Metadaten zu einem Apple-Podcasts-Link.
//
// 1) Die geteilte Apple-Seite selbst: og:title, og:image, description sowie
//    ein JSON-LD-Block (PodcastEpisode / PodcastSeries) mit Beschreibung,
//    Datum, Dauer und Show-Name. Das ist der einzige Weg zu einer einzelnen
//    Folge: die iTunes Lookup API kennt keine Folgen-IDs.
// 2) iTunes Lookup API fuer die Show (Name, Cover 600px, Feed-URL, Genre).
//
// Beide Aufrufe sind best effort mit Timeout; der Aufrufer kommt auch ohne
// Daten zurecht (Entwurf bleibt mit Titel aus der URL bestehen).

export type ApplePageMeta = {
  title: string | null;
  description: string | null;
  image: string | null;
  showName: string | null;
  releaseDate: string | null;    // ISO
  durationSeconds: number | null;
  isEpisode: boolean;
};

export type AppleShowMeta = {
  name: string;
  artwork: string | null;
  feedUrl: string | null;
  genre: string | null;
};

const TIMEOUT_MS = 6_000;
const UA = "Mozilla/5.0 (compatible; digital-age-bot/1.0; +https://digital-age.ch)";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function metaContent(html: string, key: string): string | null {
  const re = new RegExp(`<meta\\s+(?:property|name)="${key}"\\s+content="([^"]*)"`, "i");
  const m = html.match(re);
  return m ? decodeEntities(m[1]).trim() || null : null;
}

// ISO-8601-Dauer (PT2H27M12S) -> Sekunden.
function isoDurationToSeconds(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const m = v.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const [, d, h, mi, s] = m.map((x) => (x ? Number(x) : 0));
  const total = d * 86400 + h * 3600 + mi * 60 + s;
  return total > 0 ? total : null;
}

type LdNode = Record<string, unknown>;

function collectLd(html: string): LdNode[] {
  const out: LdNode[] = [];
  const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1]) as unknown;
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const n of nodes) if (n && typeof n === "object") out.push(n as LdNode);
    } catch {
      // ignorieren: nicht jeder Block ist sauberes JSON
    }
  }
  return out;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function fetchApplePageMeta(url: string): Promise<ApplePageMeta | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, "accept-language": "de-CH,de;q=0.9,en;q=0.5" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const ld = collectLd(html);
    const episode = ld.find((n) => n["@type"] === "PodcastEpisode");
    const series = ld.find((n) => n["@type"] === "PodcastSeries");
    const node = episode ?? series ?? null;

    const title = str(node?.name) ?? metaContent(html, "og:title");
    const description = str(node?.description) ?? metaContent(html, "description");
    const imageRaw = node?.image;
    const image =
      str(imageRaw) ??
      str((imageRaw as LdNode | undefined)?.url) ??
      metaContent(html, "og:image");
    const partOf = episode?.partOfSeries as LdNode | undefined;
    const showName = str(partOf?.name) ?? (series ? str(series.name) : null);
    const releaseDate = str(node?.datePublished);
    let durationSeconds = isoDurationToSeconds(episode?.timeRequired ?? episode?.duration);
    if (!durationSeconds) {
      const m = html.match(/"duration":\s*(\d{2,6})\b/);
      if (m) durationSeconds = Number(m[1]);
    }
    return { title, description, image, showName, releaseDate, durationSeconds, isEpisode: !!episode };
  } catch (err) {
    console.error("[podcast-ingest] Apple-Seite nicht lesbar:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function lookupAppleShow(showId: string): Promise<AppleShowMeta | null> {
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(showId)}&entity=podcast`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: LdNode[] };
    const show = (data.results ?? []).find((r) => r.wrapperType === "track" && r.kind === "podcast");
    if (!show) return null;
    const name = str(show.collectionName) ?? str(show.trackName);
    if (!name) return null;
    return {
      name,
      artwork: str(show.artworkUrl600) ?? str(show.artworkUrl100),
      feedUrl: str(show.feedUrl),
      genre: str(show.primaryGenreName),
    };
  } catch (err) {
    console.error("[podcast-ingest] iTunes Lookup fehlgeschlagen:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

import "server-only";

import { XMLParser } from "fast-xml-parser";
import type { Database } from "@/lib/database.types";

type NewsSourceRow = Database["public"]["Tables"]["news_sources"]["Row"];

export type RawFeedItem = {
  source_url: string;
  original_title: string;
  description: string;
  published_at: Date;
};

const REQUEST_TIMEOUT_MS = 10_000;
const USER_AGENT = "digital-age News Ticker / 1.0";
// Fallback wenn der Caller kein Limit übergibt. In der Praxis liefert der
// Refresh-Orchestrator den Wert aus news_ticker_config.items_per_source.
const DEFAULT_MAX_ITEMS = 10;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Atom-Items haben oft mehrere <link>-Tags (alternate, self, …); ohne
  // alwaysCreateTextNode bleibt das Object-Mapping inkonsistent.
  alwaysCreateTextNode: false,
  trimValues: true,
});

/**
 * Lädt einen RSS-2.0- oder Atom-1.0-Feed und liefert maximal 10 Items,
 * sortiert nach published_at desc. Bei Fetch- oder Parse-Fehler wird mit
 * aussagekräftiger Message geworfen — Caller (Refresh-Orchestrator) fängt
 * pro-Quelle ab.
 */
export async function fetchAndParseFeed(
  source: Pick<NewsSourceRow, "url" | "source_type" | "name">,
  maxItems: number = DEFAULT_MAX_ITEMS,
): Promise<RawFeedItem[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);

  let xml: string;
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} bei ${source.url}`);
    }
    xml = await res.text();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Timeout (${REQUEST_TIMEOUT_MS}ms) beim Laden von ${source.url}`);
    }
    throw new Error(
      `Fetch fehlgeschlagen für ${source.url}: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch (err) {
    throw new Error(
      `XML-Parse fehlgeschlagen für ${source.url}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Format-Detection unabhängig vom source.source_type-Hint — Feeds
  // deklarieren oft das eine, liefern das andere. Wir prüfen Top-Level-
  // Keys: RSS hat `rss.channel.item`, Atom hat `feed.entry`.
  const items = extractItems(parsed);
  if (items === null) {
    throw new Error(
      `Unbekanntes Feed-Format bei ${source.url} (weder rss.channel.item noch feed.entry gefunden)`,
    );
  }

  // Sort desc by published_at, dann Top-N (Caller-Config).
  items.sort((a, b) => b.published_at.getTime() - a.published_at.getTime());
  return items.slice(0, maxItems);
}

function extractItems(parsed: unknown): RawFeedItem[] | null {
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;

  // RSS 2.0
  if (p.rss && typeof p.rss === "object") {
    const rss = p.rss as Record<string, unknown>;
    const channel = (rss.channel ?? {}) as Record<string, unknown>;
    const raw = ensureArray(channel.item);
    return raw.map(parseRssItem).filter((x): x is RawFeedItem => x !== null);
  }

  // Atom 1.0
  if (p.feed && typeof p.feed === "object") {
    const feed = p.feed as Record<string, unknown>;
    const raw = ensureArray(feed.entry);
    return raw.map(parseAtomItem).filter((x): x is RawFeedItem => x !== null);
  }

  return null;
}

function ensureArray(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  if (v && typeof v === "object") return [v as Record<string, unknown>];
  return [];
}

function parseRssItem(item: Record<string, unknown>): RawFeedItem | null {
  const link = pickString(item.link);
  const title = pickString(item.title);
  if (!link || !title) return null;

  // description: oft HTML, wird im Generator ohnehin gekürzt — hier
  // raw lassen, kein Strip. Falls leer: content:encoded probieren.
  const desc =
    pickString(item.description) ??
    pickString((item as Record<string, unknown>)["content:encoded"]) ??
    "";

  const dateStr =
    pickString(item.pubDate) ??
    pickString((item as Record<string, unknown>)["dc:date"]) ??
    null;
  const date = parseDateSafe(dateStr);

  return {
    source_url: link,
    original_title: title,
    description: desc,
    published_at: date,
  };
}

function parseAtomItem(item: Record<string, unknown>): RawFeedItem | null {
  const link = pickAtomLink(item.link);
  const title = pickString(item.title);
  if (!link || !title) return null;

  const desc =
    pickString(item.summary) ?? pickString(item.content) ?? "";

  const dateStr =
    pickString(item.published) ??
    pickString(item.updated) ??
    null;
  const date = parseDateSafe(dateStr);

  return {
    source_url: link,
    original_title: title,
    description: desc,
    published_at: date,
  };
}

// Atom-<link> kann String, Objekt mit @_href oder Array daraus sein.
// Wir nehmen den ersten mit rel="alternate" (oder ohne rel-Attribut).
function pickAtomLink(v: unknown): string | null {
  if (typeof v === "string") return v;
  const arr = ensureArray(v);
  for (const entry of arr) {
    const rel = entry["@_rel"];
    if (rel === undefined || rel === "alternate") {
      const href = entry["@_href"];
      if (typeof href === "string" && href.length > 0) return href;
    }
  }
  return null;
}

function pickString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    // CDATA / Text-Node-Wrapper: { "#text": "..." }
    if (typeof obj["#text"] === "string") return obj["#text"] as string;
  }
  return null;
}

function parseDateSafe(s: string | null): Date {
  if (!s) return new Date();
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

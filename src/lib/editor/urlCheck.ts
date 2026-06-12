import "server-only";

import type { Source, SourceUrlStatus } from "@/types/blocks";
import { categorizeStatus } from "./urlStatus";

// Erreichbarkeitspruefung von Quellen-URLs. Server-only: Browser-`fetch` auf
// fremde Origins scheitert an CORS, daher laeuft das ausschliesslich
// server-seitig (Submit-zur-Review + Editor-Button).
//
// Wichtig: Status != Wahrheit. Viele Seiten blocken Bots mit 401/403/429 —
// das ist NICHT "tot". Soft-404s (200 mit "nicht gefunden"-Seite) sind per
// Status grundsaetzlich nicht erkennbar. Die Kategorien spiegeln das wider.

const TIMEOUT_MS = 6000;
const UA =
  "Mozilla/5.0 (compatible; digital-age-linkcheck/1.0; +https://digital-age.ch)";

export type UrlCheckOutcome = { status: SourceUrlStatus; code: number | null };

async function fetchStatus(url: string, method: "HEAD" | "GET"): Promise<number> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": UA, accept: "*/*" },
    });
    return res.status;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkUrl(url: string): Promise<UrlCheckOutcome> {
  if (!/^https?:\/\//i.test(url)) return { status: "error", code: null };
  try {
    let code = await fetchStatus(url, "HEAD");
    // Manche Server lehnen HEAD ab (405 Method Not Allowed / 501) → GET-Fallback.
    if (code === 405 || code === 501) {
      code = await fetchStatus(url, "GET");
    }
    return { status: categorizeStatus(code), code };
  } catch (e) {
    const status: SourceUrlStatus =
      e instanceof Error && e.name === "AbortError" ? "timeout" : "error";
    return { status, code: null };
  }
}

// Prueft alle URLs (aligned by index; null = keine URL) parallel.
export async function checkUrls(
  urls: (string | null | undefined)[],
): Promise<(UrlCheckOutcome | null)[]> {
  return Promise.all(urls.map((u) => (u ? checkUrl(u) : Promise.resolve(null))));
}

// Setzt die Check-Resultate auf eine sources-Liste (neue Liste). Quellen ohne
// URL bleiben unveraendert. `nowIso` wird hereingereicht (deterministisch
// testbar / ein Timestamp pro Lauf).
export async function checkSourcesUrls(
  sources: Source[],
  nowIso: string,
): Promise<Source[]> {
  const outcomes = await checkUrls(sources.map((s) => s.url));
  return sources.map((s, i) => {
    const o = outcomes[i];
    if (!o) return s;
    return {
      ...s,
      urlStatus: o.status,
      ...(o.code != null ? { urlStatusCode: o.code } : { urlStatusCode: undefined }),
      urlCheckedAt: nowIso,
    };
  });
}

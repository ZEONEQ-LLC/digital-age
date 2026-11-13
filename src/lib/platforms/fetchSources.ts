import "server-only";

import {
  ARENA_CATEGORIES,
  htmlToLines,
  mergeByKey,
  parseAppleChart,
  parseArenaRows,
  parseAudioRanking,
  textLength,
  type SourceCandidate,
} from "@/lib/platforms/sources";

// Abruf der festen Quellen fuer den Plattform-Job (PR 206). Ehrlicher
// User-Agent mit Link auf die KI-Transparenz; Seiten, die Bots sperren, gelten
// als «nicht automatisch pruefbar», es wird nichts umgangen.

const UA = "digital-age-plattform-pruefer/1.0 (+https://digital-age.ch/ki-transparenz)";
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 2_000_000;
const MIN_TEXT = 400;

export const APPLE_COUNTRIES = ["ch", "de", "at"] as const;
export const appleChartUrl = (country: string) => `https://rss.marketingtools.apple.com/api/v2/${country}/apps/top-free/100/apps.json`;
// «first-rows» (vorberechnet, robust) statt «rows»: Der Endpunkt «rows» brach
// fuer die grosse Text-Rangliste am 13.11.2026 mit 501 ab. Die ersten 100
// Zeilen sind die Gesamtwertung («overall»), nach Rang sortiert.
export const arenaRowsUrl = (config: string) =>
  `https://datasets-server.huggingface.co/first-rows?dataset=lmarena-ai%2Fleaderboard-dataset&config=${config}&split=latest`;
export const ARENA_SOURCE_URL = "https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset";
export const AUDIO_SOURCE_URL = "https://artificialanalysis.ai/text-to-speech/leaderboard";

export type PageResult =
  | { ok: true; lines: string[]; finalUrl: string }
  | { ok: false; status: "blocked" | "script" | "missing" | "error"; code: number | null; detail: string };

async function get(url: string, accept: string, headers: Record<string, string> = {}): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { headers: { "User-Agent": UA, Accept: accept, ...headers }, redirect: "follow", signal: ac.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPage(url: string): Promise<PageResult> {
  try {
    const res = await get(url, "text/html,application/xhtml+xml");
    if (res.status === 404 || res.status === 410) return { ok: false, status: "missing", code: res.status, detail: `HTTP ${res.status}` };
    if (res.status === 401 || res.status === 403 || res.status === 429) return { ok: false, status: "blocked", code: res.status, detail: `HTTP ${res.status} (sperrt Bots)` };
    if (!res.ok) return { ok: false, status: "error", code: res.status, detail: `HTTP ${res.status}` };
    const text = (await res.text()).slice(0, MAX_BYTES);
    const lines = htmlToLines(text);
    if (textLength(lines) < MIN_TEXT) return { ok: false, status: "script", code: res.status, detail: "Inhalt nur per JavaScript" };
    return { ok: true, lines, finalUrl: res.url || url };
  } catch (err) {
    return { ok: false, status: "error", code: null, detail: err instanceof Error && err.name === "AbortError" ? "Zeitüberschreitung" : "nicht erreichbar" };
  }
}

// Existiert die Adresse? Fuer Links neuer Eintraege: alles ausser 404/410 und
// Netzfehlern gilt (auch eine Bot-Sperre zeigt, dass es die Seite gibt).
export async function urlExists(url: string): Promise<boolean> {
  try {
    const res = await get(url, "text/html");
    return res.status !== 404 && res.status !== 410 && res.status < 500;
  } catch {
    return false;
  }
}

// Einmal wiederholen bei 5xx oder Netzfehler (Apples RSS antwortet ab und zu
// mit 504, beim zweiten Versuch normal; beobachtet 13.11.2026).
async function getJson(url: string, headers?: Record<string, string>): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await get(url, "application/json", headers);
      if (res.ok) return await res.json();
      if (res.status < 500 || attempt >= 1) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt >= 1 || (err instanceof Error && /^HTTP [1-4]/.test(err.message))) throw err;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

export type SourcesResult = { apps: SourceCandidate[]; ranked: SourceCandidate[]; errors: string[]; audioSkipped: boolean };

export async function fetchSources(): Promise<SourcesResult> {
  const errors: string[] = [];
  const apple = await Promise.all(APPLE_COUNTRIES.map(async (c) => {
    try { return parseAppleChart(await getJson(appleChartUrl(c)), c); } catch (e) { errors.push(`App Store ${c.toUpperCase()}: ${e instanceof Error ? e.message : e}`); return []; }
  }));
  const arena = await Promise.all(ARENA_CATEGORIES.map(async (c) => {
    try { return parseArenaRows(await getJson(arenaRowsUrl(c.config)), c.config); } catch (e) { errors.push(`Arena ${c.label}: ${e instanceof Error ? e.message : e}`); return []; }
  }));
  const key = process.env.ARTIFICIAL_ANALYSIS_API_KEY?.trim();
  let audio: SourceCandidate[] = [];
  if (key) {
    const ep = [
      { path: "text-to-speech", label: "Sprachausgabe" },
      { path: "music/with-vocals", label: "Musik" },
    ];
    audio = (await Promise.all(ep.map(async (e) => {
      try { return parseAudioRanking(await getJson(`https://artificialanalysis.ai/api/v2/media/${e.path}/models/free`, { "x-api-key": key }), e.label); } catch (err) { errors.push(`Artificial Analysis ${e.label}: ${err instanceof Error ? err.message : err}`); return []; }
    }))).flat();
  }
  return { apps: mergeByKey(apple.flat()), ranked: mergeByKey([...arena.flat(), ...audio]), errors, audioSkipped: !key };
}

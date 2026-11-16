// Lesestatistik, Messung: reine Logik fuer den Zaehler im Browser
// (ReadingMeter) und die Route /api/lektuere. Ohne Server-Importe.
//
// Was gezaehlt wird, pro Beitrag und Tag (Tabelle article_stats_daily):
//   Aufruf     Der Beitrag wurde geoeffnet. Einmal pro Beitrag und Seitenladung,
//              nicht beim Neuladen, nicht fuer Bots, nicht fuer Angemeldete.
//   Gelesen    Bis zum Textende gescrollt und mindestens ein Viertel der
//              geschaetzten Lesezeit aktiv auf der Seite (15 bis 120 Sekunden).
//   Lesezeit   Sekunden, in denen der Tab sichtbar war und sich in der letzten
//              Minute etwas bewegt hat (Scrollen, Zeiger, Tasten).
//   Lesetiefe  Erreichte Marken 25, 50, 75, 100 Prozent des Textes.
//   Aktionen   «Teilen» geklickt, «Anhören» gestartet.
//   Herkunft   Grobe Klasse des Verweises (Suche, Soziale Medien, E-Mail,
//              KI-Assistent, intern, direkt, andere). Klassiert wird im
//              Browser, der Server sieht die Adresse des Verweises nie.
//
// Es gibt kein Cookie, keinen Speicher im Browser und keine Kennung der Person.
// Deshalb sind es Aufrufe, keine eindeutigen Leserinnen und Leser.

export const READ_EVENT_PATH = "/api/lektuere";

export const DEPTH_MARKS = [25, 50, 75, 100] as const;
export type DepthMark = (typeof DEPTH_MARKS)[number];

export const READ_SOURCES = ["search", "social", "mail", "ai", "internal", "direct", "other"] as const;
export type ReadSource = (typeof READ_SOURCES)[number];

export const READ_ACTIONS = ["share", "listen"] as const;
export type ReadAction = (typeof READ_ACTIONS)[number];

// Eine Meldung deckt hoechstens eine Viertelstunde ab (die RPC begrenzt gleich).
export const MAX_FLUSH_SECONDS = 900;
// Ohne Bewegung gilt die Seite nach einer Minute als verlassen.
export const IDLE_AFTER_MS = 60_000;

// Signal der Knoepfe «Teilen» und «Anhören» an den Zaehler (CustomEvent auf
// window, detail = ReadAction). Auf Seiten ohne Zaehler hoert niemand zu.
export const READ_ACTION_EVENT = "da-read-action";

// Fuer die Knoepfe (nur im Browser aufrufen).
export function signalReadAction(kind: ReadAction) {
  try {
    window.dispatchEvent(new CustomEvent(READ_ACTION_EVENT, { detail: kind }));
  } catch {
    // ohne Wirkung
  }
}

// Meldung an die Route. Kurze Schluessel, weil sie bei jedem Aufruf mitgeht:
// a = Beitrag, v = Aufruf, q = Herkunft (nur mit v), r = gelesen,
// s = aktive Sekunden seit der letzten Meldung, d = neu erreichte Marken,
// x = Aktion.
export type ReadEvent = {
  a: string;
  v?: 1;
  q?: ReadSource;
  r?: 1;
  s?: number;
  d?: DepthMark[];
  x?: ReadAction;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function isOne(v: unknown): v is 1 {
  return v === 1;
}

// Prueft und normalisiert eine Meldung. null = verwerfen. Streng, weil die
// Route oeffentlich ist: unbekannte Werte fuehren nie zu einer Zaehlung.
export function parseReadEvent(input: unknown): ReadEvent | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  if (typeof o.a !== "string" || !UUID_RE.test(o.a)) return null;
  const event: ReadEvent = { a: o.a };

  if (o.v !== undefined) {
    if (!isOne(o.v)) return null;
    event.v = 1;
  }
  if (o.q !== undefined) {
    if (typeof o.q !== "string" || !(READ_SOURCES as readonly string[]).includes(o.q)) return null;
    // Herkunft ohne Aufruf zaehlt nicht.
    if (event.v) event.q = o.q as ReadSource;
  }
  if (o.r !== undefined) {
    if (!isOne(o.r)) return null;
    event.r = 1;
  }
  if (o.s !== undefined) {
    if (typeof o.s !== "number" || !Number.isInteger(o.s) || o.s < 0) return null;
    if (o.s > 0) event.s = Math.min(o.s, MAX_FLUSH_SECONDS);
  }
  if (o.d !== undefined) {
    if (!Array.isArray(o.d) || o.d.length > DEPTH_MARKS.length) return null;
    const marks: DepthMark[] = [];
    for (const m of o.d) {
      if (!(DEPTH_MARKS as readonly unknown[]).includes(m)) return null;
      if (marks.includes(m as DepthMark)) return null;
      marks.push(m as DepthMark);
    }
    if (marks.length > 0) event.d = marks.sort((x, y) => x - y);
  }
  if (o.x !== undefined) {
    if (typeof o.x !== "string" || !(READ_ACTIONS as readonly string[]).includes(o.x)) return null;
    event.x = o.x as ReadAction;
  }

  const carries = event.v || event.r || event.s || event.d || event.x;
  return carries ? event : null;
}

// --- Herkunft -------------------------------------------------------------

const AI_HOSTS = [
  "chatgpt.com", "chat.openai.com", "openai.com", "perplexity.ai", "claude.ai",
  "copilot.microsoft.com", "gemini.google.com", "bard.google.com", "notebooklm.google.com",
  "you.com", "phind.com", "chat.mistral.ai", "poe.com", "duck.ai", "grok.com", "meta.ai",
  "chat.deepseek.com",
];
const MAIL_HOSTS = [
  "mail.google.com", "outlook.live.com", "outlook.office.com", "outlook.office365.com",
  "mail.yahoo.com", "mail.proton.me", "gmx.net", "gmx.ch", "web.de", "bluewin.ch",
];
const SOCIAL_HOSTS = [
  "linkedin.com", "lnkd.in", "t.co", "x.com", "twitter.com", "facebook.com", "fb.com", "fb.me",
  "instagram.com", "threads.net", "threads.com", "reddit.com", "youtube.com", "youtu.be",
  "xing.com", "bsky.app", "tiktok.com", "pinterest.com", "news.ycombinator.com",
];
const SEARCH_HOSTS = [
  "bing.com", "duckduckgo.com", "ecosia.org", "search.brave.com", "yahoo.com", "startpage.com",
  "qwant.com", "baidu.com", "kagi.com", "swisscows.com", "search.ch",
];
const GOOGLE_RE = /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/;
const YANDEX_RE = /(^|\.)yandex\.[a-z]{2,3}$/;

function hostIn(host: string, list: string[]): boolean {
  return list.some((d) => host === d || host.endsWith(`.${d}`));
}

// Klasse eines Hostnamens; null = unbekannt.
function classifyHost(host: string): ReadSource | null {
  const h = host.toLowerCase().replace(/^www\./, "");
  if (!h) return null;
  // Reihenfolge zaehlt: gemini.google.com und mail.google.com vor der Suche.
  if (hostIn(h, AI_HOSTS)) return "ai";
  if (hostIn(h, MAIL_HOSTS) || h.startsWith("mail.") || h.startsWith("webmail.")) return "mail";
  if (hostIn(h, SOCIAL_HOSTS) || h.includes("mastodon")) return "social";
  if (hostIn(h, SEARCH_HOSTS) || GOOGLE_RE.test(h) || YANDEX_RE.test(h)) return "search";
  return null;
}

// Android-Apps melden sich als android-app://<Paketname>.
function classifyAndroidApp(pkg: string): ReadSource {
  const p = pkg.toLowerCase();
  if (p === "com.google.android.gm" || p.includes("mail") || p.includes("outlook")) return "mail";
  if (p.includes("googlequicksearchbox") || p.includes("duckduckgo")) return "search";
  if (/(linkedin|facebook|instagram|twitter|reddit|xing|threads|tiktok)/.test(p)) return "social";
  if (/(openai|chatgpt|perplexity|anthropic)/.test(p)) return "ai";
  return "other";
}

// Herkunft eines Aufrufs.
//   landing   Der Beitrag ist die Seite, mit der das Dokument geladen wurde.
//             Sonst kam die Leserin ueber einen Klick innerhalb der Website
//             (document.referrer zeigt dann noch den alten, fremden Verweis).
//   pageUrl   Adresse des Beitrags (fuer utm_source und utm_medium).
//   referrer  document.referrer, leer = kein Verweis.
export function classifySource(input: { landing: boolean; pageUrl: string; referrer: string }): ReadSource {
  if (!input.landing) return "internal";

  let page: URL | null = null;
  try {
    page = new URL(input.pageUrl);
  } catch {
    page = null;
  }

  // Kampagnen-Parameter schlagen den Verweis: ChatGPT haengt utm_source an,
  // Newsletter-Links tragen utm_medium=email.
  const medium = page?.searchParams.get("utm_medium")?.toLowerCase() ?? "";
  const source = page?.searchParams.get("utm_source")?.toLowerCase() ?? "";
  if (medium === "email" || medium === "newsletter" || source.includes("newsletter")) return "mail";
  if (source) {
    const byHost = classifyHost(source);
    if (byHost) return byHost;
    const byName = classifyHost(`${source}.com`);
    if (byName) return byName;
  }

  const ref = input.referrer.trim();
  if (!ref) return "direct";
  if (ref.startsWith("android-app://")) {
    return classifyAndroidApp(ref.slice("android-app://".length).split("/")[0] ?? "");
  }
  let refUrl: URL;
  try {
    refUrl = new URL(ref);
  } catch {
    return "other";
  }
  if (page && refUrl.host === page.host) return "internal";
  return classifyHost(refUrl.hostname) ?? "other";
}

// --- Lesetiefe und «gelesen» ----------------------------------------------

// Anteil des Textes, der schon durch den sichtbaren Bereich gelaufen ist.
// top = Abstand der Textoberkante zum oberen Fensterrand (getBoundingClientRect).
export function depthPercent(input: { top: number; height: number; viewport: number }): number {
  if (!(input.height > 0) || !(input.viewport > 0)) return 0;
  const seen = input.viewport - input.top;
  return Math.max(0, Math.min(100, (seen / input.height) * 100));
}

// Marken, die bei diesem Stand erreicht sind. Das Ende gilt ab 98 Prozent:
// Die letzte Zeile muss nicht pixelgenau im Fenster stehen.
export function marksReached(percent: number): DepthMark[] {
  return DEPTH_MARKS.filter((m) => percent >= (m === 100 ? 98 : m));
}

// Mindestzeit fuer «gelesen»: ein Viertel der geschaetzten Lesezeit, mindestens
// 15 und hoechstens 120 Sekunden.
export function readThresholdSeconds(readingMinutes: number | null | undefined): number {
  const minutes = typeof readingMinutes === "number" && readingMinutes > 0 ? readingMinutes : 0;
  return Math.max(15, Math.min(120, Math.round(minutes * 60 * 0.25)));
}

// Obergrenze der aktiven Zeit pro Aufruf: das Dreifache der Lesezeit,
// mindestens zehn Minuten. Wer den Tab offen laesst und ab und zu die Maus
// bewegt, soll den Mittelwert nicht verzerren.
export function activeCapSeconds(readingMinutes: number | null | undefined): number {
  const minutes = typeof readingMinutes === "number" && readingMinutes > 0 ? readingMinutes : 0;
  return Math.max(600, Math.round(minutes * 60 * 3));
}

// --- Zustand eines Beitrags waehrend einer Seitenladung -------------------

export type MeterState = {
  // Zaehlt dieser Besuch ueberhaupt (false nach Neuladen)?
  counted: boolean;
  viewSent: boolean;
  readSent: boolean;
  marksSent: DepthMark[];
  actionsSent: ReadAction[];
  // Aktive Sekunden gesamt und davon schon gemeldet.
  active: number;
  flushed: number;
  maxPercent: number;
};

export function newMeterState(counted: boolean): MeterState {
  return {
    counted,
    viewSent: false,
    readSent: false,
    marksSent: [],
    actionsSent: [],
    active: 0,
    flushed: 0,
    maxPercent: 0,
  };
}

// Aufruf melden: einmal pro Beitrag und Seitenladung.
export function takeView(
  state: MeterState,
  articleId: string,
  source: ReadSource,
): { state: MeterState; event: ReadEvent | null } {
  if (!state.counted || state.viewSent) return { state, event: null };
  return { state: { ...state, viewSent: true }, event: { a: articleId, v: 1, q: source } };
}

// Was seit der letzten Meldung dazugekommen ist: Sekunden, neu erreichte
// Marken, «gelesen». null = nichts zu melden. Ohne gemeldeten Aufruf wird
// nichts gemeldet, sonst gaebe es Lesezeit ohne Aufruf.
export function takeFlush(
  state: MeterState,
  articleId: string,
  readingMinutes: number | null | undefined,
): { state: MeterState; event: ReadEvent | null } {
  if (!state.counted || !state.viewSent) return { state, event: null };

  const event: ReadEvent = { a: articleId };
  const next: MeterState = { ...state };

  const delta = Math.min(Math.floor(state.active) - state.flushed, MAX_FLUSH_SECONDS);
  if (delta > 0) {
    event.s = delta;
    next.flushed = state.flushed + delta;
  }

  const reached = marksReached(state.maxPercent);
  const fresh = reached.filter((m) => !state.marksSent.includes(m));
  if (fresh.length > 0) {
    event.d = fresh;
    next.marksSent = [...state.marksSent, ...fresh];
  }

  if (!state.readSent && reached.includes(100) && state.active >= readThresholdSeconds(readingMinutes)) {
    event.r = 1;
    next.readSent = true;
  }

  const carries = event.s || event.d || event.r;
  return carries ? { state: next, event } : { state, event: null };
}

// Aktion melden: jede Art einmal pro Beitrag und Seitenladung.
export function takeAction(
  state: MeterState,
  articleId: string,
  action: ReadAction,
): { state: MeterState; event: ReadEvent | null } {
  if (!state.counted || !state.viewSent || state.actionsSent.includes(action)) return { state, event: null };
  return {
    state: { ...state, actionsSent: [...state.actionsSent, action] },
    event: { a: articleId, x: action },
  };
}

// --- Schutz der Route -----------------------------------------------------

// Meldungen kommen vom Beitrag selbst. Sec-Fetch-Site (alle aktuellen
// Browser) muss same-origin sein; fehlt der Header, entscheidet Origin.
export function isSameOriginRequest(input: {
  secFetchSite: string | null;
  origin: string | null;
  host: string | null;
}): boolean {
  if (input.secFetchSite) return input.secFetchSite === "same-origin";
  if (input.origin) {
    try {
      return !!input.host && new URL(input.origin).host === input.host;
    } catch {
      return false;
    }
  }
  return true;
}

// Angemeldete (Redaktion, Autorinnen, Autoren) zaehlen nicht: Sie lesen ihre
// Beitraege zur Kontrolle. Erkennbar am Sitzungs-Cookie von Supabase
// (sb-<ref>-auth-token, bei langen Sitzungen in Teilen .0, .1 …). Der Wert
// wird nicht gelesen.
export function hasSuiteSession(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader
    .split(";")
    .some((part) => /^sb-[a-z0-9]+-auth-token(\.\d+)?$/.test(part.split("=")[0]?.trim() ?? ""));
}

// Showcase S4: Teil-Kit und Zahlen. Rein, ohne DB und ohne "server-only":
// Kit-Seite, Bericht-Cron, Mail und Zaehler im Browser teilen diese Regeln.
// Test: src/lib/showcase/__tests__/kit.manual.ts.

export const KIT_PATH = "/showcase/teilen";
export const REPORT_AFTER_DAYS = 30;
// Ein Beitrag, dessen 30 Tage laenger als so viele Tage vorbei sind, bekommt
// keinen Bericht mehr (Schutz, falls der Cron einmal lange ausfaellt oder eine
// alte Einreichung nachtraeglich verknuepft wird).
export const REPORT_LATEST_DAYS = 14;

// Kit-Token: 36 Hex-Zeichen (gen_random_bytes(18)).
export function isKitToken(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{36}$/.test(v);
}

export function kitUrl(siteUrl: string, token: string): string {
  return `${siteUrl}${KIT_PATH}/${token}`;
}

// Adresse des Beitrags mit Kennung pro Kanal. Die Lesestatistik
// (classifySource) zaehlt utm_source=linkedin unter «Soziale Medien»,
// utm_medium=email unter «E-Mail», die Website des Unternehmens ueber den
// Verweis unter «Andere Websites».
export type KitChannel = "linkedin" | "website" | "email";

const CHANNEL_UTM: Record<KitChannel, { source: string; medium: string }> = {
  linkedin: { source: "linkedin", medium: "social" },
  website: { source: "company-website", medium: "referral" },
  email: { source: "company-email", medium: "email" },
};

export function kitShareUrl(siteUrl: string, slug: string, channel: KitChannel): string {
  const { source, medium } = CHANNEL_UTM[channel];
  const q = new URLSearchParams({ utm_source: source, utm_medium: medium, utm_campaign: `showcase-${slug}`.slice(0, 80) });
  return `${siteUrl}/showcase/${encodeURIComponent(slug)}?${q.toString()}`;
}

export function teaserImagePath(slug: string): string {
  return `/showcase/${encodeURIComponent(slug)}/teilen-bild`;
}

// Host der Unternehmens-Website ohne «www.», klein. null bei ungueltiger
// oder nicht-http(s) Adresse.
export function companyHost(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const u = new URL(website.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const h = u.hostname.toLowerCase().replace(/^www\./, "");
    return h.includes(".") ? h : null;
  } catch {
    return null;
  }
}

// Fuehrt ein Link auf die Website des Unternehmens (gleicher Host oder eine
// Subdomain davon)? Relative Links und andere Hosts: nein.
export function isCompanyLink(href: string | null | undefined, host: string | null): boolean {
  if (!href || !host) return false;
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const h = u.hostname.toLowerCase().replace(/^www\./, "");
  return h === host || h.endsWith(`.${host}`);
}

// Badge zum Einbinden auf der Website des Unternehmens: statisches SVG vom
// eigenen Server, Link auf den Beitrag. Kein Skript, kein Tracking-Pixel.
export const BADGE_PATH = "/badges/showcase-digital-age.svg";
export const BADGE_WIDTH = 220;
export const BADGE_HEIGHT = 64;

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function badgeSnippet(siteUrl: string, slug: string, company: string): string {
  const href = kitShareUrl(siteUrl, slug, "website");
  const alt = `${company} im Showcase von digital age`;
  return `<a href="${escapeAttr(href)}" rel="noopener"><img src="${escapeAttr(siteUrl + BADGE_PATH)}" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" alt="${escapeAttr(alt)}"></a>`;
}

// --- Zahlen ---------------------------------------------------------------

export type KitStatsRow = {
  day: string;
  views: number;
  reads: number;
  seconds: number;
  website_clicks: number;
  src_search: number;
  src_social: number;
  src_mail: number;
  src_ai: number;
  src_internal: number;
  src_direct: number;
  src_other: number;
};

export type KitFigures = {
  views: number;
  reads: number;
  websiteClicks: number;
  // Durchschnittliche aktive Lesezeit pro Aufruf in Sekunden, null ohne Aufrufe.
  avgSeconds: number | null;
  sources: { key: SourceKey; label: string; views: number }[];
};

type SourceKey = "social" | "search" | "mail" | "ai" | "internal" | "direct" | "other";

const SOURCE_LABELS: { key: SourceKey; label: string; col: keyof KitStatsRow }[] = [
  { key: "social", label: "Soziale Medien (z. B. LinkedIn)", col: "src_social" },
  { key: "search", label: "Suchmaschinen", col: "src_search" },
  { key: "mail", label: "E-Mail und Newsletter", col: "src_mail" },
  { key: "ai", label: "KI-Assistenten", col: "src_ai" },
  { key: "internal", label: "Von digital age selbst", col: "src_internal" },
  { key: "direct", label: "Direkt aufgerufen", col: "src_direct" },
  { key: "other", label: "Andere Websites", col: "src_other" },
];

// Summen ueber Tage. `until` (YYYY-MM-DD, inklusive) begrenzt auf die ersten
// 30 Tage, damit der Bericht genau den angekuendigten Zeitraum zeigt.
export function sumFigures(rows: KitStatsRow[], until?: string): KitFigures {
  let views = 0, reads = 0, seconds = 0, websiteClicks = 0;
  const src: Record<SourceKey, number> = { social: 0, search: 0, mail: 0, ai: 0, internal: 0, direct: 0, other: 0 };
  for (const r of rows) {
    if (until && r.day > until) continue;
    views += r.views;
    reads += r.reads;
    seconds += r.seconds;
    websiteClicks += r.website_clicks;
    for (const s of SOURCE_LABELS) src[s.key] += Number(r[s.col]) || 0;
  }
  return {
    views,
    reads,
    websiteClicks,
    avgSeconds: views > 0 ? Math.round(seconds / views) : null,
    sources: SOURCE_LABELS.map((s) => ({ key: s.key, label: s.label, views: src[s.key] })).filter((s) => s.views > 0),
  };
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "–";
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m} min ${s} s`;
}

// Zuercher Kalendertag (YYYY-MM-DD) eines Zeitpunkts, wie article_stats_daily.day.
export function zurichDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Zurich" });
}

// Letzter Tag des Berichtszeitraums: Erscheinungstag + 29 (30 Kalendertage).
export function reportUntil(publishedAt: string): string {
  const day = zurichDate(new Date(publishedAt));
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + REPORT_AFTER_DAYS - 1);
  return d.toISOString().slice(0, 10);
}

// Ist der Bericht faellig? Erst wenn die 30 Tage ganz vorbei sind (der Tag
// nach dem letzten Berichtstag hat in Zuerich begonnen), und nicht mehr,
// wenn das zu lange her ist.
export function reportDue(publishedAt: string | null, now: Date): boolean {
  if (!publishedAt) return false;
  const until = reportUntil(publishedAt);
  const today = zurichDate(now);
  if (today <= until) return false;
  const late = new Date(`${until}T12:00:00Z`);
  late.setUTCDate(late.getUTCDate() + REPORT_LATEST_DAYS);
  return today <= late.toISOString().slice(0, 10);
}

export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString("de-CH")} ${n === 1 ? one : many}`;
}

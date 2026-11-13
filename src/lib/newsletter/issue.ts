// Newsletter-Ausgaben (PR 195, Entscheid Ali 12.11.2026: Entwurf + Freigabe).
// Rein, ohne DB und ohne "server-only": Admin-Client, Server Actions, Cron
// und Mail-Template teilen diese Typen und Regeln. Test:
// src/lib/newsletter/__tests__/issue.manual.ts.

export type IssueItem = {
  articleId: string;
  slug: string;
  title: string;
  teaser: string;
  category: string;
  coverUrl: string | null;
};

// Rubriken neben den Artikeln (Wunsch Ali 13.11.2026, PR 203), gespeichert in
// newsletter_issues.sections. Jede Rubrik ist im Entwurf editierbar und
// entfernbar; leere Rubriken erscheinen nicht in der Mail.
export type IssueNews = {
  newsId: string;
  title: string;
  why: string;          // «Warum wichtig», aus der Einordnung, editierbar
  source: string;       // Name der Quelle
  anchor: string;       // Sprungmarke auf /news (newsAnchor), leer = Seitenanfang
  einordnung: string;   // «Wirtschaft hoch · Dringlichkeit mittel», darf leer sein
};

export type IssueHype = {
  newsId: string;
  title: string;
  text: string;         // was die Aufregung ist und was davon bleibt
  source: string;
  anchor: string;
};

// Prompt der Woche bzw. Podcast-Tipp.
export type IssuePick = {
  id: string;
  slug: string;
  title: string;
  teaser: string;
  label: string;        // Prompt: Kategorie · Schwierigkeit; Podcast: Rubrik · Sprache
  coverUrl: string | null;
};

export type IssueSections = {
  news: IssueNews[];
  hype: IssueHype | null;
  prompt: IssuePick | null;
  podcast: IssuePick | null;
};

export const EMPTY_SECTIONS: IssueSections = { news: [], hype: null, prompt: null, podcast: null };

export type IssueStatus = "draft" | "sending" | "sent" | "discarded";

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  draft: "Entwurf",
  sending: "Versand läuft",
  sent: "Versendet",
  discarded: "Verworfen",
};

export const MAX_ITEMS = 8;
export const SUBJECT_MAX = 120;
export const INTRO_MAX = 1200;
export const TEASER_MAX = 400;
export const MAX_NEWS = 5;
export const NEWS_WHY_MAX = 300;
export const HYPE_TEXT_MAX = 500;
export const PICK_TEASER_MAX = 300;

// Ohne gesendete Ausgabe: Artikel der letzten 7 Tage.
export const FIRST_ISSUE_DAYS = 7;

export function isIssueStatus(v: unknown): v is IssueStatus {
  return v === "draft" || v === "sending" || v === "sent" || v === "discarded";
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

// items aus DB (jsonb) oder Client: nur gueltige Eintraege, ohne Dubletten,
// hoechstens MAX_ITEMS, Texte gekuerzt. Unbekannte Felder fallen weg.
export function sanitizeItems(raw: unknown): IssueItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: IssueItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const articleId = str(o.articleId, 64);
    const slug = str(o.slug, 200);
    const title = str(o.title, 300);
    if (!articleId || !slug || !title || seen.has(articleId)) continue;
    seen.add(articleId);
    const cover = str(o.coverUrl, 1000);
    out.push({
      articleId,
      slug,
      title,
      teaser: str(o.teaser, TEASER_MAX),
      category: str(o.category, 80),
      coverUrl: /^https:\/\//.test(cover) ? cover : null,
    });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

function anchorOf(v: unknown): string {
  const a = str(v, 160).toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a) ? a : "";
}

function httpsOrNull(v: unknown): string | null {
  const u = str(v, 1000);
  return /^https:\/\//.test(u) ? u : null;
}

function pickOf(raw: unknown): IssuePick | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = str(o.id, 64);
  const slug = str(o.slug, 200);
  const title = str(o.title, 300);
  if (!id || !slug || !title) return null;
  return { id, slug, title, teaser: str(o.teaser, PICK_TEASER_MAX), label: str(o.label, 80), coverUrl: httpsOrNull(o.coverUrl) };
}

// sections aus DB (jsonb) oder Client, wie sanitizeItems: nur gueltige
// Eintraege, News ohne Dubletten und hoechstens MAX_NEWS, Texte gekuerzt.
// Alte Ausgaben ohne Rubriken ('{}') ergeben EMPTY_SECTIONS.
export function sanitizeSections(raw: unknown): IssueSections {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...EMPTY_SECTIONS, news: [] };
  const o = raw as Record<string, unknown>;
  const news: IssueNews[] = [];
  const seen = new Set<string>();
  if (Array.isArray(o.news)) {
    for (const r of o.news) {
      if (!r || typeof r !== "object") continue;
      const n = r as Record<string, unknown>;
      const newsId = str(n.newsId, 64);
      const title = str(n.title, 300);
      if (!newsId || !title || seen.has(newsId)) continue;
      seen.add(newsId);
      news.push({
        newsId,
        title,
        why: str(n.why, NEWS_WHY_MAX),
        source: str(n.source, 120),
        anchor: anchorOf(n.anchor),
        einordnung: str(n.einordnung, 160),
      });
      if (news.length >= MAX_NEWS) break;
    }
  }
  let hype: IssueHype | null = null;
  if (o.hype && typeof o.hype === "object") {
    const h = o.hype as Record<string, unknown>;
    const newsId = str(h.newsId, 64);
    const title = str(h.title, 300);
    if (newsId && title) hype = { newsId, title, text: str(h.text, HYPE_TEXT_MAX), source: str(h.source, 120), anchor: anchorOf(h.anchor) };
  }
  return { news, hype, prompt: pickOf(o.prompt), podcast: pickOf(o.podcast) };
}

export function hasSections(s: IssueSections): boolean {
  return s.news.length > 0 || s.hype !== null || s.prompt !== null || s.podcast !== null;
}

export type IssueValidation = { ok: true } | { ok: false; error: string };

// Versandpruefung: Betreff, mindestens ein Artikel oder eine News (eine
// Ausgabe nur mit Prompt und Podcast waere zu duenn), und jeder Eintrag mit Text.
export function validateForSend(issue: { subject: string; items: IssueItem[]; sections?: IssueSections }): IssueValidation {
  const s = issue.sections ?? EMPTY_SECTIONS;
  if (issue.subject.trim() === "") return { ok: false, error: "Betreff fehlt." };
  if (issue.items.length === 0 && s.news.length === 0) return { ok: false, error: "Mindestens ein Artikel oder eine News nötig." };
  const empty = issue.items.find((i) => i.teaser.trim() === "");
  if (empty) return { ok: false, error: `Kurztext fehlt bei «${empty.title}».` };
  const noWhy = s.news.find((n) => n.why.trim() === "");
  if (noWhy) return { ok: false, error: `«Warum wichtig» fehlt bei «${noWhy.title}».` };
  if (s.hype && s.hype.text.trim() === "") return { ok: false, error: "Text zum Hype-Check fehlt." };
  if (s.prompt && s.prompt.teaser.trim() === "") return { ok: false, error: "Kurztext zum Prompt der Woche fehlt." };
  if (s.podcast && s.podcast.teaser.trim() === "") return { ok: false, error: "Kurztext zum Podcast-Tipp fehlt." };
  return { ok: true };
}

// Zeitraum des naechsten Entwurfs: ab dem Ende der letzten gesendeten
// Ausgabe, sonst die letzten 7 Tage, jeweils bis jetzt.
export function nextPeriod(lastSentPeriodTo: string | null, now: Date): { from: Date; to: Date } {
  const fallback = new Date(now.getTime() - FIRST_ISSUE_DAYS * 86_400_000);
  const last = lastSentPeriodTo ? new Date(lastSentPeriodTo) : null;
  const from = last && !Number.isNaN(last.getTime()) && last.getTime() < now.getTime() ? last : fallback;
  return { from, to: now };
}

// Links im Newsletter mit UTM (GA4): Quelle newsletter, Medium email,
// Kampagne = Datum der Ausgabe.
export function issueCampaign(date: Date): string {
  const d = date.toLocaleDateString("en-CA", { timeZone: "Europe/Zurich" });
  return `newsletter-${d}`;
}

export function trackedUrl(siteUrl: string, path: string, campaign: string, hash = ""): string {
  const q = new URLSearchParams({ utm_source: "newsletter", utm_medium: "email", utm_campaign: campaign });
  return `${siteUrl}${path}?${q.toString()}${hash ? `#${hash}` : ""}`;
}

export function trackedArticleUrl(siteUrl: string, slug: string, campaign: string): string {
  return trackedUrl(siteUrl, `/artikel/${encodeURIComponent(slug)}`, campaign);
}

// News verlinken auf /news (mit Einordnung und Kehrseite), nicht direkt auf
// die Quelle; dort steht der Link zur Quelle.
export function trackedNewsUrl(siteUrl: string, anchor: string, campaign: string): string {
  return trackedUrl(siteUrl, "/news", campaign, anchor);
}

// Platzhalter fuer den Abmeldelink: Das Mail-HTML wird einmal gerendert und
// pro Empfaenger ersetzt (Token aus newsletter_subscribers.confirmation_token).
export const UNSUBSCRIBE_PLACEHOLDER = "__DA_UNSUBSCRIBE_TOKEN__";

export function personalize(html: string, token: string): string {
  return html.split(UNSUBSCRIBE_PLACEHOLDER).join(encodeURIComponent(token));
}

export function formatIssueDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Zurich" });
}

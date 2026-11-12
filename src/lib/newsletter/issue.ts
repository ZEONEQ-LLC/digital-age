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

export type IssueValidation = { ok: true } | { ok: false; error: string };

export function validateForSend(issue: { subject: string; items: IssueItem[] }): IssueValidation {
  if (issue.subject.trim() === "") return { ok: false, error: "Betreff fehlt." };
  if (issue.items.length === 0) return { ok: false, error: "Mindestens ein Artikel nötig." };
  const empty = issue.items.find((i) => i.teaser.trim() === "");
  if (empty) return { ok: false, error: `Kurztext fehlt bei «${empty.title}».` };
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

export function trackedArticleUrl(siteUrl: string, slug: string, campaign: string): string {
  const q = new URLSearchParams({ utm_source: "newsletter", utm_medium: "email", utm_campaign: campaign });
  return `${siteUrl}/artikel/${encodeURIComponent(slug)}?${q.toString()}`;
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

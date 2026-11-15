// Showcase S3a: Fragebogen fuer Unternehmen (rein, testbar). Fragen nach
// Anhang B der Uebergabe (Du-Form). Server Actions in submitActions.ts und
// adminActions.ts, Formular in src/components/showcase/ShowcaseQuestionnaire.tsx.
import { EMPLOYEE_RANGES, FUNDING_STAGES, INDUSTRIES, SWISS_STATUSES } from "@/lib/mappers/startupMappers";
import { normalizeCity } from "@/lib/startupCity";

export const SHOWCASE_TOKEN_RE = /^[0-9a-f]{48}$/;
export const SHOWCASE_INVITE_PATH = "/showcase/mitmachen";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isEmail(v: string): boolean {
  return v.length <= 255 && EMAIL_RE.test(v);
}

// ── Fragen ────────────────────────────────────────────────────────────────

export const ANSWER_KEYS = ["problem", "solution", "usecase", "learnings", "trust", "outlook"] as const;
export type AnswerKey = (typeof ANSWER_KEYS)[number];

export const ANSWER_MIN = 80;
export const ANSWER_MAX = 2500;

export const QUESTIONS: readonly { key: AnswerKey; label: string; hint: string }[] = [
  { key: "problem", label: "Welches Problem löst ihr, und für wen?", hint: "Drei bis fünf Sätze." },
  { key: "solution", label: "Wie funktioniert eure Lösung, einfach erklärt? Wo genau steckt die KI?", hint: "So, dass es jemand ausserhalb eurer Branche versteht." },
  { key: "usecase", label: "Ein konkreter Anwendungsfall", hint: "Bei wem (Name nur mit Erlaubnis, sonst die Branche), was war vorher, was ist jetzt anders? Gern mit Zahlen." },
  { key: "learnings", label: "Was habt ihr beim Aufbau gelernt?", hint: "Was würdet ihr heute anders machen?" },
  { key: "trust", label: "Vertrauen", hint: "Wie geht ihr mit Daten, Hosting, Zuverlässigkeit und Compliance um?" },
  { key: "outlook", label: "Was kommt in den nächsten 12 Monaten?", hint: "" },
];

export const QUOTE_MAX = 400;
export const QUOTE_BY_MAX = 120;

// Eigener Text statt der Fragen. Die Uebergabe nennt 600 bis 1200 Woerter;
// die Pruefung laesst etwas Spiel, damit niemand an 590 Woertern scheitert.
export const OWN_TEXT_TARGET = "600 bis 1200 Wörter";
export const OWN_TEXT_MIN_WORDS = 500;
export const OWN_TEXT_MAX_WORDS = 1400;

export function countWords(text: string): number {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

export const MAX_LINKS = 2;
export function isHttpUrl(v: string): boolean {
  if (v.length > 500) return false;
  try {
    const u = new URL(v);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

// ── Profildaten ───────────────────────────────────────────────────────────

export type ProfileValues = {
  name: string;
  tagline: string;
  city: string;
  industry: string;
  founded_year: number;
  employee_range: string;
  swiss_status: string;
  funding_stage: string | null;
  // Letzte Runde als Monat «JJJJ-MM», leer = keine Angabe.
  last_round_month: string;
  open_to_investment: boolean;
};

export const PROFILE_LABELS: Record<keyof ProfileValues, string> = {
  name: "Name",
  tagline: "Tagline",
  city: "Stadt",
  industry: "Branche",
  founded_year: "Gründungsjahr",
  employee_range: "Grösse",
  swiss_status: "Status",
  funding_stage: "Funding-Stage",
  last_round_month: "Letzte Runde",
  open_to_investment: "Offen für Investoren",
};

// Monat aus einem Datum der DB («2025-07-01» → «2025-07»).
export function monthOf(date: string | null | undefined): string {
  return date && /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : "";
}

export function profileFromStartup(s: {
  name: string;
  tagline: string;
  city: string;
  industry: string;
  founded_year: number;
  employee_range: string;
  swiss_status: string;
  funding_stage: string | null;
  last_round_at: string | null;
  open_to_investment: boolean;
}): ProfileValues {
  return {
    name: s.name,
    tagline: s.tagline,
    city: s.city,
    industry: s.industry,
    founded_year: s.founded_year,
    employee_range: s.employee_range,
    swiss_status: s.swiss_status,
    funding_stage: s.funding_stage,
    last_round_month: monthOf(s.last_round_at),
    open_to_investment: s.open_to_investment,
  };
}

type ProfileCheck = { values: ProfileValues; errors: Partial<Record<keyof ProfileValues, string>> };

// Prueft und normalisiert die Profilangaben aus dem Formular.
export function checkProfile(raw: Partial<Record<keyof ProfileValues, unknown>>): ProfileCheck {
  const errors: ProfileCheck["errors"] = {};
  const str = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

  const name = str(raw.name);
  if (name.length < 1 || name.length > 80) errors.name = "Bitte den Namen angeben (höchstens 80 Zeichen).";
  const tagline = str(raw.tagline);
  if (tagline.length < 1 || tagline.length > 100) errors.tagline = "Bitte eine Tagline angeben (höchstens 100 Zeichen).";
  const city = normalizeCity(str(raw.city));
  if (city.length < 1 || city.length > 80) errors.city = "Bitte die Stadt angeben.";
  const industry = str(raw.industry);
  if (!INDUSTRIES.includes(industry)) errors.industry = "Bitte eine Branche wählen.";
  const founded_year = typeof raw.founded_year === "number" ? raw.founded_year : parseInt(str(raw.founded_year), 10);
  if (!Number.isInteger(founded_year) || founded_year < 1990 || founded_year > 2030) {
    errors.founded_year = "Bitte ein Gründungsjahr zwischen 1990 und 2030 angeben.";
  }
  const employee_range = str(raw.employee_range);
  if (!EMPLOYEE_RANGES.some((e) => e.code === employee_range)) errors.employee_range = "Bitte die Grösse wählen.";
  const swiss_status = str(raw.swiss_status);
  if (!SWISS_STATUSES.some((s) => s.code === swiss_status)) errors.swiss_status = "Bitte den Status wählen.";
  const fs = str(raw.funding_stage);
  const funding_stage = fs === "" ? null : fs;
  if (funding_stage !== null && !FUNDING_STAGES.some((f) => f.code === funding_stage)) {
    errors.funding_stage = "Bitte eine Funding-Stage wählen oder leer lassen.";
  }
  const last_round_month = str(raw.last_round_month);
  if (last_round_month !== "" && !/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(last_round_month)) {
    errors.last_round_month = "Bitte Monat und Jahr angeben oder leer lassen.";
  }
  const open_to_investment = raw.open_to_investment === true;

  return {
    values: { name, tagline, city, industry, founded_year, employee_range, swiss_status, funding_stage, last_round_month, open_to_investment },
    errors,
  };
}

// Nur die Felder, die das Unternehmen geaendert hat. Die Redaktion uebernimmt
// sie als Vorschlag.
export function diffProfile(current: ProfileValues, submitted: ProfileValues): Partial<ProfileValues> {
  const out: Partial<ProfileValues> = {};
  for (const key of Object.keys(PROFILE_LABELS) as (keyof ProfileValues)[]) {
    if (current[key] !== submitted[key]) (out as Record<string, unknown>)[key] = submitted[key];
  }
  return out;
}

// Vorschlaege aus der DB (jsonb) nochmals pruefen und in ein Update fuer
// ai_startups uebersetzen. Unbekannte Schluessel und ungueltige Werte fallen
// weg; `rejected` nennt sie.
export function profilePatchFromChanges(
  current: ProfileValues,
  changes: unknown,
): { patch: Record<string, string | number | boolean | null>; rejected: string[] } {
  const patch: Record<string, string | number | boolean | null> = {};
  const rejected: string[] = [];
  if (typeof changes !== "object" || changes === null || Array.isArray(changes)) return { patch, rejected };
  const merged = { ...current, ...(changes as Record<string, unknown>) };
  const { values, errors } = checkProfile(merged);
  for (const key of Object.keys(changes as Record<string, unknown>)) {
    if (!(key in PROFILE_LABELS)) { rejected.push(key); continue; }
    const k = key as keyof ProfileValues;
    if (errors[k]) { rejected.push(key); continue; }
    if (k === "last_round_month") patch.last_round_at = values.last_round_month === "" ? null : `${values.last_round_month}-01`;
    else patch[k] = values[k];
  }
  return { patch, rejected };
}

// Anzeige eines Profilwerts (Formular-Hinweis, Admin).
export function profileValueLabel(key: keyof ProfileValues, value: unknown): string {
  if (value === null || value === undefined || value === "") return "keine Angabe";
  if (key === "open_to_investment") return value === true ? "ja" : "nein";
  if (key === "employee_range") return EMPLOYEE_RANGES.find((e) => e.code === value)?.label ?? String(value);
  if (key === "swiss_status") return SWISS_STATUSES.find((s) => s.code === value)?.label ?? String(value);
  if (key === "funding_stage") return FUNDING_STAGES.find((f) => f.code === value)?.label ?? String(value);
  if (key === "last_round_month" && typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) {
    return `${value.slice(5, 7)}.${value.slice(0, 4)}`;
  }
  return String(value);
}

// ── Einreichung ───────────────────────────────────────────────────────────

export type SubmissionInput = {
  contactName: string;
  contactRole: string;
  contactEmail: string;
  mode: "questions" | "own_text";
  answers: Partial<Record<AnswerKey, string>>;
  quote: string;
  quoteBy: string;
  ownText: string;
  links: string[];
  logoPath: string | null;
  imagePath: string | null;
  profile: Partial<Record<keyof ProfileValues, unknown>>;
  consentData: boolean;
  consentLabelling: boolean;
  consentMediaRights: boolean;
  contactForwarding: boolean;
  contactForwardingEmail: string;
  // Bot-Signale: verstecktes Feld und Zeitpunkt des Oeffnens.
  website?: string;
  openedAt?: number;
};

export type SubmissionValue = {
  contact_name: string;
  contact_role: string;
  contact_email: string;
  answers: Record<string, string>;
  own_text: string | null;
  links: string[];
  logo_path: string | null;
  image_path: string | null;
  profile: ProfileValues;
  consent_contact_email: string | null;
  consent_media_rights: boolean;
};

export type SubmissionCheck =
  | { ok: true; value: SubmissionValue }
  | { ok: false; fieldErrors: Record<string, string> };

const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "");

export function validateSubmission(input: SubmissionInput): SubmissionCheck {
  const e: Record<string, string> = {};

  const contact_name = clean(input.contactName).replace(/\s+/g, " ");
  if (contact_name.length < 2 || contact_name.length > 120) e.contactName = "Bitte deinen Namen angeben.";
  const contact_role = clean(input.contactRole).replace(/\s+/g, " ");
  if (contact_role.length < 2 || contact_role.length > 120) e.contactRole = "Bitte deine Funktion angeben.";
  const contact_email = clean(input.contactEmail).toLowerCase();
  if (!isEmail(contact_email)) e.contactEmail = "Bitte eine gültige E-Mail-Adresse angeben.";

  const answers: Record<string, string> = {};
  let own_text: string | null = null;
  if (input.mode === "own_text") {
    const text = clean(input.ownText);
    const words = countWords(text);
    if (words < OWN_TEXT_MIN_WORDS) e.ownText = `Der Text ist mit ${words} Wörtern zu kurz. Ziel sind ${OWN_TEXT_TARGET}.`;
    else if (words > OWN_TEXT_MAX_WORDS) e.ownText = `Der Text ist mit ${words} Wörtern zu lang. Ziel sind ${OWN_TEXT_TARGET}.`;
    else own_text = text;
  } else {
    for (const q of QUESTIONS) {
      const a = clean(input.answers?.[q.key]);
      if (a.length < ANSWER_MIN) e[`answer_${q.key}`] = `Bitte etwas ausführlicher antworten (mindestens ${ANSWER_MIN} Zeichen).`;
      else if (a.length > ANSWER_MAX) e[`answer_${q.key}`] = `Bitte kürzer fassen (höchstens ${ANSWER_MAX} Zeichen).`;
      else answers[q.key] = a;
    }
  }
  // Zitat: freiwillig, aber nie ohne Namen.
  const quote = clean(input.quote);
  const quoteBy = clean(input.quoteBy).replace(/\s+/g, " ");
  if (quote.length > QUOTE_MAX) e.quote = `Das Zitat ist zu lang (höchstens ${QUOTE_MAX} Zeichen).`;
  if (quote !== "" && (quoteBy.length < 2 || quoteBy.length > QUOTE_BY_MAX)) e.quoteBy = "Bitte Name und Funktion zum Zitat angeben.";
  if (quote !== "" && !e.quote && !e.quoteBy) {
    answers.quote = quote;
    answers.quote_by = quoteBy;
  }

  const links: string[] = [];
  (Array.isArray(input.links) ? input.links : []).forEach((raw, i) => {
    const l = clean(raw);
    if (l === "") return;
    if (!isHttpUrl(l)) e[`link_${i}`] = "Bitte eine vollständige Adresse angeben (https://…).";
    else if (!links.includes(l)) links.push(l);
  });
  if (links.length > MAX_LINKS) e.link_0 = `Höchstens ${MAX_LINKS} Links.`;

  const { values: profile, errors: profileErrors } = checkProfile(input.profile ?? {});
  for (const [k, msg] of Object.entries(profileErrors)) e[`profile_${k}`] = msg;

  if (input.consentData !== true) e.consentData = "Bitte bestätige die Profildaten.";
  if (input.consentLabelling !== true) e.consentLabelling = "Bitte bestätige, dass du die Kennzeichnung zur Kenntnis genommen hast.";
  const hasMedia = Boolean(input.logoPath || input.imagePath);
  if (hasMedia && input.consentMediaRights !== true) e.consentMediaRights = "Bitte bestätige die Rechte an Logo und Bild.";

  let consent_contact_email: string | null = null;
  const fwd = clean(input.contactForwardingEmail).toLowerCase();
  if (input.contactForwarding === true) {
    if (!isEmail(fwd)) e.contactForwardingEmail = "Bitte die Adresse für Kontaktanfragen angeben.";
    else consent_contact_email = fwd;
  } else if (fwd !== "") {
    e.contactForwardingEmail = "Bitte das Häkchen setzen oder die Adresse leeren.";
  }

  if (Object.keys(e).length > 0) return { ok: false, fieldErrors: e };
  return {
    ok: true,
    value: {
      contact_name,
      contact_role,
      contact_email,
      answers,
      own_text,
      links,
      logo_path: input.logoPath || null,
      image_path: input.imagePath || null,
      profile,
      consent_contact_email,
      consent_media_rights: hasMedia && input.consentMediaRights === true,
    },
  };
}

// Unter dieser Ausfuellzeit gilt der Fragebogen als Bot (Sekunden).
export const MIN_FILL_SECONDS = 20;
export function looksLikeBot(input: Pick<SubmissionInput, "website" | "openedAt">, now: number): boolean {
  if (input.website && input.website.trim() !== "") return true;
  if (typeof input.openedAt === "number" && Number.isFinite(input.openedAt)) {
    return now - input.openedAt < MIN_FILL_SECONDS * 1000;
  }
  return false;
}

// ── Einladung ─────────────────────────────────────────────────────────────

export type InviteState = "open" | "expired" | "submitted" | "withdrawn";

export function inviteState(row: { status: string; expires_at: string }, now: number): InviteState {
  if (row.status === "submitted") return "submitted";
  if (row.status === "withdrawn") return "withdrawn";
  return new Date(row.expires_at).getTime() <= now ? "expired" : "open";
}

export function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

export type InviteInput = { name: string; email: string; replyBy: string; sendMail: boolean };
export type InviteCheck =
  | { ok: true; value: { invitee_name: string | null; invitee_email: string | null; reply_by: string | null; sendMail: boolean } }
  | { ok: false; message: string };

export function validateInvite(input: InviteInput, today: string): InviteCheck {
  const name = clean(input.name).replace(/\s+/g, " ");
  const email = clean(input.email).toLowerCase();
  const replyBy = clean(input.replyBy);
  if (name.length > 120) return { ok: false, message: "Der Name ist zu lang." };
  if (email !== "" && !isEmail(email)) return { ok: false, message: "Die E-Mail-Adresse wirkt ungültig." };
  if (replyBy !== "" && (!/^\d{4}-\d{2}-\d{2}$/.test(replyBy) || replyBy < today)) {
    return { ok: false, message: "«Antwort bis» muss ein Datum ab heute sein." };
  }
  if (input.sendMail) {
    if (email === "") return { ok: false, message: "Für den Versand braucht es eine E-Mail-Adresse." };
    if (name === "") return { ok: false, message: "Für die Anrede in der Mail braucht es einen Namen." };
    if (replyBy === "") return { ok: false, message: "Für die Mail braucht es ein Datum «Antwort bis»." };
  }
  return { ok: true, value: { invitee_name: name || null, invitee_email: email || null, reply_by: replyBy || null, sendMail: input.sendMail } };
}

// ── Dateien ───────────────────────────────────────────────────────────────

export const MEDIA_BUCKET = "startup-media";
export const MEDIA_MAX_BYTES = 900 * 1024;
export type MediaKind = "logo" | "bild";

// Dateityp aus den ersten Bytes (nicht aus dem Namen oder dem gemeldeten Typ).
export function sniffImageType(bytes: Uint8Array): "image/png" | "image/webp" | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "image/png";
  }
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  return null;
}

export function mediaPath(startupId: string, kind: MediaKind, id: string, type: "image/png" | "image/webp"): string {
  return `${startupId}/${kind}-${id}.${type === "image/png" ? "png" : "webp"}`;
}

// Gehoert ein Pfad zu diesem Unternehmen und dieser Art? Schuetzt davor, dass
// eine Einreichung auf Dateien eines anderen Unternehmens zeigt.
export function mediaPathBelongsTo(path: string | null, startupId: string, kind: MediaKind): boolean {
  if (!path) return true;
  return new RegExp(`^${startupId}/${kind}-[0-9a-f]{8,32}\\.(png|webp)$`).test(path);
}

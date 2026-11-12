// Startup «Get in touch»: Anliegen und Validierung (rein, testbar). Server-
// Action in actions.ts, Formular in src/components/StartupContactForm.tsx.

export const CONTACT_PURPOSES = [
  { code: "investment", label: "Investition" },
  { code: "customer", label: "Kunde / Auftrag" },
  { code: "partnership", label: "Partnerschaft" },
  { code: "press", label: "Presse" },
  { code: "other", label: "Anderes" },
] as const;

export type ContactPurpose = (typeof CONTACT_PURPOSES)[number]["code"];

export function isContactPurpose(v: unknown): v is ContactPurpose {
  return typeof v === "string" && CONTACT_PURPOSES.some((p) => p.code === v);
}

export function purposeLabel(code: ContactPurpose): string {
  return CONTACT_PURPOSES.find((p) => p.code === code)?.label ?? code;
}

export const MESSAGE_MIN = 20;
export const MESSAGE_MAX = 2000;
// Unter dieser Ausfuellzeit gilt das Formular als Bot (Sekunden).
export const MIN_FILL_SECONDS = 3;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(v: string): boolean {
  return v.length <= 255 && EMAIL_RE.test(v);
}

export type StartupContactInput = {
  startupSlug: string;
  name: string;
  email: string;
  organization?: string;
  purpose: string;
  message: string;
  consent: boolean;
  // Spam-Schutz: verstecktes Feld (muss leer bleiben) und Zeitpunkt, zu dem
  // das Formular geoeffnet wurde (ms seit Epoch, vom Client).
  website?: string;
  openedAt?: number;
};

export type CleanContact = {
  startupSlug: string;
  name: string;
  email: string;
  organization: string | null;
  purpose: ContactPurpose;
  message: string;
};

export function validateContact(input: StartupContactInput): { ok: true; value: CleanContact } | { ok: false; fieldErrors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = (input.name ?? "").trim();
  if (name.length < 2 || name.length > 120) errors.name = "Bitte deinen Namen angeben.";
  const email = (input.email ?? "").trim().toLowerCase();
  if (!isEmail(email)) errors.email = "Bitte eine gültige E-Mail-Adresse angeben.";
  const organization = (input.organization ?? "").trim();
  if (organization.length > 200) errors.organization = "Organisation zu lang (max. 200 Zeichen).";
  if (!isContactPurpose(input.purpose)) errors.purpose = "Bitte ein Anliegen wählen.";
  const message = (input.message ?? "").trim();
  if (message.length < MESSAGE_MIN) errors.message = `Mindestens ${MESSAGE_MIN} Zeichen.`;
  else if (message.length > MESSAGE_MAX) errors.message = `Maximal ${MESSAGE_MAX} Zeichen.`;
  if (input.consent !== true) errors.consent = "Bitte bestätigen, dass wir deine Angaben weiterleiten dürfen.";
  const slug = (input.startupSlug ?? "").trim();
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) errors.startupSlug = "Unbekanntes Startup.";
  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    value: { startupSlug: slug, name, email, organization: organization || null, purpose: input.purpose as ContactPurpose, message },
  };
}

// Bot-Signale: Honeypot gefuellt oder Formular zu schnell abgeschickt.
export function looksLikeBot(input: Pick<StartupContactInput, "website" | "openedAt">, now: number): boolean {
  if (input.website && input.website.trim() !== "") return true;
  if (typeof input.openedAt === "number" && Number.isFinite(input.openedAt)) {
    return now - input.openedAt < MIN_FILL_SECONDS * 1000;
  }
  return false;
}

// Einreichformular und Admin: Kontaktadresse nur mit Einverstaendnis.
export function validateContactConsent(email: string, consent: boolean): { email: string | null; error: string | null } {
  const e = email.trim().toLowerCase();
  if (e === "") return { email: null, error: consent ? "Bitte eine Kontakt-E-Mail angeben oder das Häkchen entfernen." : null };
  if (!isEmail(e)) return { email: null, error: "Kontakt-E-Mail wirkt ungültig." };
  if (!consent) return { email: null, error: "Ohne Einverständnis zur Weiterleitung bitte keine Kontakt-E-Mail angeben." };
  return { email: e, error: null };
}

// Vertrauensangaben im Swiss-AI-Verzeichnis (S1, 14.11.2026). Rein; Test:
// src/lib/__tests__/startupTrust.manual.ts.

export const RULES_PATH = "/swiss-ai/regeln";
export const AFFILIATION_LABEL = "Mit dem Herausgeber verbunden";
// Ein Begriff statt «Investor-Ready» (Karte) und «Offen für Investoren»
// (Profil): Beides war dasselbe Feld open_to_investment.
export const INVESTOR_LABEL = "Offen für Investoren";

const DAY = 86_400_000;
export const ROUND_STALE_MONTHS = 18;
export const VERIFIED_STALE_MONTHS = 12;

function monthsAgo(iso: string, now: Date): number | null {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : (now.getTime() - t) / (DAY * 30.44);
}

// Hinweis fuer die Redaktion: Ist «Offen für Investoren» noch belastbar?
// null = kein Hinweis. Kein automatisches Ausblenden (Entscheid offen).
export function investorInfoStale(
  s: { open_to_investment: boolean; last_round_at: string | null; verified_at: string | null },
  now: Date,
): string | null {
  if (!s.open_to_investment) return null;
  const verified = s.verified_at ? monthsAgo(s.verified_at, now) : null;
  if (verified === null) return "Angaben nie bestätigt";
  if (verified > VERIFIED_STALE_MONTHS) return `Angaben vor über ${VERIFIED_STALE_MONTHS} Monaten bestätigt`;
  const round = s.last_round_at ? monthsAgo(s.last_round_at, now) : null;
  if (round !== null && round > ROUND_STALE_MONTHS) return `Letzte Runde vor über ${ROUND_STALE_MONTHS} Monaten`;
  return null;
}

export function formatVerifiedDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" });
}

// Zeile ueber der Liste: eine Zahl fuer Liste, Filter und Meta-Beschreibung.
export function directoryCountLabel(total: number, inSpotlight: number): string {
  const base = `${total} Unternehmen`;
  return inSpotlight > 0 ? `${base}, davon ${inSpotlight} im Spotlight` : base;
}

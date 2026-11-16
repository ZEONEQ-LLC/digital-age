import "server-only";
import { signAdClickWith, verifyAdClickWith, type AdClickPayload } from "@/lib/newsletter/adTokenCore";

// Signierter Zaehl-Link fuer Anzeigen im Newsletter (PR 214). Der Link in der
// Mail nennt nur Ausgabe und Kampagne, signiert mit einem aus
// SUPABASE_SERVICE_ROLE_KEY abgeleiteten Schluessel (Muster deliveryToken.ts).
// Das Ziel steht nicht im Link: Die Route liest es aus der versendeten Ausgabe.
// Kein Ablauf: Eine Mail wird auch nach Wochen noch geoeffnet. Pro
// Empfaenger:in gibt es keine Kennung, alle bekommen denselben Link.
// Fehlt der Service-Key, liefert sign() null und die Mail verlinkt direkt.
export type { AdClickPayload };

function secret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export function signAdClick(payload: AdClickPayload): string | null {
  return signAdClickWith(secret(), payload);
}

export function verifyAdClick(token: string | null | undefined): AdClickPayload | null {
  return verifyAdClickWith(secret(), token);
}

// Pfad der Weiterleitung. Neutral benannt wie die uebrigen Modul-Routen.
export const AD_CLICK_PATH = "/api/module/weiter";

export function adClickUrl(siteUrl: string, issueId: string, campaignId: string): string | null {
  const k = signAdClick({ i: issueId, c: campaignId });
  return k ? `${siteUrl}${AD_CLICK_PATH}?k=${encodeURIComponent(k)}` : null;
}

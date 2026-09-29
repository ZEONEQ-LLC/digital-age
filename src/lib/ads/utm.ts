// UTM-Parameter fuer Kundenanzeigen. Rein und client-sicher: kein
// Server-Import. Gespeichert bleibt die saubere Ziel-URL; die Parameter
// entstehen erst in der Auslieferungsroute (api/module/[code]), wo
// Kampagne, Platzierung und Geraet bekannt sind.
//
// Konvention (GA4 ist case-sensitiv):
//   utm_source   = digital-age
//   utm_medium   = banner            (GA4-Kanal «Display»)
//   utm_campaign = ad_campaigns.utm_campaign (Kennung, im Admin gesetzt)
//   utm_content  = <placement>-<variant>, Unterstriche -> Bindestriche
//   kein utm_term, kein utm_id.
import { slugifyTag } from "@/lib/tagSlug";

export const UTM_SOURCE = "digital-age";
export const UTM_MEDIUM = "banner";
export const UTM_CAMPAIGN_MAX = 80;
// Gleiches Muster wie der CHECK in der Migration 20260929120000.
export const UTM_CAMPAIGN_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidUtmCampaign(value: string): boolean {
  return value.length <= UTM_CAMPAIGN_MAX && UTM_CAMPAIGN_RE.test(value);
}

// Kennungs-Vorschlag aus dem Kampagnennamen (lowercase, ae/oe/ue, Bindestriche, max 80).
export function slugCampaign(name: string): string {
  return slugifyTag(name);
}

// z. B. home_billboard + desktop -> home-billboard-desktop
export function utmContentFor(placementCode: string, variant: string): string {
  return `${placementCode}-${variant}`.replace(/_/g, "-");
}

function parseAbsolute(url: string): URL | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null; // relativ (House, /newsletter): bleibt unveraendert
  }
  return u.protocol === "http:" || u.protocol === "https:" ? u : null;
}

// Traegt die Ziel-URL schon einen utm_-Parameter, trackt der Kunde selbst.
export function hasOwnUtmParams(url: string): boolean {
  const u = parseAbsolute(url);
  if (!u) return false;
  for (const key of u.searchParams.keys()) {
    if (key.toLowerCase().startsWith("utm_")) return true;
  }
  return false;
}

export type TrackedUrlOptions = { campaign: string; placementCode: string; variant: string };

// Haengt die vier Parameter an. Bestehende Query bleibt wortwoertlich stehen
// (kein erneutes Encodieren), #Fragment bleibt am Ende.
export function buildTrackedUrl(targetUrl: string, opts: TrackedUrlOptions): string {
  const u = parseAbsolute(targetUrl);
  if (!u) return targetUrl;
  if (hasOwnUtmParams(targetUrl)) return targetUrl;
  const params = new URLSearchParams({
    utm_source: UTM_SOURCE,
    utm_medium: UTM_MEDIUM,
    utm_campaign: opts.campaign,
    utm_content: utmContentFor(opts.placementCode, opts.variant),
  });
  const sep = u.search ? "&" : "?";
  return `${u.origin}${u.pathname}${u.search}${sep}${params.toString()}${u.hash}`;
}

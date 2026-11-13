import { slugFromTitle } from "@/lib/articleSlug";

// Lesbare Sprungmarke einer Meldung auf /news, z. B.
// «spacex-und-tesla-verhandeln-angeblich-ueber-fusion» (Wunsch Ali
// 13.11.2026, vorher «n-<uuid>»). Nur aus dem Titel, damit Startseite und
// /news dieselbe Marke bilden; doppelte Titel auf einer Seite haengt
// newsAnchors() an.
export function newsAnchor(item: { id: string; title: string }): string {
  return slugFromTitle(item.title) || `n-${item.id}`;
}

// Marken fuer eine ganze Liste: Kommt ein Titel doppelt vor, bekommt die
// spaetere Meldung die ersten Zeichen ihrer ID angehaengt (eindeutige IDs im HTML).
export function newsAnchors(items: { id: string; title: string }[]): Map<string, string> {
  const used = new Set<string>();
  const out = new Map<string, string>();
  for (const it of items) {
    let a = newsAnchor(it);
    if (used.has(a)) a = `${a}-${it.id.slice(0, 6)}`;
    used.add(a);
    out.set(it.id, a);
  }
  return out;
}

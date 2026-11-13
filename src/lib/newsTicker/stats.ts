// Refresh-Statistik des News-Tickers (news_ticker_config.last_refresh_stats).
// Reines Modul ohne "server-only": Admin-Seite, Client-Komponente und Tests
// nutzen es gemeinsam.

export type RefreshError = {
  source_id: string;
  source_name: string;
  message: string;
  // Wie oft dieselbe Meldung bei dieser Quelle vorkam (fehlt = 1). Gleiche
  // Fehler werden zusammengefasst, damit 20 Items nicht 20 Zeilen ergeben.
  count?: number;
};

export type RefreshStats = {
  sources_polled: number;
  items_fetched: number;
  items_generated: number;
  items_skipped_dedup: number;
  // Vom Modell als unpassend aussortiert ({"skip": true}).
  items_skipped_generation: number;
  // Kein brauchbares Ergebnis (KI-Fehler, Antwort im falschen Format). Seit
  // PR 191; aeltere Laeufe in last_refresh_stats haben das Feld nicht.
  items_failed?: number;
  // Einordnung nachgetragen bzw. gescheitert (seit PR 199).
  items_assessed?: number;
  assess_failed?: number;
  errors: RefreshError[];
  // Wenn true, wurde der Run wegen `news_ticker_config.is_paused = true`
  // sofort abgebrochen — alle Zähler bleiben 0.
  paused?: boolean;
};

export function emptyRefreshStats(): RefreshStats {
  return {
    sources_polled: 0,
    items_fetched: 0,
    items_generated: 0,
    items_skipped_dedup: 0,
    items_skipped_generation: 0,
    items_failed: 0,
    errors: [],
  };
}

// Fehler je Quelle sammeln; dieselbe Meldung wird hochgezaehlt statt
// wiederholt.
export function addRefreshError(
  stats: RefreshStats,
  source: { id: string; name: string },
  message: string,
): void {
  const existing = stats.errors.find((e) => e.source_id === source.id && e.message === message);
  if (existing) {
    existing.count = (existing.count ?? 1) + 1;
    return;
  }
  stats.errors.push({ source_id: source.id, source_name: source.name, message });
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

// last_refresh_stats (jsonb) defensiv lesen; null, wenn noch kein Lauf
// gespeichert ist oder die Form nicht passt.
export function parseRefreshStats(raw: unknown): RefreshStats | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (!("items_fetched" in r) && !("paused" in r)) return null;
  const errors: RefreshError[] = Array.isArray(r.errors)
    ? r.errors.flatMap((e): RefreshError[] => {
        if (!e || typeof e !== "object") return [];
        const o = e as Record<string, unknown>;
        if (typeof o.message !== "string") return [];
        return [{
          source_id: typeof o.source_id === "string" ? o.source_id : "",
          source_name: typeof o.source_name === "string" ? o.source_name : "Quelle",
          message: o.message,
          ...(typeof o.count === "number" && o.count > 1 ? { count: o.count } : {}),
        }];
      })
    : [];
  return {
    sources_polled: num(r.sources_polled),
    items_fetched: num(r.items_fetched),
    items_generated: num(r.items_generated),
    items_skipped_dedup: num(r.items_skipped_dedup),
    items_skipped_generation: num(r.items_skipped_generation),
    ...(typeof r.items_failed === "number" ? { items_failed: r.items_failed } : {}),
    errors,
    ...(r.paused === true ? { paused: true } : {}),
  };
}

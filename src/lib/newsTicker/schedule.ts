// Laufzeiten des News-Tickers (news_ticker_config.scheduled_hours_cet).
// Reines Modul ohne "server-only": Cron-Route, Admin-Seite und Tests nutzen
// es gemeinsam. Stunden sind Schweizer Zeit, 0 bis 23.

export const DEFAULT_TICKER_HOURS: readonly number[] = [7, 12, 18];

// Rohwert (DB-Array, Formular) in eine saubere Liste bringen: ganze Stunden
// 0–23, ohne Doppelte, aufsteigend. Unbrauchbares faellt weg.
export function normalizeHours(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set<number>();
  for (const v of raw) {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    if (Number.isInteger(n) && n >= 0 && n <= 23) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

// Wie normalizeHours, aber nie leer: ohne gueltige Stunde gilt der Standard.
export function hoursOrDefault(raw: unknown): number[] {
  const hours = normalizeHours(raw);
  return hours.length > 0 ? hours : [...DEFAULT_TICKER_HOURS];
}

export function isScheduledHour(hours: readonly number[], hour: number): boolean {
  return hours.includes(hour);
}

export function toggleHour(hours: readonly number[], hour: number): number[] {
  return hours.includes(hour)
    ? hours.filter((h) => h !== hour)
    : normalizeHours([...hours, hour]);
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

// «07:00, 12:00 und 18:00 Uhr»
export function describeHours(hours: readonly number[]): string {
  const labels = normalizeHours([...hours]).map(formatHour);
  if (labels.length === 0) return "";
  if (labels.length === 1) return `${labels[0]} Uhr`;
  return `${labels.slice(0, -1).join(", ")} und ${labels[labels.length - 1]} Uhr`;
}

// Naechste Laufstunde nach `nowHour` (heute oder morgen); null ohne Stunden.
export function nextRunHour(
  hours: readonly number[],
  nowHour: number,
): { hour: number; tomorrow: boolean } | null {
  const list = normalizeHours([...hours]);
  if (list.length === 0) return null;
  const later = list.find((h) => h > nowHour);
  return later !== undefined ? { hour: later, tomorrow: false } : { hour: list[0], tomorrow: true };
}

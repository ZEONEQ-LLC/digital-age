// Akzent-Farb-Mapping fuer Topic-/Hub-Listings (KI & Business, Future Tech).
// Wird sowohl von TopicHeader (SSR-Server-Komponente) als auch von
// TopicListing (Client-Filter-Komponente) genutzt — Single-Source damit
// die Akzent-Farbe an beiden Stellen konsistent bleibt.

export type Accent = "green" | "orange" | "purple";

const ACCENT_VAR: Record<Accent, string> = {
  green: "var(--da-green)",
  orange: "var(--da-orange)",
  purple: "var(--da-purple)",
};

export function getAccentVar(accent: Accent): string {
  return ACCENT_VAR[accent];
}

// Gestaltung der Kreative (F3). Client-sicher, kein Server-Import.
// Farben kommen aus den Projekt-Tokens; bei custom wird die Schriftfarbe aus
// der Helligkeit des Hintergrunds abgeleitet (YIQ).

export type CreativeTheme = "card" | "orange" | "green" | "dark" | "custom";

export const CREATIVE_THEMES: { code: CreativeTheme; label: string }[] = [
  { code: "card", label: "Standard" },
  { code: "orange", label: "Orange" },
  { code: "green", label: "Grün" },
  { code: "dark", label: "Dunkel" },
  { code: "custom", label: "Eigene Farbe" },
];

export function isCreativeTheme(s: string): s is CreativeTheme {
  return CREATIVE_THEMES.some((t) => t.code === s);
}

export function isHex(s: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(s);
}

// YIQ-Helligkeit: >= 150 -> dunkle Schrift, sonst weisse Schrift.
export function textOn(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (299 * r + 587 * g + 114 * b) / 1000;
  return yiq >= 150 ? "#1c1c1e" : "#ffffff";
}

export type ResolvedTheme = {
  background: string;
  color: string;
  border: string;
  kickerOpacity: number;
  // true fuer farbige Themes (orange/green/dark/custom): Body in color mit
  // Opacity statt --da-muted, Hover per brightness statt Border.
  flat: boolean;
};

export function resolveTheme(theme: string, bgColor?: string | null): ResolvedTheme {
  switch (theme) {
    case "orange":
      return { background: "var(--da-orange)", color: "var(--da-dark)", border: "transparent", kickerOpacity: 0.7, flat: true };
    case "green":
      return { background: "var(--da-green)", color: "var(--da-dark)", border: "transparent", kickerOpacity: 0.7, flat: true };
    case "dark":
      return { background: "var(--da-dark)", color: "var(--da-text)", border: "var(--da-green)", kickerOpacity: 0.7, flat: true };
    case "custom": {
      const bg = bgColor && isHex(bgColor) ? bgColor.toLowerCase() : "#1c1c1e";
      return { background: bg, color: textOn(bg), border: "transparent", kickerOpacity: 0.7, flat: true };
    }
    default:
      return { background: "var(--da-card)", color: "var(--da-text)", border: "var(--da-border)", kickerOpacity: 0.7, flat: false };
  }
}

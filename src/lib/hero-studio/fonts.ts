// Schriften fuer das Canvas des Hero Studio. Die Engine zeichnet mit den Familiennamen des
// Prototyps ("DA Grotesk", "DA Mono", "DA Inter") und animiert das variable Gewicht; next/font
// klemmt die Achse auf die deklarierten Gewichte, deshalb laden wir die woff2 aus public/fonts/
// selbst per FontFace. Idempotent, nur im Browser.

const HERO_FONTS: [family: string, url: string, weight: string][] = [
  ["DA Grotesk", "/fonts/space-grotesk-var.woff2", "300 700"],
  ["DA Mono", "/fonts/roboto-mono-var.woff2", "100 700"],
  ["DA Inter", "/fonts/inter-var.woff2", "100 900"],
];

let pending: Promise<void> | null = null;

function hasFamily(family: string): boolean {
  for (const f of document.fonts) {
    if (f.family === family || f.family === `"${family}"`) return true;
  }
  return false;
}

export function ensureHeroFonts(): Promise<void> {
  if (pending) return pending;
  pending = (async () => {
    await Promise.all(
      HERO_FONTS.map(async ([family, url, weight]) => {
        if (hasFamily(family)) return;
        const face = new FontFace(family, `url(${url}) format("woff2")`, { weight, style: "normal", display: "block" });
        await face.load();
        document.fonts.add(face);
      }),
    );
    // Dieselben Schnitte wie der Prototyp vor dem ersten Frame anfordern.
    await Promise.all([
      document.fonts.load('700 100px "DA Grotesk"'),
      document.fonts.load('300 100px "DA Grotesk"'),
      document.fonts.load('500 40px "DA Mono"'),
      document.fonts.load('700 40px "DA Mono"'),
    ]).catch(() => {});
  })();
  pending.catch(() => {
    pending = null;
  });
  return pending;
}

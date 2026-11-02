// Laedt Engine, Daten (Icons, Schreibschrift) und Schriften nur im Studio: ein dynamischer Import
// pro Teil, nichts davon landet im Bundle der uebrigen Suite.

import type { HeroEngine } from "./vendor";
import { ensureHeroFonts } from "./fonts";

export const HERO_LOGO_MASK_URL = "/images/hero-studio/logo-mask.png";

export async function loadHeroEngine(): Promise<HeroEngine> {
  const [{ createHeroEngine }, icons, font] = await Promise.all([
    import("./vendor/hero-engine.js"),
    import("./data/lucide-icons.json"),
    import("./data/ems-allure.json"),
    ensureHeroFonts(),
  ]);
  const engine = createHeroEngine({
    icons: icons.default.icons,
    iconTags: icons.default.tags,
    scriptFont: { upm: font.default.upm, asc: font.default.asc, xh: font.default.xh, g: font.default.g as unknown as Record<string, [number, string]> },
    logoMask: HERO_LOGO_MASK_URL,
  });
  await engine.logoReady;
  engine.clearTextCaches();
  return engine;
}

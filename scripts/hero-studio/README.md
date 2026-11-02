# Hero Studio · Build-Skripte

Alles hier ist Werkzeug, nichts davon laeuft zur Laufzeit. Quelle ist der abgenommene Prototyp
(`claude code briefings/hero-studio-uebergabe/`, Stand 31.10.2026).

| Skript | Zweck |
|---|---|
| `freeze-engine.py <quellen-ordner>` | Baut `src/lib/hero-studio/vendor/hero-engine.js` aus den Prototyp-Segmenten (Marker wie `quellen/hero/build_hero.py`) plus `parts/engine-api.js`. Jede Abweichung vom Prototyp steht als EDIT mit Assert im Skript. |
| `parts/engine-api.js` | Render-Logik und Fassade der Shell (DOM-frei), wird ans Ende der Closure gehaengt. |
| `build_icons.py <lucide-static>` | `data/lucide-icons.json` aus `lucide-static@1.56.0` (ISC). Paket nur temporaer installieren, nicht ins Repo. |
| `build_font.py <EMSAllure.svg>` | `data/ems-allure.json` aus `hersheytext@2.0.0` (MIT, Schrift OFL 1.1). Paket nur temporaer installieren. |
| `compare-references.mjs <referenzen-ordner>` | Pixel-Vergleich der vendorten Engine gegen die Referenzbilder des Prototyps (Playwright + Chromium). |

## Regenerieren der Daten

```bash
mkdir -p /tmp/hs-deps && cd /tmp/hs-deps && npm init -y >/dev/null && npm install --no-save lucide-static@1.56.0 hersheytext@2.0.0
cd /projekt/digital-age
python3 scripts/hero-studio/build_icons.py /tmp/hs-deps/node_modules/lucide-static
python3 scripts/hero-studio/build_font.py /tmp/hs-deps/node_modules/hersheytext/svg_fonts/EMSAllure.svg
```

Die eigenen Symbole (`robot`, `coins-rim`, `coins-franc`, `digital-age-bot`) stehen im Engine-Code
(`consts.js`-Segment) und nicht in den JSON-Daten.

## Pixel-Vergleich

```bash
PLAYWRIGHT_CORE=<pfad zu playwright-core> CHROMIUM=<pfad zu headless_shell> \
  node scripts/hero-studio/compare-references.mjs "../claude code briefings/hero-studio-uebergabe/referenzen" --out /tmp/hero-compare
```

Rendert alle Referenzen (`referenzen.json`: Spec, seedKey, heroP, midP, Artikelfelder) mit der
vendorten Engine in Chromium und vergleicht Pixel fuer Pixel. Ziel: identisch; Toleranz hoechstens
0,5 % Pixel mit Kanal-Abweichung ueber 16. Der Ordner `--out` erhaelt pro Bild das Rendering und,
bei Abweichungen, eine Diff-Maske. Der Prototyp hat die Referenzen mit `readMin = 6` gerendert
(Default des Prototyps), das Skript setzt denselben Wert.

Mit `--prototype <pfad zu prototyp/digital-age-hero-studio.html>` laeuft zusaetzlich Teil 2: der
Prototyp selbst wird im selben Chromium gerendert und mit der Engine verglichen. Das trennt
Port-Fehler (Teil 2 muss 0 px liefern) von Unterschieden der Text-Rasterung (Teil 1).
Die Prototyp-Datei bleibt unveraendert; die Fassade wird nur in der Kopie im Speicher eingehaengt.

**Herkunft der Referenzen (Stand 02.11.2026):** Die PNGs in `referenzen/` wurden in einer Linux-
Umgebung mit Playwright-Chromium gerendert, nicht auf dem Mac. Abweichungen in Teil 1 liegen
ausschliesslich an Glyphenraendern (Headline, Meta-Zeile, Schlagwort) und kommen von
unterschiedlichen Chromium-Builds (Schrift-Rasterung, Hinting); Linien, Logo, Signatur und
Texturen sind identisch. Massgeblich fuer den Port ist Teil 2, der Vergleich gegen den Prototyp
im selben Browser: 24/24 Bilder identisch (0 px Differenz).

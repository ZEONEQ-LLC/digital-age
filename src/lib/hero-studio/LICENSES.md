# Hero Studio · Lizenzen der eingebetteten Daten und Bibliotheken

Das Hero Studio (Tab im Artikel-Editor) liefert Client-Code aus, der fremde Daten enthaelt.
Diese Datei ist die Uebersicht; der vollstaendige Lizenztext wird mit dem Build unter
`/licenses/hero-studio.txt` ausgeliefert (Quelle: `public/licenses/hero-studio.txt`) und ist
im Studio ueber den Link «Lizenzen» erreichbar.

| Bestandteil | Woher | Lizenz | Im Repo |
|---|---|---|---|
| Lucide Icons 1.56.0 (1691 Symbole als Pfaddaten plus Tags) | lucide.dev, `lucide-static@1.56.0` | ISC; Symbole aus dem Feather-Projekt zusaetzlich MIT (Liste im Lizenztext) | `src/lib/hero-studio/data/lucide-icons.json` |
| hersheytext 2.0.0 (Konverter/Quelle der Einstrich-Schrift) | github.com/techninja/hersheytext | MIT | nur als Build-Quelle (`scripts/hero-studio/build_font.py`) |
| EMS Allure (Einstrich-Schreibschrift, 187 Glyphen) | hersheytext `svg_fonts/EMSAllure.svg`, Sheldon B. Michaels, Ableitung von Allura (Rob Leuschke, TypeSETit) | SIL Open Font License 1.1 | `src/lib/hero-studio/data/ems-allure.json` |
| Space Grotesk, Roboto Mono, Inter (Canvas-Schriften «DA Grotesk», «DA Mono», «DA Inter») | Site-Schriften, Kopie aus `src/app/fonts/` | SIL Open Font License 1.1, siehe `src/app/fonts/OFL-SpaceGrotesk.txt`, `OFL-RobotoMono.txt`, `OFL-Inter.txt` | `public/fonts/*.woff2` |
| Mediabunny (MP4-Muxer und WebCodecs-Pipeline, ab Stufe C) | npm `mediabunny` | MPL-2.0 (Nutzung erlaubt, Offenlegung nur bei Aenderungen an der Bibliothek selbst) | `node_modules/mediabunny` |

Eigene Symbole des Studios (`robot`, `coins-rim`, `coins-franc`, `digital-age-bot`) und die
Engine selbst (`src/lib/hero-studio/vendor/`) sind Eigenentwicklung von ZEONEQ.

## Lucide (ISC, Teile MIT)

```
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## hersheytext (MIT)

```
The MIT License (MIT)

Copyright (c) 2014 James T

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## EMS Allure (SIL Open Font License 1.1)

```
Handwriting: EMS Allure, a single-stroke font.
Font name:               EMS Allure
License:                 SIL Open Font License http://scripts.sil.org/OFL
Created by:              Sheldon B. Michaels
SVG font conversion by:  Windell H. Oskay
A derivative of:         Allura
Designer:                Rob Leuschke, TypeSETit
Link:                    http://www.typesetit.com
Google font page:        https://fonts.google.com/specimen/Allura
This Font Software is licensed under the SIL Open Font License, Version 1.1 (https://openfontlicense.org).
```

Lizenztext: wie `src/app/fonts/OFL-SpaceGrotesk.txt` ab «This Font Software is licensed under the
SIL Open Font License, Version 1.1.» (identischer OFL-1.1-Text, siehe `public/licenses/hero-studio.txt`).

## Mediabunny (MPL-2.0)

Mozilla Public License 2.0, Volltext: https://www.mozilla.org/MPL/2.0/ und
`node_modules/mediabunny/LICENSE`. Die Bibliothek wird unveraendert verwendet.

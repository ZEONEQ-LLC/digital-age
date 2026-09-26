# Schriften

Eingebunden in `src/app/layout.tsx` über `next/font/local`. Der Build lädt nichts von Google.

| Datei | Schrift | Version | Achse |
|---|---|---|---|
| `inter-var.woff2` | Inter | 4.001 | wght 100–900, opsz fest auf 14 |
| `space-grotesk-var.woff2` | Space Grotesk | 2.000 | wght 300–700 |
| `roboto-mono-var.woff2` | Roboto Mono | 3.001 | wght 100–700 |

- Quelle: variable TTFs aus [google/fonts](https://github.com/google/fonts) (`ofl/inter`, `ofl/spacegrotesk`, `ofl/robotomono`). Das sind dieselben Versionen, die Google Fonts ausliefert.
- Zeichenumfang: die Bereiche `latin` und `latin-ext` von Google Fonts in einer Datei. Griechisch, Kyrillisch und Vietnamesisch sind nicht enthalten und fallen auf die Systemschrift zurück.
- OpenType-Features wie bei Google: Standard-Features plus `pnum` und `tnum`, ohne Hinting.
- Lizenz: SIL Open Font License 1.1, siehe `OFL-*.txt`.

## Neu erzeugen

Mit [fonttools](https://github.com/fonttools/fonttools) (`pip install fonttools brotli`):

```python
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"
LATIN_EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF"

def parse(ranges):
    out = set()
    for part in ranges.split(","):
        a, _, b = part.strip().replace("U+", "").partition("-")
        out.update(range(int(a, 16), int(b or a, 16) + 1))
    return out

def build(src, out, pin=None):
    font = TTFont(src, lazy=False)
    if pin:
        instancer.instantiateVariableFont(font, pin, inplace=True)
        font.save(out + ".tmp.ttf")
        font = TTFont(out + ".tmp.ttf", lazy=False)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = opts.layout_features + ["pnum", "tnum"]
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=parse(LATIN) | parse(LATIN_EXT))
    sub.subset(font)
    font.flavor = "woff2"
    font.save(out)

build("Inter[opsz,wght].ttf", "inter-var.woff2", pin={"opsz": 14})
build("SpaceGrotesk[wght].ttf", "space-grotesk-var.woff2")
build("RobotoMono[wght].ttf", "roboto-mono-var.woff2")
```

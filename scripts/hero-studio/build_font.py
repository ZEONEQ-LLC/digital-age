"""Erzeugt src/lib/hero-studio/data/ems-allure.json aus der SVG-Schrift EMS Allure (OFL 1.1) in hersheytext (MIT).

Aufruf:  python3 scripts/hero-studio/build_font.py <pfad zu node_modules/hersheytext/svg_fonts/EMSAllure.svg>
hersheytext ist bewusst NICHT im Repo installiert; fuer das Regenerieren temporaer
`npm install --no-save hersheytext@2.0.0` in einem Scratch-Ordner und den Pfad uebergeben.
Konvertierung wie im Prototyp (quellen/motion/line/build_font.py), Ausgabe JSON statt JS.
"""
import re, json, html, pathlib, sys
src = pathlib.Path(sys.argv[1])
out = pathlib.Path(__file__).resolve().parents[2] / 'src/lib/hero-studio/data/ems-allure.json'
s = src.read_text()
g = {}
for m in re.finditer(r'<glyph\s([^>]*)/>', s):
    a = dict(re.findall(r'([\w-]+)="([^"]*)"', m.group(1)))
    if 'unicode' not in a: continue
    u = html.unescape(a['unicode'])
    if len(u) != 1: continue
    adv = float(a.get('horiz-adv-x', 378))
    d = re.sub(r'\s+', ' ', a.get('d', '')).strip()
    d = re.sub(r'(\d+\.\d)\d+', r'\1', d)
    g[u] = [round(adv), d]
data = {'_license': 'EMS Allure (Einstrich-Schrift), SIL Open Font License 1.1. Siehe src/lib/hero-studio/LICENSES.md. Generiert aus hersheytext 2.0.0 (scripts/hero-studio/build_font.py).', 'upm': 1000, 'asc': 800, 'xh': 300, 'g': g}
out.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
print(len(g), 'glyphs', out.stat().st_size // 1024, 'KB', 'ä' in g, 'ß' in g)

"""Erzeugt src/lib/hero-studio/data/lucide-icons.json aus lucide-static (ISC).

Aufruf:  python3 scripts/hero-studio/build_icons.py <pfad zu node_modules/lucide-static>
lucide-static ist bewusst NICHT im Repo installiert; fuer das Regenerieren temporaer
`npm install --no-save lucide-static@1.56.0` in einem Scratch-Ordner und den Pfad uebergeben.
Konvertierung wie im Prototyp (quellen/motion/line/build_icons.py), Ausgabe JSON statt JS.
"""
import json, pathlib, re, sys
src = pathlib.Path(sys.argv[1])
out = pathlib.Path(__file__).resolve().parents[2] / 'src/lib/hero-studio/data/lucide-icons.json'
nodes = json.load(open(src / 'icon-nodes.json'))
tags = json.load(open(src / 'tags.json'))
def f(x):
    x = float(x); s = ('%.3f' % x).rstrip('0').rstrip('.')
    return s if s not in ('-0', '') else '0'
def el2d(tag, a):
    if tag == 'path': return a['d']
    if tag == 'circle':
        cx, cy, r = float(a['cx']), float(a['cy']), float(a['r'])
        return f"M{f(cx-r)} {f(cy)}a{f(r)} {f(r)} 0 1 0 {f(2*r)} 0a{f(r)} {f(r)} 0 1 0 {f(-2*r)} 0"
    if tag == 'ellipse':
        cx, cy, rx, ry = float(a['cx']), float(a['cy']), float(a['rx']), float(a['ry'])
        return f"M{f(cx-rx)} {f(cy)}a{f(rx)} {f(ry)} 0 1 0 {f(2*rx)} 0a{f(rx)} {f(ry)} 0 1 0 {f(-2*rx)} 0"
    if tag == 'rect':
        x, y, w, h = float(a.get('x', 0)), float(a.get('y', 0)), float(a['width']), float(a['height'])
        rx = float(a.get('rx', a.get('ry', 0)) or 0); ry = float(a.get('ry', rx) or rx)
        rx, ry = min(rx, w / 2), min(ry, h / 2)
        if rx <= 0: return f"M{f(x)} {f(y)}h{f(w)}v{f(h)}h{f(-w)}Z"
        return (f"M{f(x+rx)} {f(y)}H{f(x+w-rx)}A{f(rx)} {f(ry)} 0 0 1 {f(x+w)} {f(y+ry)}V{f(y+h-ry)}A{f(rx)} {f(ry)} 0 0 1 {f(x+w-rx)} {f(y+h)}"
                f"H{f(x+rx)}A{f(rx)} {f(ry)} 0 0 1 {f(x)} {f(y+h-ry)}V{f(y+ry)}A{f(rx)} {f(ry)} 0 0 1 {f(x+rx)} {f(y)}Z")
    if tag == 'line': return f"M{f(a['x1'])} {f(a['y1'])}L{f(a['x2'])} {f(a['y2'])}"
    if tag in ('polyline', 'polygon'):
        pts = [p for p in re.split(r'[\s,]+', a['points'].strip()) if p]
        pairs = [f"{f(pts[i])} {f(pts[i+1])}" for i in range(0, len(pts) - 1, 2)]
        return 'M' + 'L'.join(pairs) + ('Z' if tag == 'polygon' else '')
    raise ValueError(tag)
skip = ('align-', 'arrow-', 'arrows-', 'chevron', 'text-', 'heading', 'list-', 'panel', 'between-', 'fold-', 'grip', 'table-', 'columns-', 'rows-', 'separator', 'indent', 'wrap-', 'pilcrow', 'strikethrough', 'subscript', 'superscript', 'underline', 'italic', 'bold', 'case-', 'whole-word', 'remove-formatting', 'letter-text', 'spell-check', 'ligature', 'baseline', 'type-outline')
icons, itags = {}, {}
for name, els in sorted(nodes.items()):
    if name.startswith(skip): continue
    try: icons[name] = '|'.join(el2d(t, a) for t, a in els)
    except Exception as e: print('skip', name, e)
    itags[name] = ' '.join(sorted(set(w for t in tags.get(name, []) for w in re.split(r'[^a-z0-9]+', t.lower()) if len(w) >= 2)))
data = {'_license': 'Lucide Icons, ISC (Teile aus Feather, MIT). Siehe src/lib/hero-studio/LICENSES.md. Generiert aus lucide-static 1.56.0 (scripts/hero-studio/build_icons.py).', 'icons': icons, 'tags': itags}
out.write_text(json.dumps(data, separators=(',', ':')))
print(len(icons), 'icons', out.stat().st_size // 1024, 'KB')

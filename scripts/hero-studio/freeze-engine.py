"""Friert die Engine des Hero-Studio-Prototyps als ESM-Vendor-Modul ein.

Aufruf:  python3 scripts/hero-studio/freeze-engine.py <pfad zu hero-studio-uebergabe/quellen>
Schreibt: src/lib/hero-studio/vendor/hero-engine.js

Segmente wie in quellen/hero/build_hero.py (gemeinsame Basis s1/s2/s3 plus ALT_COLOR/detectLang,
Typo t1-t6, Linie consts/recipe/engine/ki, dazu typo-api.js und line-api.js). Alles landet in einer
Closure `createHeroEngine(...)`, damit die Globals des Prototyps (state, ctx, cv, BASE, Caches) pro
Instanz leben. Zeichenlogik bleibt woertlich; jede Abweichung steht unten als EDIT mit Assert.
"""
import pathlib, sys

src = pathlib.Path(sys.argv[1])
repo = pathlib.Path(__file__).resolve().parents[2]
out = repo / 'src/lib/hero-studio/vendor/hero-engine.js'
motion = src / 'motion'
line = motion / 'line'
hero = src / 'hero'
T = (motion / 'template.html').read_text()
R = lambda p: pathlib.Path(p).read_text()

def between(s, a, b, include_a=True):
    i = s.index(a)
    j = s.index(b, i + len(a))
    return s[i if include_a else i + len(a):j]

def edit(s, old, new, label):
    assert s.count(old) == 1, f'EDIT {label}: Muster {s.count(old)}x gefunden, erwartet 1'
    return s.replace(old, new)

# ---- shared base (wie build_hero.py)
s1 = between(T, "const TAU = Math.PI * 2;", "/* ---------- building blocks of a variant ---------- */")
s2 = between(T, "/* ---------- seeded randomness ---------- */", "function recipeFor(key, variant) {")
s3 = between(T, "/* ---------- canvas + text helpers ---------- */", "/* ---------- motions")
s3 = s3.replace("const cv = $('#cv');\nconst ctx = cv.getContext('2d');", "let cv = document.createElement('canvas');\nlet ctx = cv.getContext('2d');")
assert "let ctx = cv.getContext('2d');" in s3
a = s3.index('function drawBrand(L, pal, key) {'); b = s3.index('\n}\n', a) + 3
s3 = s3[:a] + s3[b:]
alt_color = between(T, "const ALT_COLOR = {", "function postLang()")
# EDIT 1: DOM-Helfer $ wird in der Engine nicht gebraucht (nur die Shell nutzte ihn)
s1 = edit(s1, "const $ = (s) => document.querySelector(s);\n", "", 'shared $')
# EDIT 2: Logo-Maske kommt als URL aus der Factory statt als eingebettetes Base64
s3 = edit(s3, "logoImg.src = 'data:image/png;base64,__LOGO__';", "logoImg.src = logoMask;", 'logo src')
shared = s1 + s2 + s3 + alt_color

# ---- typography engine
t1 = between(T, "const MODES = {", "const DEFAULTS = {")
t2 = between(T, "function recipeFor(key, variant) {", "/* ---------- state ---------- */")
t3 = between(T, "/* ---------- motions", "/* ---------- render loop ---------- */")
t4 = between(T, "function heroPhase(e = effective()) {", "/* ---------- Post-Paket")
t5 = between(T, "const ALT_MOTION = {", "const ALT_COLOR = {")
t6 = between(T, "function sanitizeRegie(o) {", "function regieFp(r)")
typo = t1 + t2 + t3 + t4 + t5 + t6 + R(hero / 'typo-api.js')

# ---- line engine
ki = R(line / 'ki.js')
# EDIT 3: aus ki.js nur Prompt-Hilfen, Sanitizer, kiShape, kiRecord, promptIconNames, heroPhase, ALT_ANIM.
# Weg: kiList/kiMorph/kiCtl/canImages, KI_EXAMPLE_D/KI_TECH/kiPrompt, motifPng, blindLook, reviewRefine (Vision),
# KI_STATUS, kiCardThumb, renderKi, applyKi, runKi (DOM).
ki_sub = (between(ki, "const ICON_MODS = ", "const KI_TECH = ")
          + between(ki, "function sanitizeD(d) {", "function motifPng(m) {")
          + between(ki, "function kiRecord(m) {", "async function blindLook(")
          + ki[ki.index("/* ---------- Titelmoment"):])
assert 'document.' not in ki_sub and 'sampleFn' not in ki_sub and 'canImages' not in ki_sub
api = R(hero / 'line-api.js')
# EDIT 4: Vision-Funktionen und setCanImages aus der Fassade; dispose entfernt den SVG-Sampler aus dem DOM
api = edit(api, "registerKi, kiStore, sanitizeKi, sanitizeD, kiId, kiRecord, kiShape, promptIconNames, blindLook, reviewRefine,",
           "registerKi, kiStore, sanitizeKi, sanitizeD, kiId, kiRecord, kiShape, promptIconNames,", 'line-api vision')
api = edit(api, "  setCanImages: (v) => { canImages = !!v; },\n",
           "  dispose: () => { if (svgSampler.parentNode) svgSampler.parentNode.remove(); },\n", 'line-api dispose')
lin = R(line / 'consts.js') + R(line / 'recipe.js') + R(line / 'engine.js') + ki_sub + api

api_part = R(repo / 'scripts/hero-studio/parts/engine-api.js')

head = '''/* eslint-disable */
// GENERIERT von scripts/hero-studio/freeze-engine.py aus dem Hero-Studio-Prototyp
// (claude code briefings/hero-studio-uebergabe/quellen, Stand 31.10.2026). Nicht von Hand editieren:
// Aenderungen gehoeren in freeze-engine.py (EDIT-Liste) oder parts/engine-api.js.
//
// Inhalt: gemeinsame Basis (Seed, Canvas-Helfer, Farbklaenge, Layout), Typo-Engine (15 Bewegungen),
// Linien-Engine (10 Animationen, Motive, Symbolsuche) und die Render-Fassade der Shell.
// mulberry32, strHash, recipeFor sind unveraendert: gleiches Rezept = gleiches Bild.
//
// Lizenzen der eingebetteten Daten: src/lib/hero-studio/LICENSES.md
export function createHeroEngine({ icons, iconTags, scriptFont, logoMask }) {
let state = {};
'''
body = (head
        + '/* ===== shared base (motion/template.html) ===== */\n' + shared
        + '\n/* ===== typo engine (motion/template.html + hero/typo-api.js) ===== */\nconst TYPO = (function () {\n' + typo + '\n})();\n'
        + '/* ===== data (JSON, see data/) ===== */\nconst ICONS = Object.assign({}, icons);\nconst ICON_TAGS = Object.assign({}, iconTags);\nconst SCRIPT_FONT = scriptFont;\n'
        + '/* ===== line engine (motion/line/*.js + hero/line-api.js) ===== */\nconst LINE = (function () {\n' + lin + '\n})();\n'
        + api_part
        + '}\n')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(body)
print(out.relative_to(repo), body.count('\n'), 'Zeilen,', len(body) // 1024, 'KB')

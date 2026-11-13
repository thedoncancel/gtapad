"""Builds the palm-sunset logo SVGs with the lettering outlined (no web fonts needed).
Usage: python3 make.py <fonts dir with Anton.ttf and Yellowtail.ttf> <out dir>
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONTS, OUT = sys.argv[1], sys.argv[2]
INK, CREAM, TEAL, TEAL_DARK = "#09070a", "#f1ece4", "#19e3d0", "#0aa89a"


def text_path(font_file, text, size, x, baseline, anchor="start"):
    """Outlined text as an SVG path `d`, plus its advance width."""
    f = TTFont(f"{FONTS}/{font_file}")
    gs, cmap, upm = f.getGlyphSet(), f.getBestCmap(), f["head"].unitsPerEm
    s = size / upm
    names = [cmap[ord(c)] for c in text]
    width = sum(gs[n].width for n in names) * s
    if anchor == "middle":
        x -= width / 2
    pen = SVGPathPen(gs)
    cx = x
    for n in names:
        gs[n].draw(TransformPen(pen, (s, 0, 0, -s, cx, baseline)))
        cx += gs[n].width * s
    return pen.getCommands(), width


SUN = '<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd166"/><stop offset=".5" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ff2e88"/></linearGradient>'
STRIPES = '<rect x="80" y="150" width="240" height="7"/><rect x="80" y="170" width="240" height="10"/><rect x="80" y="194" width="240" height="14"/><rect x="80" y="222" width="240" height="40"/>'
PALM = f'<path d="M268,262 C266,210 262,170 270,120 M270,120 C250,104 226,106 214,118 M270,120 C258,96 236,88 222,92 M270,120 C284,96 306,94 320,102 M270,120 C292,110 312,118 322,132 M270,120 C272,98 268,82 258,74" stroke="{INK}" stroke-width="7" fill="none" stroke-linecap="round"/>'


def badge_defs():
    # the stripes are cut out of the sun (mask), so the badge works on any background
    return (
        f'{SUN}<clipPath id="sc"><circle cx="200" cy="140" r="110"/></clipPath>'
        f'<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="300"><rect width="400" height="300" fill="#fff"/><g fill="#000">{STRIPES}</g></mask>'
    )


BADGE = f'<g clip-path="url(#sc)"><circle cx="200" cy="140" r="110" fill="url(#sun)" mask="url(#cut)"/>{PALM}</g>'


def stacked(gta_fill, pad_fill):
    """The full logo: sunset badge over GTA + script pad (same layout as option C on the board)."""
    gta, gw = text_path("Anton.ttf", "GTA", 62, 0, 0)
    pad, pw = text_path("Yellowtail.ttf", "pad", 66, 0, 0)
    total = gw + 4 + pw
    x0 = 200 - total / 2
    gta, _ = text_path("Anton.ttf", "GTA", 62, x0, 290)
    pad, _ = text_path("Yellowtail.ttf", "pad", 66, x0 + gw + 4, 290)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="76 24 248 284"><defs>{badge_defs()}</defs>{BADGE}'
        f'<path fill="{gta_fill}" d="{gta}"/><path fill="{pad_fill}" d="{pad}"/></svg>'
    )


def compact(gta_fill, pad_fill):
    """Header lockup: badge on the left, wordmark on the right, 128 units tall."""
    r = 58
    k = r / 110
    gta, gw = text_path("Anton.ttf", "GTA", 86, 140, 98)
    pad, pw = text_path("Yellowtail.ttf", "pad", 92, 140 + gw + 4, 98)
    w = 140 + gw + 4 + pw + 10
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} 128"><defs>{badge_defs()}</defs>'
        f'<g transform="translate(64 64) scale({k:.4f}) translate(-200 -140)">{BADGE}</g>'
        f'<path fill="{gta_fill}" d="{gta}"/><path fill="{pad_fill}" d="{pad}"/></svg>'
    ), w


def icon(rounded=True):
    """Square app icon / favicon: the sunset badge with its palm on ink."""
    rx = ' rx="14"' if rounded else ""
    isun = SUN.replace('id="sun"', 'id="isun"')
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>{isun}'
        '<clipPath id="ic"><circle cx="32" cy="32" r="24"/></clipPath></defs>'
        f'<rect width="64" height="64"{rx} fill="{INK}"/><g clip-path="url(#ic)"><circle cx="32" cy="32" r="24" fill="url(#isun)"/>'
        f'<g fill="{INK}"><rect y="34" width="64" height="2"/><rect y="40" width="64" height="3"/><rect y="47" width="64" height="20"/></g>'
        f'<path d="M44,58 C43.5,48 43,41 44.5,32 M44.5,32 C40,28.5 35,29 32.5,31.5 M44.5,32 C42,27 37.5,25 34.5,26 M44.5,32 C47.5,27 52,26.5 55,28 M44.5,32 C49,30 53,31.5 55,34.5 M44.5,32 C45,27.5 44,24 42,22.5" stroke="{INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/></g></svg>'
    )


files = {
    "palm.svg": stacked(CREAM, TEAL),
    "palm-dark.svg": stacked(INK, TEAL_DARK),
    "icon.svg": icon(),
    "icon-square.svg": icon(False),
}
c, w = compact(CREAM, TEAL)
files["palm-compact.svg"] = c
files["palm-compact-dark.svg"] = compact(INK, TEAL_DARK)[0]
for name, svg in files.items():
    open(f"{OUT}/{name}", "w").write(svg)
    print(name, len(svg))
print("compact width", round(w))

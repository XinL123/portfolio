#!/usr/bin/env python3
"""Generate the DARK-MODE variants of the three rope charms.

Light charms are transparent line art (near-black strokes). Dark mode used to
show them via CSS invert(1), which leaves the ENCLOSED SHAPES hollow — the user
wants them filled like little gems (heart rose, star gold, raindrop ice-blue),
with the STROKE colour untouched.

A raster interior cannot be filled from CSS, so this bakes, per charm:
  1. stroke layer  = the light PNG with its RGB inverted per pixel (identical
                     to what CSS invert(1) produced, so the lines look the same)
  2. fill layer    = the enclosed interior flooded with the gem colour at
                     FILL_ALPHA. Interior = anything NOT reachable from the
                     canvas corners when solid stroke pixels (dilated a touch,
                     to seal crayon gaps) act as walls. The string above each
                     shape encloses nothing, so it stays fill-free by itself.
  3. composite     = fill underneath, stroke on top (fill tucks under the
                     stroke's antialiased edge — no transparent moat).

Run from anywhere:  python3 scripts/make-dark-charms.py
Then bump the  charm-*-dark.png?v=  tokens in index.html.

TUNING: FILL_ALPHA (0-255) = how solid the gem reads; per-charm colours below.
"""
from PIL import Image, ImageFilter
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "assets", "system")

FILL_ALPHA = 96          # ~0.38 — clearly a gem, still light
SEAL_PX = 5              # dilation that seals small stroke gaps before flooding
SOLID = 60               # alpha above this counts as a stroke wall

COLORS = {
    "star":  (255, 205, 112),   # gold
    "heart": (255, 140, 168),   # rose
    "drop":  (128, 188, 255),   # ice blue
}


def build(name, rgb):
    src = Image.open(os.path.join(OUT, f"charm-{name}.png")).convert("RGBA")
    w, h = src.size
    px = src.load()

    # 1. stroke layer: invert RGB, keep alpha (matches CSS invert(1) exactly)
    stroke = Image.new("RGBA", (w, h))
    sp = stroke.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            sp[x, y] = (255 - r, 255 - g, 255 - b, a)

    # 2. walls = solid stroke, dilated to seal crayon gaps
    walls = src.getchannel("A").point(lambda a: 255 if a > SOLID else 0)
    walls = walls.filter(ImageFilter.MaxFilter(2 * SEAL_PX + 1))

    # flood the OUTSIDE from every corner; what stays unreached is interior
    outside = Image.new("L", (w, h), 0)
    wp, op = walls.load(), outside.load()
    stack = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        if op[x, y] or wp[x, y]:
            continue
        op[x, y] = 255
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    # 3. fill mask. "not outside" alone would also paint the SEAL_PX dilation
    #    ring hugging the *outer* edge of every stroke (a faint coloured fringe
    #    along the string). So: take the pure interior (inside, minus the wall
    #    band), grow it back so it tucks under the stroke's antialiased edge,
    #    and clip it so it may never enter wall pixels that carry no stroke —
    #    i.e. the outer ring stays clean, the under-stroke moat gets covered.
    from PIL import ImageChops
    inside = ImageChops.invert(outside)
    a_any = src.getchannel("A").point(lambda a: 255 if a > 0 else 0)
    ring = ImageChops.multiply(walls, ImageChops.invert(a_any))   # wall, no stroke
    allowed = ImageChops.multiply(inside, ImageChops.invert(ring))
    true_int = ImageChops.multiply(inside, ImageChops.invert(walls))
    grown = true_int.filter(ImageFilter.MaxFilter(2 * (SEAL_PX + 2) + 1))
    fill_mask = ImageChops.multiply(grown, allowed)

    fill = Image.new("RGBA", (w, h), (*rgb, 255))
    fill.putalpha(fill_mask.point(lambda v: FILL_ALPHA if v else 0))
    filled = sum(1 for v in fill_mask.getdata() if v)

    out = Image.alpha_composite(fill, stroke)
    dest = os.path.join(OUT, f"charm-{name}-dark.png")
    out.save(dest)
    print(f"{name}: interior {filled}px ({filled / (w * h) * 100:.1f}% of canvas) -> {dest}")


if __name__ == "__main__":
    import sys
    sys.setrecursionlimit(10000)
    for n, c in COLORS.items():
        build(n, c)

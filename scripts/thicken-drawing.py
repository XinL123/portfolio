#!/usr/bin/env python3
"""Rebuild the hanging drawing (画 -> assets/system/hanging-drawing.png) from its
source, thickening the strokes to a chosen ON-SCREEN weight WITHOUT changing the
drawing's form or detail. Same ink-bbox crop + aspect as the live asset, so the
.pc-l1pic position/size is unchanged — only the stroke width grows.

Run from anywhere:  python3 scripts/thicken-drawing.py
Then bump the  hanging-drawing.png?v=  cache token in index.html (or hard-reload).

TUNING: change TARGET_DISP_STROKE below. Bigger = bolder lines, smaller = finer.
"""
from PIL import Image, ImageFilter
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "charm-sources", "画.png")
OUT = os.path.join(ROOT, "assets", "system", "hanging-drawing.png")

INK = (30, 30, 30)
DISP_VW = 6.0               # .pc-l1pic width in vw
VW_PX = 1280 / 100.0        # 1 vw at the reference viewport
TARGET_DISP_STROKE = 0.8   # <-- KNOB: stroke width in px on a 1280 viewport


def to_alpha_solid(path):
    src = Image.open(path).convert("RGB")
    w, h = src.size
    out = Image.new("RGBA", (w, h))
    s, d = src.load(), out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = s[x, y]
            lum = (r * 299 + g * 587 + b * 114) // 1000
            a = 255 - lum
            d[x, y] = (*INK, 0 if a < 12 else min(255, int(a * 1.25)))
    return out


def ink_bbox(img, thr=40):
    p = img.load()
    w, h = img.size
    minx, maxx, miny, maxy = w, -1, h, -1
    for y in range(h):
        for x in range(w):
            if p[x, y][3] > thr:
                minx = min(minx, x); maxx = max(maxx, x)
                miny = min(miny, y); maxy = max(maxy, y)
    return (minx, miny, maxx + 1, maxy + 1)


def stroke_width(img):
    """median horizontal opaque-run (ignoring long frame fills)."""
    p = img.load()
    w, h = img.size
    runs = []
    for y in range(0, h, 2):
        run = 0
        for x in range(w):
            if p[x, y][3] > 120:
                run += 1
            elif run:
                runs.append(run)
                run = 0
        if run:
            runs.append(run)
    runs = [r for r in runs if 0 < r < w * 0.5]
    runs.sort()
    return runs[len(runs) // 2] if runs else 1


def build():
    art = to_alpha_solid(SRC)
    crop = art.crop(ink_bbox(art))
    cw, ch = crop.size
    work_w = 640                                # keeps exact aspect; small kernels
    work = crop.resize((work_w, round(ch * work_w / cw)), Image.LANCZOS)
    ww, wh = work.size
    wp = work.load()
    for y in range(wh):                         # re-solidify after LANCZOS
        for x in range(ww):
            r, g, b, a = wp[x, y]
            if a:
                wp[x, y] = (*INK, 255 if a > 90 else min(255, int(a * 1.6)))
    cur = stroke_width(work)
    disp_scale = (DISP_VW * VW_PX) / ww         # px_screen per px_work
    need = TARGET_DISP_STROKE / disp_scale
    radius = max(0, round((need - cur) / 2))
    k = 2 * radius + 1
    thick = work.filter(ImageFilter.MaxFilter(k)) if k >= 3 else work
    thick.save(OUT)
    print(f"MaxFilter({k}) -> ~{(cur + k - 1) * disp_scale:.2f}px display stroke  ({OUT})")


if __name__ == "__main__":
    build()

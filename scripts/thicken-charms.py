#!/usr/bin/env python3
"""Rebuild the line1 charm assets (star / heart / raindrop) from the hand-drawn
sources, thickening their strokes to a chosen ON-SCREEN weight.

Why this exists: the sources are ~1254px but each charm displays at ~14px, so the
raw strokes CSS-scale down to a hairline. Keeping native resolution isn't enough —
the boldness is a stroke-to-body RATIO, so we DILATE the strokes to the width that
renders at TARGET_DISP_STROKE px on a 1280 viewport (≈ the rope / line weight).

Run from anywhere:  python3 scripts/thicken-charms.py
Then bump the  charm-*.png?v=  cache token in index.html (or hard-reload locally).

TUNING: change TARGET_DISP_STROKE below. Bigger = bolder. If a charm looks blobby,
lower it. To change a charm's SIZE instead, edit its  .pc-l1{star,heart,drop}
width in styles.css and set the matching disp_vw here, then re-run.
"""
from PIL import Image, ImageFilter
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "charm-sources")
OUT_DIR = os.path.join(ROOT, "assets", "system")

INK = (26, 26, 26)          # near-black, matches the rope ink
VW_PX = 1280 / 100.0        # 1 vw at the reference viewport
TARGET_DISP_STROKE = 0.8   # <-- KNOB: stroke width in px on a 1280 viewport

# name -> source file, ink-bbox crop box, body width (px), display width (vw).
# The crop box + disp_vw must match the .pc-l1{name} CSS so positioning is stable.
META = {
    "star":  dict(f="星星.png", box=(481, 387, 785, 911), bodyw=281, disp_vw=1.24),
    "heart": dict(f="心.png",   box=(429, 98, 824, 920),  bodyw=372, disp_vw=1.11),
    "drop":  dict(f="雨滴.png", box=(550, 205, 715, 870), bodyw=142, disp_vw=0.84),
}


def to_alpha_solid(path):
    """white-bg drawing -> transparent, solid-ink line art (alpha = 255 - luma)."""
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


def stroke_width(img):
    """median horizontal opaque-run in the upper (string) region = one stroke."""
    p = img.load()
    w, h = img.size
    runs = []
    for y in range(0, h // 2, 2):
        run = 0
        for x in range(w):
            if p[x, y][3] > 120:
                run += 1
            elif run:
                runs.append(run)
                run = 0
        if run:
            runs.append(run)
    runs = [r for r in runs if r > 0]
    runs.sort()
    return runs[len(runs) // 2] if runs else 1


def build():
    for name, m in META.items():
        art = to_alpha_solid(os.path.join(SRC, m["f"]))
        crop = art.crop(m["box"])
        cw, ch = crop.size
        # small working res (body -> 256px) keeps dilation kernels small + crisp
        scale = 256 / m["bodyw"]
        work = crop.resize((round(cw * scale), round(ch * scale)), Image.LANCZOS)
        ww, wh = work.size
        wp = work.load()
        for y in range(wh):                         # re-solidify after LANCZOS
            for x in range(ww):
                r, g, b, a = wp[x, y]
                if a:
                    wp[x, y] = (*INK, 255 if a > 90 else min(255, int(a * 1.6)))
        cur = stroke_width(work)
        disp_scale = (m["disp_vw"] * VW_PX) / ww    # px_screen per px_work
        need = TARGET_DISP_STROKE / disp_scale
        radius = max(0, round((need - cur) / 2))
        k = 2 * radius + 1
        thick = work.filter(ImageFilter.MaxFilter(k)) if k >= 3 else work
        out_path = os.path.join(OUT_DIR, f"charm-{name}.png")
        thick.save(out_path)
        print(f"{name}: MaxFilter({k}) -> ~{(cur + k - 1) * disp_scale:.2f}px "
              f"display stroke  ({out_path})")


if __name__ == "__main__":
    build()

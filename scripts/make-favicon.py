#!/usr/bin/env python3
"""Regenerate the browser-tab favicon from the existing site logo.

Run:   python3 scripts/make-favicon.py
Then:  bump the ?v=N query on the favicon <link>s in the 6 HTML files
       (index/about/resume/playground/work/404) so Chrome drops its cached
       icon, commit, and push (Netlify auto-deploys).

No redesign — this only trims, squares, and resizes the existing artwork.
Tune MARGIN below to change how large the logo sits inside the tab-icon square.
"""
from PIL import Image
import os

# ---- knobs you can tweak -------------------------------------------------
SOURCE = "assets/system/site-logo-cropped.png"  # existing logo to use
MARGIN = 0.0   # blank space on each side, as a fraction of the logo size:
               #   0.06  -> 6% padding (small logo)
               #   0.0   -> flush to the edges, no crop  (current choice)
               #  -0.08  -> logo bleeds out, edges get clipped (biggest)
# --------------------------------------------------------------------------

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src_path = os.path.join(ROOT, SOURCE)

img = Image.open(src_path).convert("RGBA")

# Trim fully-transparent border so the mark itself fills the frame.
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)
w, h = img.size

# Square canvas; MARGIN>0 pads, MARGIN<0 shrinks the canvas so the logo bleeds.
side = max(1, int(max(w, h) * (1 + 2 * MARGIN)))
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
square.paste(img, ((side - w) // 2, (side - h) // 2), img)

# favicon.png — transparent, 256px (browsers downscale for the tab).
square.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, "favicon.png"))

# favicon.ico — multi-size for the bare /favicon.ico default request.
square.save(os.path.join(ROOT, "favicon.ico"), format="ICO",
            sizes=[(16, 16), (32, 32), (48, 48)])

# apple-touch-icon.png — iOS adds no background, so composite on white.
apple = Image.new("RGBA", square.size, (255, 255, 255, 255))
apple.paste(square, (0, 0), square)
apple.convert("RGB").resize((180, 180), Image.LANCZOS).save(
    os.path.join(ROOT, "apple-touch-icon.png"))

for f in ("favicon.png", "favicon.ico", "apple-touch-icon.png"):
    p = os.path.join(ROOT, f)
    print(f"{f}: {os.path.getsize(p)} bytes, {Image.open(p).size}  (MARGIN={MARGIN})")

#!/usr/bin/env python3
"""Regenerate the browser-tab favicon from the existing site logo.

Run:   python3 scripts/make-favicon.py
Then:  bump the ?v=N query on the favicon <link>s in the 6 HTML files
       (index/about/resume/playground/work/404) so Chrome drops its cached
       icon, commit, and push (Netlify auto-deploys).

No redesign — this only trims, squares, centers, and resizes the existing art.

Why the ALPHA_THR trim (not a plain getbbox): the source PNGs carry a faint
alpha=1 "halo" that reaches every corner, so PIL's getbbox() (any alpha>0)
trims NOTHING and the logo ends up small and off-centre inside its own padding.
The alpha channel is effectively binary (0 / 1 / 255) with no real antialiasing,
so thresholding at 128 keeps 100% of the VISIBLE ink and drops only the
invisible halo. We then centre on that visible box, never on the source canvas.
"""
from PIL import Image
import os

# ---- knobs you can tweak -------------------------------------------------
SOURCE = "assets/system/header-logo-cutout.png"  # the canonical logo (2048², clean alpha)
MARGIN = 0.025    # safe margin on the long side, as a fraction of the square (~2-3%)
ALPHA_THR = 128   # pixels with alpha>THR count as visible ink (drops the halo)
VNUDGE = 0.0      # vertical optical nudge, fraction of canvas: +down / -up.
                  # 0 = geometric centre. For THIS logo geometric looks best:
                  # the ink centroid is ~6% low, but the thin branch at the top
                  # counterweights it, so shifting up crowds the branch and
                  # shifting down looks bottom-heavy. Leave at 0 unless the art
                  # changes.
# --------------------------------------------------------------------------

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
img = Image.open(os.path.join(ROOT, SOURCE)).convert("RGBA")

# Trim to the VISIBLE ink box (alpha>THR), not the halo.
mask = img.getchannel("A").point(lambda v: 255 if v > ALPHA_THR else 0)
bbox = mask.getbbox()
logo = img.crop(bbox)
w, h = logo.size

# Square canvas sized so the long edge leaves MARGIN on each side.
side = int(round(max(w, h) / (1 - 2 * MARGIN)))
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
x = (side - w) // 2
y = (side - h) // 2 + int(round(side * VNUDGE))
square.paste(logo, (x, y), logo)

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

print(f"source {SOURCE}")
print(f"visible bbox {bbox}  logo {w}x{h}  square {side}  margin {MARGIN*100:.1f}%  vnudge {VNUDGE*100:+.1f}%")
for f in ("favicon.png", "favicon.ico", "apple-touch-icon.png"):
    p = os.path.join(ROOT, f)
    print(f"  {f}: {os.path.getsize(p)} bytes, {Image.open(p).size}")

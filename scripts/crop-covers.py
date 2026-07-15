#!/usr/bin/env python3
"""
Crop each project cover to the card's aspect with a consistent margin.

The hand-drawn cover scenes are drawn small in the middle of a big white
canvas (subjects fill only ~35% of the canvas height). On the small clothesline
card that reads as "mostly empty". This tightens every cover to the subject's
bounding box + a uniform margin, then squares it to the card's 8/5 aspect
(adding white where needed) so the drawing fills the card at every screen size.

Run:  python3 scripts/crop-covers.py
Then regenerate the dark variants:  python3 scripts/make-dark-covers.py
and bump the ?v= token on the cover <img>s.

Sources are the light *-cover-scene.png (the dark ones are regenerated from
these). Originals are backed up once to backups/cover-pre-crop/.
"""
import os
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
COVER_DIR = os.path.join(HERE, "..", "assets", "cover")
BACKUP_DIR = os.path.join(HERE, "..", "backups", "cover-pre-crop")

NAMES = ["wisdom", "healthcare", "voderrn", "llm"]
CARD_ASPECT = 8 / 5      # the .pc-card-body aspect-ratio
MARGIN_FRAC = 0.09       # side margin as a fraction of the subject width
INK_THRESH = 7           # luminance-of-difference above which a pixel is "ink"


def subject_bbox(im):
    diff = ImageChops.difference(im, Image.new("RGB", im.size, (255, 255, 255)))
    mask = diff.convert("L").point(lambda v: 255 if v > INK_THRESH else 0)
    return mask.getbbox()


def crop_one(name):
    path = os.path.join(COVER_DIR, f"{name}-cover-scene.png")
    im = Image.open(path).convert("RGB")
    x0, y0, x1, y1 = subject_bbox(im)
    bw, bh = x1 - x0, y1 - y0

    # uniform margin around the subject
    m = round(MARGIN_FRAC * bw)
    x0, y0, x1, y1 = x0 - m, y0 - m, x1 + m, y1 + m
    w, h = x1 - x0, y1 - y0

    # square to the card aspect by growing the shorter dimension symmetrically
    if w / h > CARD_ASPECT:          # too wide -> add height (top/bottom)
        newh = w / CARD_ASPECT
        dy = (newh - h) / 2
        y0, y1 = y0 - dy, y1 + dy
    else:                            # too tall -> add width (left/right)
        neww = h * CARD_ASPECT
        dx = (neww - w) / 2
        x0, x1 = x0 - dx, x1 + dx

    x0, y0, x1, y1 = (round(v) for v in (x0, y0, x1, y1))
    out = Image.new("RGB", (x1 - x0, y1 - y0), (255, 255, 255))
    out.paste(im, (-x0, -y0))        # white-pads anything outside the canvas
    out.save(path)
    print(f"{name}: {im.size} -> {out.size} ({out.size[0]/out.size[1]:.2f})")


def main():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    for name in NAMES:
        src = os.path.join(COVER_DIR, f"{name}-cover-scene.png")
        bak = os.path.join(BACKUP_DIR, f"{name}-cover-scene.png")
        if not os.path.exists(bak):
            Image.open(src).save(bak)
        crop_one(name)


if __name__ == "__main__":
    main()

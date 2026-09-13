#!/usr/bin/env python3
"""Voderrn Design screen: three pages × four stages (wireframe → sketch →
grey-box → final), served as opaque frames that project.js cross-dissolves
in a loop (.pj-morph). Also renders an animated WebP preview of that loop.

Sets (source name → output set number):
  Design-N.png   → set 1  (home)
  Design1-N.png  → set 2  (profile)
  Design2-N.png  → set 3  (profile information / settings)

Usage: python3 scripts/mk-design-frames.py [--preview]
  reads  project/voderrn/<source>
  writes assets/project/voderrn-design-<set>-<stage>.(png|jpg)
         (+ previews/voderrn-design-loop.webp with --preview)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path("project/voderrn")
OUT = Path("assets/project")
SETS = {1: "Design-{}.png", 2: "Design1-{}.png", 3: "Design2-{}.png"}
MAX_W = 1100
# the same rhythm as .pj-morph in project.js: hold per stage (final longer), fade between
HOLD, FINAL_HOLD, FADE = 0.8, 1.5, 0.9


def frame(set_no, stage):
    im = Image.open(SRC / SETS[set_no].format(stage)).convert("RGB")
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    if stage < 4:  # drawings / grey-box on paper: flatten speckle to white, PNG
        a = np.array(im).astype(np.float64)
        mn = a.min(-1)
        border = np.concatenate([mn[0], mn[-1], mn[:, 0], mn[:, -1]])
        floor = float(np.median(border))
        ink = (floor - mn) / (floor - 30.0) >= 0.06
        a[~ink] = 255.0
        im = Image.fromarray(a.astype(np.uint8))
        path = OUT / f"voderrn-design-{set_no}-{stage}.png"
        im.save(path, optimize=True)
    else:          # the photographic final: JPEG
        path = OUT / f"voderrn-design-{set_no}-{stage}.jpg"
        im.save(path, quality=88, optimize=True, progressive=True)
    print("wrote", path, im.size, f"{path.stat().st_size // 1024} KB")
    return im


def preview(frames, width=640, fps=12):
    """Cross-dissolve loop as an animated WebP (what the page's JS does)."""
    small = [f.resize((width, round(f.height * width / f.width)), Image.LANCZOS) for f in frames]
    arrs = [np.array(f).astype(np.float64) for f in small]
    seq, durs = [], []
    ms = round(1000 / fps)
    ease = lambda t: t * t * (3 - 2 * t)  # smoothstep
    for i, arr in enumerate(arrs):
        hold = FINAL_HOLD if (i % 4) == 3 else HOLD
        seq.append(Image.fromarray(arr.astype(np.uint8))); durs.append(int(hold * 1000))
        nxt = arrs[(i + 1) % len(arrs)]
        steps = round(FADE * fps)
        for s in range(1, steps + 1):
            t = ease(s / steps)
            seq.append(Image.fromarray((arr * (1 - t) + nxt * t).astype(np.uint8)))
            durs.append(ms)
    out = Path("previews/voderrn-design-loop.webp")
    out.parent.mkdir(exist_ok=True)
    seq[0].save(out, save_all=True, append_images=seq[1:], duration=durs, loop=0, quality=80, method=4)
    print("wrote", out, len(seq), "frames", f"{out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    frames = [frame(s, n) for s in (1, 2, 3) for n in (1, 2, 3, 4)]
    if "--preview" in sys.argv:
        preview(frames)

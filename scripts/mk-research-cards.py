#!/usr/bin/env python3
"""Opaque "sheet" art for the Voderrn Research photo pile.

Unlike mk-project-art.py (transparent drawing on the page), these stay OPAQUE
pieces of paper, because they overlap in a pile and must hide what is under
them. Light twin = the drawing cropped to its hand-drawn frame, white paper
kept. Dark twin = same crop with the paper turned into a dark sheet a shade
above the page (#181818 on #070707) and neutral ink turned cream (#f9f3eb),
colour marks (orange, pink, blue, green) untouched. numpy + PIL only.

Usage: python3 scripts/mk-research-cards.py <source.png> <out-stem>
   -> assets/project/<out-stem>.png and <out-stem>-dark.png
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

CREAM = np.array([249, 243, 235], dtype=np.float64)
DARK_PAPER = np.array([24, 24, 24], dtype=np.float64)
MARGIN = 14      # px of paper kept outside the drawn frame
MAX_W = 1100


def eyes(neutral, chroma, a):
    """Mask of small neutral components (<=1500 px) whose surrounding ring is
    mostly colour — eyes drawn on an orange. Everything else stays False."""
    from collections import deque
    keep = np.zeros_like(neutral)
    seen = np.zeros_like(neutral)
    H, W = neutral.shape
    for sy, sx in zip(*np.where(neutral)):
        if seen[sy, sx]:
            continue
        comp, dq = [], deque([(sy, sx)])
        seen[sy, sx] = True
        big = False
        while dq:
            y, x = dq.popleft()
            if not big:
                comp.append((y, x))
                if len(comp) > 1500:
                    big = True
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < H and 0 <= nx < W and neutral[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        dq.append((ny, nx))
        if big:
            continue
        cy = np.array([p[0] for p in comp]); cx = np.array([p[1] for p in comp])
        by0, by1 = max(cy.min() - 4, 0), min(cy.max() + 5, H)
        bx0, bx1 = max(cx.min() - 4, 0), min(cx.max() + 5, W)
        ring = np.ones((by1 - by0, bx1 - bx0), dtype=bool)
        ring[cy - by0, cx - bx0] = False
        ring &= a[by0:by1, bx0:bx1] > 0.25
        if ring.sum() and chroma[by0:by1, bx0:bx1][ring].mean() > 0.6:
            keep[cy, cx] = True
    return keep


def main(src, stem):
    im = np.array(Image.open(src).convert("RGB")).astype(np.float64)
    mn = im.min(-1)
    border = np.concatenate([mn[0], mn[-1], mn[:, 0], mn[:, -1]])
    floor = float(np.median(border))                       # the paper's white
    a = np.clip((floor - mn) / (floor - 30.0), 0, 1)       # ink coverage
    a[a < 0.06] = 0                                        # paper speckle

    # crop to the drawn frame (+ a little paper), so the sheet edge IS the frame
    ys, xs = np.where(a > 0.3)
    H, W = a.shape
    y0, y1 = max(ys.min() - MARGIN, 0), min(ys.max() + 1 + MARGIN, H)
    x0, x1 = max(xs.min() - MARGIN, 0), min(xs.max() + 1 + MARGIN, W)
    im, a = im[y0:y1, x0:x1], a[y0:y1, x0:x1]

    # paper speckle flattened to pure white: invisible, and the PNG shrinks ~4x
    light = np.where(a[..., None] > 0, im, 255.0)

    # un-premultiply the ink colour off the white paper
    a3 = a[..., None]
    ink = np.where(a3 > 0, np.clip((im - 255.0 * (1 - a3)) / np.maximum(a3, 1e-6), 0, 255), 0)
    sat = ink.max(-1) - ink.min(-1)
    neutral = (a > 0) & (sat < 40)
    chroma = (a > 0.25) & (sat >= 60)
    # small neutral blobs ringed by colour (the orange's eyes) keep their black,
    # same rule as mk-project-art.py
    neutral &= ~eyes(neutral, chroma, a)
    ink[neutral] = CREAM
    ad = a ** 0.55            # faint pencil and pale colour washes read on dark
    dark = DARK_PAPER * (1 - ad[..., None]) + ink * ad[..., None]

    out = Path("assets/project")
    for arr, name in ((light, f"{stem}.png"), (dark, f"{stem}-dark.png")):
        img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        if img.width > MAX_W:
            img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
        img.save(out / name, optimize=True)
        print("wrote", out / name, img.size)
    print(f"floor {floor:.0f}, crop {x0},{y0}-{x1},{y1}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

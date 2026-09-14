#!/usr/bin/env python3
"""Project-page art from a white-paper drawing: transparent LIGHT twin + DARK
twin (neutral ink -> cream, faint grey lifted, colour untouched, small neutral
blobs ringed by colour — eyes — stay black). numpy + PIL only.

Usage: python3 scripts/mk-project-art.py <source.png> <out-stem> [--liftall] [--pastel]
   -> assets/project/<out-stem>.png and <out-stem>-dark.png

--pastel : the drawing's colour is a light wash (pink / pale green) that
           unmixes to a saturated tint at low alpha and reads muddy on black.
           Keep the wash exactly as it looks on paper for the dark twin and
           push its alpha up so it sits ON the dark paper instead of sinking
           into it (Iterations ladybugs).
--nokeep : no black is preserved at all — every neutral stroke and spot goes
           cream on the dark twin (Iterations: ladybug spots + medal star
           outline must read as white lines, per the user 2026-09-14).
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

CREAM = np.array([249, 243, 235], dtype=np.float64)
MAX_W = 1200


def _erode(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out &= np.roll(np.roll(m, dy, 0), dx, 1)
    return out


def _dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out


def _keep_blobs(mask, a, chroma, max_px=1500):
    """Components of `mask` no bigger than max_px whose 4 px ring is mostly colour."""
    keep = np.zeros_like(mask)
    seen = np.zeros_like(mask)
    H, W = mask.shape
    for sy, sx in zip(*np.where(mask)):
        if seen[sy, sx]:
            continue
        comp, dq = [], deque([(sy, sx)])
        seen[sy, sx] = True
        while dq:
            y, x = dq.popleft()
            if len(comp) <= max_px:
                comp.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; dq.append((ny, nx))
        if len(comp) > max_px:
            continue
        cy = np.array([p[0] for p in comp]); cx = np.array([p[1] for p in comp])
        by0, by1, bx0, bx1 = max(cy.min() - 4, 0), min(cy.max() + 5, H), max(cx.min() - 4, 0), min(cx.max() + 5, W)
        ring = np.ones((by1 - by0, bx1 - bx0), dtype=bool)
        ring[cy - by0, cx - bx0] = False
        ring &= a[by0:by1, bx0:bx1] > 0.25
        if not ring.sum() or chroma[by0:by1, bx0:bx1][ring].mean() <= 0.6:
            continue
        # ENCLOSURE: the colour must surround the blob (an eye sits inside a
        # face), not merely touch its ends (a sofa line cut short by two
        # orange bodies is still a line) — chromatic ring pixels have to cover
        # at least 6 of 8 angular sectors around the centroid.
        ry, rx = np.where(ring & chroma[by0:by1, bx0:bx1])
        ang = np.arctan2(ry + by0 - cy.mean(), rx + bx0 - cx.mean())
        sectors = np.unique(((ang + np.pi) / (2 * np.pi) * 8).astype(int) % 8)
        if len(sectors) >= 6:
            keep[cy, cx] = True
    return keep


def main(src, stem, liftall=False, pastel=False, nokeep=False):
    im = np.array(Image.open(src).convert("RGB")).astype(np.float64)
    mn = im.min(-1)
    border = np.concatenate([mn[0], mn[-1], mn[:, 0], mn[:, -1]])
    floor = float(np.median(border))                       # the paper's white
    a = np.clip((floor - mn) / (floor - 30.0), 0, 1)
    a[a < 0.06] = 0                                        # paper speckle
    rgb = np.where(a[..., None] > 0, np.clip((im - 255.0 * (1 - a[..., None])) / np.maximum(a[..., None], 1e-6), 0, 255), 0)
    ys, xs = np.where(a > 0)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    a, rgb = a[y0:y1, x0:x1], rgb[y0:y1, x0:x1]

    sat = rgb.max(-1) - rgb.min(-1)
    neutral = (a > 0) & (sat < 40)
    chroma = (a > 0.25) & (sat >= 60)

    # small neutral blobs ringed by colour (eyes, ladybug spots) keep their black
    keep = _keep_blobs(neutral, a, chroma)
    # ...including solid spots glued to a thin ink line (the spot on a ladybug's
    # seam): erode the solid-dark mask so 3-5 px lines vanish, dilate the
    # surviving cores back, and test those blobs on their own.
    solid = neutral & (a > 0.7) & (rgb.max(-1) < 90)
    cores = _dilate(_erode(solid, 3), 4) & neutral
    keep |= _keep_blobs(cores, a, chroma)
    if nokeep:
        keep[:] = False

    light = np.dstack([rgb, a * 255]).astype(np.uint8)
    d = rgb.copy()
    recolour = neutral & ~keep
    d[recolour] = CREAM
    ad = a.copy()
    lift = recolour if not liftall else (a > 0) & ~keep
    ad[lift] = ad[lift] ** 0.55                            # faint pencil reads on black
    if pastel:
        wash = (a > 0) & (sat >= 40) & ~keep
        # the tint as seen on paper, with a third of the unmixed colour folded
        # back in so a pale pink does not settle into grey on black
        d[wash] = 0.65 * im[y0:y1, x0:x1][wash] + 0.35 * rgb[wash]
        ad[wash] = ad[wash] ** 0.35
    dark = np.dstack([d, ad * 255]).astype(np.uint8)

    out = Path("assets/project")
    for arr, name in ((light, f"{stem}.png"), (dark, f"{stem}-dark.png")):
        img = Image.fromarray(arr, "RGBA")
        if img.width > MAX_W:
            img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
        img.save(out / name)
        print("wrote", out / name, img.size)
    print(f"floor {floor:.0f}, kept-black px {int(keep.sum())}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], "--liftall" in sys.argv, "--pastel" in sys.argv, "--nokeep" in sys.argv)

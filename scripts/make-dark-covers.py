#!/usr/bin/env python3
"""
Generate the DARK-MODE variant of each project cover.

Light covers are hand-drawn scenes: black line-art + an orange bun (with dark
eyes/sunglasses) on white paper. Dark mode wants WHITE line-art on BLACK, with
the orange bun kept AND its eyes/sunglasses left DARK (a plain CSS invert turns
the eyes white, which reads as creepy — this is why we bake a variant instead).

For each  assets/cover/<name>-cover-scene.png  this writes
          assets/cover/<name>-cover-scene-dark.png

Method per image:
  1. invert            -> white lines on black, but orange->blue and eyes->white
  2. restore orange    -> paste the ORIGINAL orange pixels back (exact colour)
  3. dark eyes         -> find dark blobs ENCLOSED inside the orange bun
                          (flood-fill from a corner; seal crayon gaps first so
                          the bun is a solid region and the fill can't leak in)
                          and repaint them dark
  4. floor the near-black background to pure #000 so it blends with the card

Run from anywhere:  python3 scripts/make-dark-covers.py
Then bump the  ?v=  on the -dark.png <img> tags in index.html.

Known limit: a bun seen in a MIRROR REFLECTION that's clipped by the frame isn't
fully enclosed, so its eyes/sunglasses may stay light. Foreground buns are fine.
"""
from PIL import Image, ImageChops, ImageOps, ImageDraw, ImageFilter
from pathlib import Path

COVER_DIR = Path(__file__).resolve().parent.parent / "assets" / "cover"
NAMES = ["healthcare-cover-scene", "voderrn-cover-scene", "wisdom-cover-scene", "llm-cover-scene"]


def masks(im):
    r, g, b = im.split()
    rb = ImageChops.subtract(r, b)  # R-B, clamped >= 0
    orange = ImageChops.multiply(ImageChops.multiply(
        r.point(lambda p: 255 if p > 150 else 0),
        b.point(lambda p: 255 if p < 140 else 0)),
        rb.point(lambda p: 255 if p > 55 else 0))
    dark = ImageChops.multiply(ImageChops.multiply(
        r.point(lambda p: 255 if p < 95 else 0),
        g.point(lambda p: 255 if p < 95 else 0)),
        b.point(lambda p: 255 if p < 95 else 0))
    return orange, dark


def make_dark(im):
    orange, dark = masks(im)
    r, g, b = im.split()
    # a looser "dark-ish" mask (includes anti-aliased edges of the dark shapes,
    # but still excludes orange since orange's R is ~250)
    dark_loose = ImageChops.multiply(ImageChops.multiply(
        r.point(lambda p: 255 if p < 165 else 0),
        g.point(lambda p: 255 if p < 165 else 0)),
        b.point(lambda p: 255 if p < 165 else 0))

    # seal crayon-stroke gaps so the bun is solid (no leak channels for the flood
    # fill), but keep the bigger eye/sunglass holes open
    orange_solid = orange.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
    notorange = ImageChops.invert(orange_solid)
    flood = notorange.copy()
    ImageDraw.floodfill(flood, (0, 0), 128)              # border-connected -> 128
    enclosed = flood.point(lambda p: 255 if p == 255 else 0)   # holes inside the bun
    seed = ImageChops.multiply(dark, enclosed)           # dark bits enclosed by orange

    # grow the seed along CONNECTED dark pixels so a whole feature is captured, not
    # just its enclosed core — e.g. sunglasses = lens fill (enclosed) + frame + temple
    # arms (reach the bun edge, not enclosed). Reconstruction stays inside the dark
    # shape, so it never bleeds into unrelated line-art.
    feat = seed
    for _ in range(45):
        feat = ImageChops.lighter(feat, ImageChops.multiply(
            feat.filter(ImageFilter.MaxFilter(7)), dark))
    # widen once more onto the anti-aliased edge so no white halo rings the shape
    feat = ImageChops.multiply(feat.filter(ImageFilter.MaxFilter(5)), dark_loose)

    out = ImageOps.invert(im)                            # white lines / black bg
    out.paste(im, (0, 0), orange)                        # restore exact orange
    out.paste(Image.new("RGB", im.size, (18, 17, 15)), (0, 0), feat)  # dark eyes/glasses
    # floor near-black bg to pure #000
    r2, g2, b2 = out.split()
    mx = ImageChops.lighter(ImageChops.lighter(r2, g2), b2)
    out = Image.composite(Image.new("RGB", out.size, (0, 0, 0)), out,
                          mx.point(lambda p: 255 if p < 30 else 0))
    return out


def main():
    for name in NAMES:
        src = COVER_DIR / f"{name}.png"
        if not src.exists():
            print("skip (missing):", src.name)
            continue
        make_dark(Image.open(src).convert("RGB")).save(COVER_DIR / f"{name}-dark.png")
        print("wrote", f"{name}-dark.png")


if __name__ == "__main__":
    main()

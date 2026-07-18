#!/usr/bin/env python3
"""Trace the clothesline PNG into a single centreline-stroked SVG path.

The rope's weight must match the lower project rope (.pc-rope), which
clothesline.js draws at a flat `stroke-width: 1.5` in a 1:1 pixel viewBox —
i.e. 1.5 CSS px at every viewport. A traced *fill* cannot do that: its
thickness is baked into the 2172-unit artboard and shrinks with `width: 100vw`
(measured 1.95px native → 1.29px at 1440, 0.35px at 390). So instead of
outlining the ink, take the rope's centreline and re-draw it as a real stroke
with `vector-effect="non-scaling-stroke"`, which ignores the viewBox→viewport
scale and holds STROKE px on screen at any size.

This is only valid because the artwork is a bare rope: every one of the 2172
columns carries a single thin ink run (the clothespins, charms and drawing are
separate DOM elements). If decorations are ever painted back into the PNG, the
per-column centroid below would average across them and this script must go.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/system/clothesline-top.png"
TARGET = ROOT / "assets/system/clothesline-top.svg"

STROKE = 1.0        # match .pc-rope path's stroke-width exactly
COLOR = "#333333"   # match --pc-line (light); dark theme inverts the <img>
EPSILON = 0.08      # px of allowed centreline error when simplifying


def ink_map(image: Image.Image) -> list[list[float]]:
    """Ink strength (0..1) as the drawing appears composited on white."""
    width, height = image.size
    pixels = image.load()
    rows = []
    for y in range(height):
        row = []
        for x in range(width):
            r, g, b, a = pixels[x, y]
            alpha = a / 255.0
            visible = ((r + g + b) / 3.0 / 255.0) * alpha + (1.0 - alpha)
            row.append(1.0 - visible)
        rows.append(row)
    return rows


def centreline(ink: list[list[float]], width: int, height: int) -> list[tuple[float, float]]:
    """Ink-weighted centroid per column — the rope is near-horizontal, so a
    vertical centroid lands on the drawn centre at every x."""
    points = []
    for x in range(width):
        mass = 0.0
        moment = 0.0
        for y in range(height):
            v = ink[y][x]
            if v > 0.02:
                mass += v
                moment += y * v
        if mass < 0.3:
            raise RuntimeError(f"Column {x} has no ink — rope is not continuous")
        points.append((float(x), moment / mass))
    return points


def simplify(points: list[tuple[float, float]], epsilon: float) -> list[tuple[float, float]]:
    """Ramer–Douglas–Peucker. Keeps the hand-drawn wobble (sub-tenth-px
    tolerance) while dropping the per-column noise."""
    if len(points) < 3:
        return points

    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]

    while stack:
        start, end = stack.pop()
        ax, ay = points[start]
        bx, by = points[end]
        dx, dy = bx - ax, by - ay
        norm = (dx * dx + dy * dy) ** 0.5
        worst, index = 0.0, -1
        for i in range(start + 1, end):
            px, py = points[i]
            if norm == 0:
                dist = ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
            else:
                dist = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if dist > worst:
                worst, index = dist, i
        if worst > epsilon and index != -1:
            keep[index] = True
            stack.append((start, index))
            stack.append((index, end))

    return [p for p, k in zip(points, keep) if k]


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    width, height = image.size
    ink = ink_map(image)

    points = centreline(ink, width, height)
    points = simplify(points, EPSILON)

    d = "M" + " L".join(f"{x:.1f} {y:.2f}" for x, y in points)
    svg = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}" role="img" aria-labelledby="title">\n'
        "<title id=\"title\">Hand-drawn clothesline</title>\n"
        f'<path d="{d}" fill="none" stroke="{COLOR}" stroke-width="{STROKE}" '
        'stroke-linecap="round" stroke-linejoin="round" '
        'vector-effect="non-scaling-stroke"/>\n'
        "</svg>\n"
    )
    TARGET.write_text(svg, encoding="utf-8")
    print(
        f"Wrote {TARGET.relative_to(ROOT)} "
        f"({TARGET.stat().st_size:,} bytes, {len(points)} points, stroke {STROKE})"
    )


if __name__ == "__main__":
    main()

"""Remove clearly green chroma spill from extracted RGBA frames."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


GREEN_DOMINANCE_MARGIN = 40


def despill_image(image: Image.Image) -> Image.Image:
    """Return an RGBA copy with transparent and green-spill pixels zeroed."""
    result = image.convert("RGBA")
    cleaned_pixels = []

    for red, green, blue, alpha in result.getdata():
        is_green_spill = (
            green - red >= GREEN_DOMINANCE_MARGIN
            and green - blue >= GREEN_DOMINANCE_MARGIN
        )
        if alpha == 0 or is_green_spill:
            cleaned_pixels.append((0, 0, 0, 0))
        else:
            cleaned_pixels.append((red, green, blue, alpha))

    result.putdata(cleaned_pixels)
    return result


def _process_frames(frames_root: Path) -> None:
    for frame_path in sorted(frames_root.rglob("*.png")):
        with Image.open(frame_path) as source:
            cleaned = despill_image(source)
        cleaned.save(frame_path, format="PNG")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frames-root", required=True, type=Path)
    args = parser.parse_args()
    _process_frames(args.frames_root)


if __name__ == "__main__":
    main()

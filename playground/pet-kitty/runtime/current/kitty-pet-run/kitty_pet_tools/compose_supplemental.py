"""Compose the three supplemental Kitty actions into a fixed lossless atlas."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


ACTION_ORDER = ("rest-side-sleep", "butt-pat-invite", "butt-pat-happy")
CELL_SIZE = (192, 208)
FRAME_COUNT = 6


def _normalized_rgba(source: Image.Image) -> Image.Image:
    image = source.convert("RGBA")
    image.putdata(
        [(0, 0, 0, 0) if alpha == 0 else (red, green, blue, alpha)
         for red, green, blue, alpha in image.getdata()]
    )
    return image


def compose_atlas(frames_root: Path, output: Path) -> None:
    """Write the fixed 6x3 supplemental atlas from action frame directories."""
    atlas = Image.new(
        "RGBA",
        (CELL_SIZE[0] * FRAME_COUNT, CELL_SIZE[1] * len(ACTION_ORDER)),
        (0, 0, 0, 0),
    )

    for row, action in enumerate(ACTION_ORDER):
        frame_paths = sorted((frames_root / action).glob("*.png"))
        if len(frame_paths) != FRAME_COUNT:
            raise ValueError(f"{action} requires exactly 6 PNG frames")
        for column, frame_path in enumerate(frame_paths):
            with Image.open(frame_path) as source:
                if source.size != CELL_SIZE:
                    relative = frame_path.relative_to(frames_root)
                    raise ValueError(f"{relative} must be 192x208")
                frame = _normalized_rgba(source)
            atlas.paste(frame, (column * CELL_SIZE[0], row * CELL_SIZE[1]))

    output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output, format="WEBP", lossless=True, exact=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frames-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    compose_atlas(args.frames_root, args.output)


if __name__ == "__main__":
    main()

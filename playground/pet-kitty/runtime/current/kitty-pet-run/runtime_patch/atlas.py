"""Compose Kitty's approved main and supplemental frames into one Codex atlas."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from .spec import ATLAS_SIZE, CELL_SIZE, ROWS


SUPPLEMENTAL_STATES = (
    "butt-pat-invite",
    "rest-side-sleep",
    "butt-pat-happy",
)


def cell_box(row: int, column: int) -> tuple[int, int, int, int]:
    width, height = CELL_SIZE
    left = column * width
    top = row * height
    return left, top, left + width, top + height


def _load_rgba(path: Path) -> Image.Image:
    with Image.open(path) as source:
        return source.convert("RGBA")


def _normalized_transparency(image: Image.Image) -> Image.Image:
    result = image.convert("RGBA")
    result.putdata(
        [
            (0, 0, 0, 0) if alpha == 0 else (red, green, blue, alpha)
            for red, green, blue, alpha in result.getdata()
        ]
    )
    return result


def _supplemental_frame(frames_root: Path, state: str, column: int) -> Image.Image:
    path = frames_root / state / f"{column:02}.png"
    if not path.exists():
        raise ValueError(f"missing supplemental frame: {state}/{column:02}.png")
    frame = _load_rgba(path)
    if frame.size != CELL_SIZE:
        raise ValueError(
            f"{state}/{column:02}.png must be {CELL_SIZE[0]}x{CELL_SIZE[1]}"
        )
    return _normalized_transparency(frame)


def build_atlas(
    main_atlas: str | Path,
    supplemental_frames: str | Path,
    output: str | Path,
) -> Image.Image:
    main_path = Path(main_atlas)
    frames_root = Path(supplemental_frames)
    output_path = Path(output)
    atlas = _load_rgba(main_path)
    if atlas.size != ATLAS_SIZE:
        raise ValueError(
            f"main atlas must be {ATLAS_SIZE[0]}x{ATLAS_SIZE[1]}, got {atlas.width}x{atlas.height}"
        )

    for state in SUPPLEMENTAL_STATES:
        row = ROWS[state]
        for column in range(6):
            atlas.paste(_supplemental_frame(frames_root, state, column), cell_box(row, column))
        transparent = Image.new("RGBA", CELL_SIZE, (0, 0, 0, 0))
        for column in (6, 7):
            atlas.paste(transparent, cell_box(row, column))

    atlas = _normalized_transparency(atlas)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(
        output_path,
        format="WEBP",
        lossless=True,
        quality=100,
        method=6,
        exact=True,
    )
    return atlas

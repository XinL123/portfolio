"""Render deterministic QA media for Kitty supplemental action frames."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, List

from PIL import Image, ImageDraw

from .compose_supplemental import ACTION_ORDER, CELL_SIZE, FRAME_COUNT


LABEL_HEIGHT = 28
CHECKER_SIZE = 16
DEFAULT_DURATIONS_MS: Dict[str, int] = {
    "rest-side-sleep": 320,
    "butt-pat-invite": 220,
    "butt-pat-happy": 140,
}


def _checkerboard(size: tuple[int, int]) -> Image.Image:
    background = Image.new("RGB", size)
    draw = ImageDraw.Draw(background)
    colors = ((214, 214, 214), (246, 246, 246))
    for y in range(0, size[1], CHECKER_SIZE):
        for x in range(0, size[0], CHECKER_SIZE):
            color = colors[(x // CHECKER_SIZE + y // CHECKER_SIZE) % 2]
            draw.rectangle(
                (x, y, min(x + CHECKER_SIZE - 1, size[0] - 1), min(y + CHECKER_SIZE - 1, size[1] - 1)),
                fill=color,
            )
    return background


def _load_frames(frames_root: Path, action: str) -> List[Image.Image]:
    frame_paths = sorted((frames_root / action).glob("*.png"))
    if len(frame_paths) != FRAME_COUNT:
        raise ValueError(f"{action} requires exactly 6 PNG frames")

    frames: List[Image.Image] = []
    for frame_path in frame_paths:
        with Image.open(frame_path) as source:
            if source.size != CELL_SIZE:
                relative = frame_path.relative_to(frames_root)
                raise ValueError(f"{relative} must be 192x208")
            if source.mode != "RGBA":
                relative = frame_path.relative_to(frames_root)
                raise ValueError(f"{relative} must be RGBA")
            frames.append(source.copy())
    return frames


def _on_checkerboard(frame: Image.Image) -> Image.Image:
    background = _checkerboard(CELL_SIZE)
    background.paste(frame, (0, 0), frame)
    return background


def render_qa_media(frames_root: Path, contact_sheet: Path, preview_dir: Path) -> None:
    """Render a labeled contact sheet and one looping checkerboard GIF per action."""
    frames_by_action = {
        action: _load_frames(frames_root, action) for action in ACTION_ORDER
    }
    row_height = CELL_SIZE[1] + LABEL_HEIGHT
    sheet = Image.new("RGB", (CELL_SIZE[0] * FRAME_COUNT, row_height * len(ACTION_ORDER)))
    draw = ImageDraw.Draw(sheet)

    for row, action in enumerate(ACTION_ORDER):
        row_y = row * row_height
        draw.rectangle((0, row_y, sheet.width, row_y + LABEL_HEIGHT - 1), fill=(35, 35, 38))
        draw.text((8, row_y + 7), action, fill=(255, 255, 255))
        preview_frames = []
        for column, frame in enumerate(frames_by_action[action]):
            rendered = _on_checkerboard(frame)
            sheet.paste(rendered, (column * CELL_SIZE[0], row_y + LABEL_HEIGHT))
            preview_frames.append(rendered)

        preview_dir.mkdir(parents=True, exist_ok=True)
        preview_frames[0].save(
            preview_dir / f"{action}.gif",
            format="GIF",
            save_all=True,
            append_images=preview_frames[1:],
            duration=DEFAULT_DURATIONS_MS[action],
            loop=0,
            disposal=2,
            optimize=False,
        )

    contact_sheet.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(contact_sheet, format="PNG")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frames-root", required=True, type=Path)
    parser.add_argument("--contact-sheet", required=True, type=Path)
    parser.add_argument("--preview-dir", required=True, type=Path)
    args = parser.parse_args()
    render_qa_media(args.frames_root, args.contact_sheet, args.preview_dir)


if __name__ == "__main__":
    main()

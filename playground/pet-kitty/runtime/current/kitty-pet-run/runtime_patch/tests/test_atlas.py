from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from PIL import Image

from runtime_patch.atlas import build_atlas, cell_box
from runtime_patch.spec import ATLAS_SIZE, CELL_SIZE, ROWS


RUN_ROOT = Path(__file__).resolve().parents[2]
MAIN_ATLAS = RUN_ROOT / "final" / "spritesheet.webp"
SUPPLEMENTAL_FRAMES = RUN_ROOT / "supplemental" / "frames"


class KittyAtlasTests(unittest.TestCase):
    def test_replaces_only_supplemental_rows(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory) / "kitty.webp"

            result = build_atlas(MAIN_ATLAS, SUPPLEMENTAL_FRAMES, output)

            self.assertEqual(result.size, ATLAS_SIZE)
            with Image.open(MAIN_ATLAS) as source:
                source = source.convert("RGBA")
                for state in (
                    "idle",
                    "running-right",
                    "running-left",
                    "waving",
                    "sad",
                    "reading",
                ):
                    row = ROWS[state]
                    self.assertEqual(
                        result.crop((0, row * CELL_SIZE[1], ATLAS_SIZE[0], (row + 1) * CELL_SIZE[1])).tobytes(),
                        source.crop((0, row * CELL_SIZE[1], ATLAS_SIZE[0], (row + 1) * CELL_SIZE[1])).tobytes(),
                    )

            for state in ("butt-pat-invite", "rest-side-sleep", "butt-pat-happy"):
                row = ROWS[state]
                for column in range(6):
                    with Image.open(SUPPLEMENTAL_FRAMES / state / f"{column:02}.png") as frame:
                        self.assertEqual(
                            result.crop(cell_box(row, column)).tobytes(),
                            frame.convert("RGBA").tobytes(),
                        )
                for column in (6, 7):
                    self.assertEqual(
                        result.crop(cell_box(row, column)).getbbox(),
                        None,
                    )

            self.assertTrue(output.exists())
            with Image.open(output) as saved:
                self.assertEqual(saved.size, ATLAS_SIZE)
                self.assertEqual(saved.mode, "RGBA")
                residue = sum(
                    1
                    for red, green, blue, alpha in saved.getdata()
                    if alpha == 0 and (red or green or blue)
                )
                self.assertEqual(residue, 0)

    def test_rejects_wrong_supplemental_frame_geometry(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            for state in ("butt-pat-invite", "rest-side-sleep", "butt-pat-happy"):
                state_root = root / state
                state_root.mkdir(parents=True)
                for column in range(6):
                    size = (191, 208) if state == "rest-side-sleep" and column == 2 else CELL_SIZE
                    Image.new("RGBA", size).save(state_root / f"{column:02}.png")

            with self.assertRaisesRegex(ValueError, "rest-side-sleep/02.png.*192x208"):
                build_atlas(MAIN_ATLAS, root, root / "output.webp")


if __name__ == "__main__":
    unittest.main()

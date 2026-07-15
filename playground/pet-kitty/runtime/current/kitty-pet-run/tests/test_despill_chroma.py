from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from kitty_pet_tools.despill_chroma import despill_image


class DespillChromaTests(unittest.TestCase):
    def test_green_dominant_opaque_spill_becomes_zeroed_transparency(self) -> None:
        source = Image.new("RGBA", (2, 1))
        source.putdata([(70, 210, 55, 255), (120, 220, 80, 180)])

        result = despill_image(source)

        self.assertEqual(list(result.getdata()), [(0, 0, 0, 0), (0, 0, 0, 0)])

    def test_neutral_gray_fur_and_amber_eye_pixels_are_unchanged(self) -> None:
        source = Image.new("RGBA", (2, 1))
        source.putdata([(142, 145, 140, 255), (214, 143, 42, 230)])

        result = despill_image(source)

        self.assertEqual(
            list(result.getdata()),
            [(142, 145, 140, 255), (214, 143, 42, 230)],
        )

    def test_existing_transparent_pixels_have_rgb_normalized_to_zero(self) -> None:
        source = Image.new("RGBA", (2, 1))
        source.putdata([(31, 255, 18, 0), (99, 88, 77, 0)])

        result = despill_image(source)

        self.assertEqual(list(result.getdata()), [(0, 0, 0, 0), (0, 0, 0, 0)])

    def test_cli_updates_every_png_frame_deterministically(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            frames_root = Path(temporary_directory) / "frames"
            nested = frames_root / "idle"
            nested.mkdir(parents=True)
            frames = [frames_root / "one.png", nested / "two.png"]
            for frame in frames:
                image = Image.new("RGBA", (2, 1))
                image.putdata([(75, 225, 60, 255), (130, 132, 129, 255)])
                image.save(frame)
            ignored = frames_root / "manifest.json"
            ignored.write_text('{"keep": true}\n')

            command = [
                sys.executable,
                "-m",
                "kitty_pet_tools.despill_chroma",
                "--frames-root",
                str(frames_root),
            ]
            subprocess.run(command, check=True)
            first_bytes = {frame: frame.read_bytes() for frame in frames}

            for frame in frames:
                with Image.open(frame) as result:
                    self.assertEqual(
                        list(result.convert("RGBA").getdata()),
                        [(0, 0, 0, 0), (130, 132, 129, 255)],
                    )

            subprocess.run(command, check=True)

            self.assertEqual(
                {frame: frame.read_bytes() for frame in frames}, first_bytes
            )
            self.assertEqual(ignored.read_text(), '{"keep": true}\n')

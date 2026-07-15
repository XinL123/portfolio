from __future__ import annotations

import json
import plistlib
import tempfile
import unittest
from pathlib import Path

from runtime_patch.cli import install_candidate, restore_install


class InstallTests(unittest.TestCase):
    def test_install_backs_up_both_targets_and_restore_reverses_it(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            app = root / "Codex.app"
            resources = app / "Contents" / "Resources"
            resources.mkdir(parents=True)
            info_path = app / "Contents" / "Info.plist"
            with info_path.open("wb") as stream:
                plistlib.dump(
                    {
                        "ElectronAsarIntegrity": {
                            "Resources/app.asar": {
                                "algorithm": "SHA256",
                                "hash": "old-header",
                            }
                        }
                    },
                    stream,
                )
            (resources / "app.asar").write_bytes(b"old-asar")
            pet_dir = root / "kitty"
            pet_dir.mkdir()
            (pet_dir / "spritesheet.webp").write_bytes(b"old-atlas")
            candidate = root / "candidate.asar"
            candidate.write_bytes(b"new-asar")
            atlas = root / "candidate.webp"
            atlas.write_bytes(b"new-atlas")
            report_path = root / "install-report.json"

            report = install_candidate(
                app,
                candidate,
                atlas,
                pet_dir,
                "new-header",
                report_path,
            )

            self.assertEqual((resources / "app.asar").read_bytes(), b"new-asar")
            self.assertEqual((pet_dir / "spritesheet.webp").read_bytes(), b"new-atlas")
            with info_path.open("rb") as stream:
                info = plistlib.load(stream)
            self.assertEqual(
                info["ElectronAsarIntegrity"]["Resources/app.asar"]["hash"],
                "new-header",
            )
            self.assertTrue(Path(report["backups"]["asar"]).exists())
            self.assertTrue(report_path.exists())

            restore_install(report_path)

            self.assertEqual((resources / "app.asar").read_bytes(), b"old-asar")
            self.assertEqual((pet_dir / "spritesheet.webp").read_bytes(), b"old-atlas")
            with info_path.open("rb") as stream:
                restored = plistlib.load(stream)
            self.assertEqual(
                restored["ElectronAsarIntegrity"]["Resources/app.asar"]["hash"],
                "old-header",
            )


if __name__ == "__main__":
    unittest.main()

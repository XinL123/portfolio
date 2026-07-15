from __future__ import annotations

import unittest
import hashlib
import json
import os
import plistlib
import struct
import tempfile
from pathlib import Path

from runtime_patch.bundle import (
    PatchMismatch,
    patch_main_focus,
    patch_mascot_button,
    patch_overlay_page,
    patch_selection,
    _read_packed_files,
    inspect_app,
    rewrite_asar,
    build_candidate,
    TARGET_PATCHERS,
)


FIXTURES = Path(__file__).with_name("fixtures")


class BundlePlaybackTests(unittest.TestCase):
    def test_shared_avatar_player_is_not_a_patch_target(self) -> None:
        self.assertNotIn(
            "webview/assets/codex-avatar-DgRKzUTv.js", TARGET_PATCHERS
        )


class BundleComponentTests(unittest.TestCase):
    def test_mascot_component_owns_interaction_states(self) -> None:
        source = (FIXTURES / "avatar-mascot-button.js").read_text()

        patched = patch_mascot_button(source)

        for marker in (
            "kitty-main-window-foreground",
            "KITTY_INACTIVITY_MS",
            "KITTY_PERIODIC_SAD_MS",
            "KITTY_DESKTOP_FRAME_TABLE",
            "KITTY_CLICK_MOVE_PX=4",
            "Math.hypot",
            "e.buttons===0",
        ):
            self.assertIn(marker, patched)
        self.assertIn("p===`running`||p===`failed`?p:`idle`", patched)
        self.assertIn(
            "X=d===`running-left`||d===`running-right`?d:null",
            patched,
        )
        self.assertIn("R=X??(v?`waiting`:m?`jumping`", patched)
        self.assertIn("L=()=>{E(!1)", patched)
        self.assertNotIn("L=()=>{T(!1)", patched)
        self.assertNotIn("kitty-pat", patched)
        self.assertIn("onPointerMove:", patched)
        self.assertIn("onPointerUp:", patched)
        self.assertIn("c==null?(0,x.jsx)(h", patched)
        self.assertIn("backgroundImage:`url(${c})`", patched)
        self.assertNotIn("function KITTY_DESKTOP_AVATAR", patched)
        self.assertIn("KITTY_DESKTOP_FRAME_TABLE[R]", patched)
        self.assertIn("ref:Q", patched)
        self.assertIn('"aria-label":s.ariaLabel', patched)
        self.assertNotIn('`aria-label`:s.ariaLabel', patched)

    def test_overlay_click_is_a_noop_instead_of_opening_window(self) -> None:
        for name in ("avatar-overlay-page.js", "avatar-overlay-native-page.js"):
            source = (FIXTURES / name).read_text()
            patched = patch_overlay_page(source)
            self.assertIn("onMascotClick:()=>{}", patched)
            self.assertNotIn("kitty-pat", patched)
            self.assertNotIn("open-current-main-window", patched)
            self.assertIn("running-right", patched)
            self.assertIn("running-left", patched)

    def test_running_and_failed_notifications_remain_until_task_state_changes(self) -> None:
        source = (FIXTURES / "use-avatar-overlay-selection.js").read_text()

        patched = patch_selection(source)

        self.assertIn("case`running`:return null", patched)
        self.assertIn("case`failed`:return null", patched)
        self.assertNotIn("return t+I", patched)
        self.assertNotIn("return t+L", patched)


class BundleForegroundTests(unittest.TestCase):
    def test_main_focus_dispatches_only_to_avatar_overlay_windows(self) -> None:
        source = (FIXTURES / "main-focus.js").read_text()

        patched = patch_main_focus(source)

        self.assertIn("BrowserWindow.getAllWindows", patched)
        self.assertIn("kitty-main-window-foreground", patched)
        self.assertIn("includes(`/avatar-overlay`)", patched)


class BundleArchiveTests(unittest.TestCase):
    def _write_asar(self, path: Path) -> None:
        first = b"alpha"
        second = b"beta"
        header = {
            "files": {
                "one.js": {
                    "size": len(first),
                    "offset": "0",
                    "integrity": {
                        "algorithm": "SHA256",
                        "hash": hashlib.sha256(first).hexdigest(),
                        "blockSize": 4,
                        "blocks": [hashlib.sha256(first[:4]).hexdigest(), hashlib.sha256(first[4:]).hexdigest()],
                    },
                },
                "two.js": {
                    "size": len(second),
                    "offset": str(len(first)),
                    "integrity": {
                        "algorithm": "SHA256",
                        "hash": hashlib.sha256(second).hexdigest(),
                        "blockSize": 4,
                        "blocks": [hashlib.sha256(second).hexdigest()],
                    },
                },
            }
        }
        encoded = json.dumps(header, separators=(",", ":")).encode()
        padding = b"\0" * ((4 - (4 + len(encoded)) % 4) % 4)
        second_pickle = struct.pack("<I", 4 + len(encoded) + len(padding)) + struct.pack("<I", len(encoded)) + encoded + padding
        path.write_bytes(struct.pack("<II", 4, len(second_pickle)) + second_pickle + first + second)

    def test_rewrites_offsets_sizes_and_integrity(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            source = root / "source.asar"
            output = root / "output.asar"
            self._write_asar(source)

            result = rewrite_asar(source, output, {"one.js": b"alpha-expanded"})

            self.assertEqual(result["files"]["one.js"], b"alpha-expanded")
            self.assertEqual(result["files"]["two.js"], b"beta")
            self.assertEqual(
                result["header_hash"],
                hashlib.sha256(result["header_json"]).hexdigest(),
            )

    def test_inspect_app_rejects_wrong_version_before_build(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            app = Path(temporary_directory) / "Codex.app"
            resources = app / "Contents" / "Resources"
            resources.mkdir(parents=True)
            with (app / "Contents" / "Info.plist").open("wb") as stream:
                plistlib.dump(
                    {"CFBundleShortVersionString": "0.0", "CFBundleVersion": "0"},
                    stream,
                )
            (resources / "app.asar").write_bytes(b"not-an-asar")

            with self.assertRaisesRegex(PatchMismatch, "version"):
                inspect_app(app)

    def test_builds_verified_candidate_from_supported_app(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory) / "app.asar.candidate"
            app = Path(os.environ.get("KITTY_TEST_APP", "/Applications/Codex.app"))
            report = build_candidate(app, output)

            self.assertTrue(output.exists())
            self.assertEqual(report["target_count"], 6)
            self.assertEqual(len(report["header_hash"]), 64)
            self.assertEqual(len(report["asar_sha256"]), 64)
            self.assertIn("KITTY_DESKTOP_FRAME_TABLE", report["markers"])
            self.assertIn("Reading", report["markers"])


if __name__ == "__main__":
    unittest.main()

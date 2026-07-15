from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from kitty_pet_tools.compose_supplemental import (
    ACTION_ORDER,
    CELL_SIZE,
    compose_atlas,
)
from kitty_pet_tools.validate_interactions import validate_files
from kitty_pet_tools.render_supplemental_qa import (
    LABEL_HEIGHT,
    render_qa_media,
)


class SupplementalComposerTests(unittest.TestCase):
    def _make_frames(self, root: Path) -> dict[str, tuple[int, int, int, int]]:
        colors = {
            "rest-side-sleep": (220, 20, 30, 255),
            "butt-pat-invite": (20, 210, 40, 255),
            "butt-pat-happy": (30, 40, 220, 255),
        }
        for action, color in colors.items():
            action_root = root / action
            action_root.mkdir(parents=True)
            for frame in range(6):
                image = Image.new("RGBA", CELL_SIZE, color)
                image.putpixel((0, 0), (91, 82, 73, 0))
                image.save(action_root / f"{frame:02}.png")
        return colors

    def test_composes_lossless_transparent_atlas_in_fixed_action_rows(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            colors = self._make_frames(root / "frames")
            output = root / "supplemental-actions.webp"

            compose_atlas(root / "frames", output)

            with Image.open(output) as atlas:
                self.assertEqual(atlas.size, (1152, 624))
                self.assertEqual(atlas.mode, "RGBA")
                for row, action in enumerate(ACTION_ORDER):
                    self.assertEqual(atlas.getpixel((96, row * 208 + 104)), colors[action])
                self.assertEqual(atlas.getpixel((0, 0)), (0, 0, 0, 0))

    def test_requires_exactly_six_frames_for_each_action(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._make_frames(root)
            (root / "butt-pat-invite" / "05.png").unlink()

            with self.assertRaisesRegex(ValueError, "butt-pat-invite.*exactly 6"):
                compose_atlas(root, root / "atlas.webp")

    def test_requires_every_frame_to_be_192_by_208(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._make_frames(root)
            Image.new("RGBA", (191, 208)).save(root / "rest-side-sleep" / "03.png")

            with self.assertRaisesRegex(ValueError, "rest-side-sleep/03.png.*192x208"):
                compose_atlas(root, root / "atlas.webp")


class InteractionValidatorTests(unittest.TestCase):
    def _valid_documents(self) -> tuple[dict, dict]:
        actions = {
            "atlas": {
                "path": "supplemental-actions.webp",
                "columns": 6,
                "rows": 3,
                "cellWidth": 192,
                "cellHeight": 208,
            },
            "actions": [
                {
                    "id": action,
                    "row": row,
                    "frames": 6,
                    "frameDurationMs": duration,
                }
                for row, (action, duration) in enumerate(
                    zip(ACTION_ORDER, (320, 220, 140))
                )
            ],
        }
        interactions = {
            "priority": ["task", "interaction", "idle"],
            "idle": {
                "selection": "random",
                "variants": ["main:idle", "extra:rest-side-sleep"],
                "occasional": {"action": "extra:butt-pat-invite"},
            },
            "interactions": [
                {
                    "id": "buttPat",
                    "trigger": "double-click",
                    "hitRegion": {"x": 0.5, "y": 0.35, "width": 0.5, "height": 0.65},
                    "offerAction": "extra:butt-pat-invite",
                    "responseAction": "extra:butt-pat-happy",
                    "returnTo": "previous-idle",
                }
            ],
            "fallbackNote": "Requires a compatible runtime; otherwise use main idle.",
        }
        return actions, interactions

    def _write_documents(self, root: Path, actions: dict, interactions: dict) -> tuple[Path, Path, Path]:
        actions_path = root / "actions.json"
        interactions_path = root / "interactions.json"
        atlas_path = root / "supplemental-actions.webp"
        actions_path.write_text(json.dumps(actions))
        interactions_path.write_text(json.dumps(interactions))
        Image.new("RGBA", (1152, 624), (0, 0, 0, 0)).save(
            atlas_path, format="WEBP", lossless=True
        )
        return actions_path, interactions_path, atlas_path

    def test_accepts_complete_action_and_interaction_contract(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            paths = self._write_documents(root, *self._valid_documents())

            self.assertEqual(validate_files(*paths), [])

    def test_rejects_wrong_action_ids_duplicate_rows_or_frame_counts(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            actions, interactions = self._valid_documents()
            actions["actions"][0]["id"] = "nap"
            actions["actions"][1]["row"] = 0
            actions["actions"][2]["frames"] = 5
            paths = self._write_documents(root, actions, interactions)

            errors = validate_files(*paths)

            self.assertTrue(any("action IDs" in error for error in errors))
            self.assertTrue(any("rows" in error for error in errors))
            self.assertTrue(any("6 frames" in error for error in errors))

    def test_rejects_permuted_action_rows_or_wrong_durations(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            actions, interactions = self._valid_documents()
            actions["actions"][0]["row"] = 1
            actions["actions"][1]["row"] = 0
            actions["actions"][2]["frameDurationMs"] = 141
            paths = self._write_documents(root, actions, interactions)

            errors = validate_files(*paths)

            self.assertTrue(any("exact action mapping" in error for error in errors))

    def test_rejects_invalid_atlas_manifest_or_image_geometry(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            actions, interactions = self._valid_documents()
            actions["atlas"]["columns"] = 5
            paths = self._write_documents(root, actions, interactions)
            Image.new("RGBA", (1151, 624)).save(paths[2], format="WEBP", lossless=True)

            errors = validate_files(*paths)

            self.assertTrue(any("6 columns" in error for error in errors))
            self.assertTrue(any("1152x624" in error for error in errors))

    def test_rejects_bad_priority_idle_variants_or_fallback(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            actions, interactions = self._valid_documents()
            interactions["priority"] = ["idle", "interaction", "task"]
            interactions["idle"]["selection"] = "first"
            interactions["idle"]["variants"] = ["main:idle"]
            interactions["fallbackNote"] = ""
            paths = self._write_documents(root, actions, interactions)

            errors = validate_files(*paths)

            self.assertTrue(any("priority" in error for error in errors))
            self.assertTrue(any("random" in error for error in errors))
            self.assertTrue(any("idle variants" in error for error in errors))
            self.assertTrue(any("fallback" in error for error in errors))

    def test_rejects_bad_butt_pat_trigger_region_refs_or_return(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            actions, interactions = self._valid_documents()
            butt_pat = interactions["interactions"][0]
            butt_pat["trigger"] = "click"
            butt_pat["hitRegion"] = {"x": 0.49, "y": -0.1, "width": 0.6, "height": 1.2}
            butt_pat["offerAction"] = "extra:missing"
            butt_pat["responseAction"] = "main:idle"
            butt_pat["returnTo"] = "idle"
            paths = self._write_documents(root, actions, interactions)

            errors = validate_files(*paths)

            self.assertTrue(any("double-click" in error for error in errors))
            self.assertTrue(any("rear-only" in error for error in errors))
            self.assertTrue(any("normalized bounds" in error for error in errors))
            self.assertTrue(any("offerAction" in error for error in errors))
            self.assertTrue(any("responseAction" in error for error in errors))
            self.assertTrue(any("previous-idle" in error for error in errors))

    def test_rejects_non_exact_butt_pat_hit_region_within_bounds(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            actions, interactions = self._valid_documents()
            interactions["interactions"][0]["hitRegion"] = {
                "x": 0.5,
                "y": 0.2,
                "width": 0.5,
                "height": 0.8,
            }
            paths = self._write_documents(root, actions, interactions)

            errors = validate_files(*paths)

            self.assertTrue(any("exactly x=0.5, y=0.35" in error for error in errors))

    def test_requires_invite_offer_and_happy_response_actions(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            actions, interactions = self._valid_documents()
            butt_pat = interactions["interactions"][0]
            butt_pat["offerAction"] = "extra:rest-side-sleep"
            butt_pat["responseAction"] = "extra:butt-pat-invite"
            paths = self._write_documents(root, actions, interactions)

            errors = validate_files(*paths)

            self.assertTrue(any("offerAction" in error for error in errors))
            self.assertTrue(any("responseAction" in error for error in errors))


class SupplementalQaRendererTests(unittest.TestCase):
    def _make_frames(self, root: Path) -> None:
        for row, action in enumerate(ACTION_ORDER):
            action_root = root / action
            action_root.mkdir(parents=True)
            for frame in range(6):
                image = Image.new("RGBA", CELL_SIZE, (30 + row * 60, 80, 120, 0))
                image.paste(
                    (200, 40 + frame * 10, 50 + row * 30, 255),
                    (48, 40, 144, 168),
                )
                image.save(action_root / f"{frame:02}.png")

    def test_renders_labeled_checkerboard_contact_sheet_and_three_gifs(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            frames_root = root / "frames"
            self._make_frames(frames_root)
            contact_sheet = root / "qa" / "contact-sheet.png"
            preview_dir = root / "qa" / "previews"

            render_qa_media(frames_root, contact_sheet, preview_dir)

            self.assertTrue(contact_sheet.stat().st_size > 0)
            with Image.open(contact_sheet) as sheet:
                self.assertEqual(
                    sheet.size,
                    (CELL_SIZE[0] * 6, (CELL_SIZE[1] + LABEL_HEIGHT) * 3),
                )
                self.assertNotEqual(sheet.getpixel((2, LABEL_HEIGHT + 2)), sheet.getpixel((18, LABEL_HEIGHT + 2)))
            gif_names = sorted(path.name for path in preview_dir.glob("*.gif"))
            self.assertEqual(
                gif_names,
                ["butt-pat-happy.gif", "butt-pat-invite.gif", "rest-side-sleep.gif"],
            )
            for action, expected_duration in {
                "rest-side-sleep": 320,
                "butt-pat-invite": 220,
                "butt-pat-happy": 140,
            }.items():
                path = preview_dir / f"{action}.gif"
                self.assertTrue(path.stat().st_size > 0)
                with Image.open(path) as preview:
                    self.assertEqual(preview.size, CELL_SIZE)
                    self.assertEqual(preview.n_frames, 6)
                    self.assertEqual(preview.info["duration"], expected_duration)
                    self.assertEqual(preview.info["loop"], 0)

    def test_rejects_action_with_missing_frame(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._make_frames(root)
            (root / "butt-pat-happy" / "05.png").unlink()

            with self.assertRaisesRegex(ValueError, "butt-pat-happy.*exactly 6"):
                render_qa_media(root, root / "sheet.png", root / "previews")


if __name__ == "__main__":
    unittest.main()

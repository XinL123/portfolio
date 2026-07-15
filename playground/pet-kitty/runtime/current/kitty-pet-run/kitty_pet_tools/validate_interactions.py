"""Validate Kitty supplemental action and interaction manifests."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from PIL import Image

from .compose_supplemental import ACTION_ORDER


def _load(path: Path) -> Dict[str, Any]:
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def validate_files(actions_path: Path, interactions_path: Path, atlas_path: Path) -> List[str]:
    """Return human-readable contract violations, or an empty list when valid."""
    actions_document = _load(actions_path)
    interaction_document = _load(interactions_path)
    errors: List[str] = []

    atlas = actions_document.get("atlas", {})
    if atlas.get("path") != "supplemental-actions.webp":
        errors.append("atlas path must be supplemental-actions.webp")
    if atlas.get("columns") != 6:
        errors.append("atlas must declare 6 columns")
    if atlas.get("rows") != 3:
        errors.append("atlas must declare 3 rows")
    if (atlas.get("cellWidth"), atlas.get("cellHeight")) != (192, 208):
        errors.append("atlas cells must be 192x208")

    action_entries = actions_document.get("actions", [])
    action_ids = [entry.get("id") for entry in action_entries]
    if len(action_entries) != 3 or set(action_ids) != set(ACTION_ORDER):
        errors.append("action IDs must be exactly rest-side-sleep, butt-pat-invite, butt-pat-happy")
    rows = [entry.get("row") for entry in action_entries]
    if sorted(rows) != [0, 1, 2] or len(set(rows)) != len(rows):
        errors.append("action rows must be unique and exactly 0, 1, 2")
    if any(entry.get("frames") != 6 for entry in action_entries):
        errors.append("every action must declare 6 frames")
    expected_actions = {
        "rest-side-sleep": {"row": 0, "frames": 6, "frameDurationMs": 320},
        "butt-pat-invite": {"row": 1, "frames": 6, "frameDurationMs": 220},
        "butt-pat-happy": {"row": 2, "frames": 6, "frameDurationMs": 140},
    }
    actual_actions = {
        entry.get("id"): {
            "row": entry.get("row"),
            "frames": entry.get("frames"),
            "frameDurationMs": entry.get("frameDurationMs"),
        }
        for entry in action_entries
    }
    if actual_actions != expected_actions:
        errors.append("actions must use the exact action mapping, rows, frame counts, and durations")

    try:
        with Image.open(atlas_path) as atlas_image:
            if atlas_image.size != (1152, 624):
                errors.append("atlas image must be 1152x624")
    except (FileNotFoundError, OSError):
        errors.append("atlas image must exist and be readable")

    if interaction_document.get("priority") != ["task", "interaction", "idle"]:
        errors.append("priority must be task, interaction, idle")
    idle = interaction_document.get("idle", {})
    if idle.get("selection") != "random":
        errors.append("idle selection must be random")
    if set(idle.get("variants", [])) != {"main:idle", "extra:rest-side-sleep"}:
        errors.append("idle variants must be main:idle and extra:rest-side-sleep")
    if idle.get("occasional", {}).get("action") != "extra:butt-pat-invite":
        errors.append("idle must occasionally offer extra:butt-pat-invite")
    fallback = interaction_document.get("fallbackNote")
    if not isinstance(fallback, str) or "compatible runtime" not in fallback.lower():
        errors.append("fallback note must require a compatible runtime")

    interaction_entries = interaction_document.get("interactions", [])
    butt_pat = next(
        (entry for entry in interaction_entries if entry.get("id") == "buttPat"),
        {},
    )
    if butt_pat.get("trigger") != "double-click":
        errors.append("buttPat trigger must be double-click")
    region = butt_pat.get("hitRegion", {})
    expected_region = {"x": 0.5, "y": 0.35, "width": 0.5, "height": 0.65}
    if region != expected_region:
        errors.append(
            "buttPat hitRegion must be exactly x=0.5, y=0.35, width=0.5, height=0.65"
        )
    x = region.get("x")
    y = region.get("y")
    width = region.get("width")
    height = region.get("height")
    numeric = all(isinstance(value, (int, float)) for value in (x, y, width, height))
    if not numeric or x < 0.5:
        errors.append("buttPat hitRegion must be rear-only with x >= 0.5")
    if not numeric or min(x, y, width, height) < 0 or x + width > 1 or y + height > 1:
        errors.append("buttPat hitRegion must remain within normalized bounds")

    if butt_pat.get("offerAction") != "extra:butt-pat-invite":
        errors.append("buttPat offerAction must reference extra:butt-pat-invite")
    if butt_pat.get("responseAction") != "extra:butt-pat-happy":
        errors.append("buttPat responseAction must reference extra:butt-pat-happy")
    if butt_pat.get("returnTo") != "previous-idle":
        errors.append("buttPat must return to previous-idle")

    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--actions", required=True, type=Path)
    parser.add_argument("--interactions", required=True, type=Path)
    parser.add_argument("--atlas", required=True, type=Path)
    args = parser.parse_args()
    errors = validate_files(args.actions, args.interactions, args.atlas)
    if errors:
        raise SystemExit("\n".join(errors))
    print("supplemental interaction contract is valid")


if __name__ == "__main__":
    main()

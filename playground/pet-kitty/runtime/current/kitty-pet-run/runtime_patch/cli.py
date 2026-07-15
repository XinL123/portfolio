"""Command-line build, install, and restore workflow for Kitty's Codex patch."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import plistlib
import shutil
from datetime import datetime, timezone
from pathlib import Path

from .atlas import build_atlas
from .bundle import build_candidate


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _atomic_copy(source: Path, target: Path) -> None:
    temporary = target.with_name(f".{target.name}.kitty-patch.tmp")
    shutil.copy2(source, temporary)
    os.replace(temporary, target)


def _write_plist(path: Path, document: dict) -> None:
    temporary = path.with_name(f".{path.name}.kitty-patch.tmp")
    with temporary.open("wb") as stream:
        plistlib.dump(document, stream, fmt=plistlib.FMT_BINARY)
    os.replace(temporary, path)


def install_candidate(
    app_path: str | Path,
    candidate_asar: str | Path,
    candidate_atlas: str | Path,
    pet_dir: str | Path,
    header_hash: str,
    report_path: str | Path,
) -> dict:
    app = Path(app_path)
    asar_target = app / "Contents" / "Resources" / "app.asar"
    info_target = app / "Contents" / "Info.plist"
    atlas_target = Path(pet_dir) / "spritesheet.webp"
    candidate_asar = Path(candidate_asar)
    candidate_atlas = Path(candidate_atlas)
    report_path = Path(report_path)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_root = report_path.parent / "backups" / timestamp
    backup_root.mkdir(parents=True, exist_ok=False)
    backups = {
        "asar": backup_root / "app.asar",
        "info_plist": backup_root / "Info.plist",
        "atlas": backup_root / "spritesheet.webp",
    }
    shutil.copy2(asar_target, backups["asar"])
    shutil.copy2(info_target, backups["info_plist"])
    shutil.copy2(atlas_target, backups["atlas"])

    try:
        with info_target.open("rb") as stream:
            info = plistlib.load(stream)
        integrity = info.setdefault("ElectronAsarIntegrity", {}).setdefault(
            "Resources/app.asar", {}
        )
        integrity["algorithm"] = "SHA256"
        integrity["hash"] = header_hash
        _atomic_copy(candidate_asar, asar_target)
        _write_plist(info_target, info)
        _atomic_copy(candidate_atlas, atlas_target)
    except Exception:
        _atomic_copy(backups["asar"], asar_target)
        _atomic_copy(backups["info_plist"], info_target)
        _atomic_copy(backups["atlas"], atlas_target)
        raise

    report = {
        "installed_at": timestamp,
        "targets": {
            "asar": str(asar_target),
            "info_plist": str(info_target),
            "atlas": str(atlas_target),
        },
        "backups": {key: str(path) for key, path in backups.items()},
        "installed": {
            "asar_sha256": _sha256(asar_target),
            "atlas_sha256": _sha256(atlas_target),
            "header_hash": header_hash,
        },
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    return report


def restore_install(report_path: str | Path) -> dict:
    report_path = Path(report_path)
    report = json.loads(report_path.read_text())
    for key in ("asar", "info_plist", "atlas"):
        _atomic_copy(Path(report["backups"][key]), Path(report["targets"][key]))
    report["restored_at"] = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    return report


def build_outputs(app: Path, output: Path) -> dict:
    run_root = Path(__file__).resolve().parents[1]
    output.mkdir(parents=True, exist_ok=True)
    candidate_asar = output / "app.asar.candidate"
    candidate_atlas = output / "kitty-spritesheet.webp"
    bundle_report = build_candidate(app, candidate_asar)
    build_atlas(
        run_root / "final" / "spritesheet.webp",
        run_root / "supplemental" / "frames",
        candidate_atlas,
    )
    report = {
        **bundle_report,
        "atlas": str(candidate_atlas.resolve()),
        "atlas_sha256": _sha256(candidate_atlas),
    }
    (output / "build-report.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    build_parser = subparsers.add_parser("build")
    build_parser.add_argument("--app", default="/Applications/Codex.app")
    build_parser.add_argument("--output", required=True)
    install_parser = subparsers.add_parser("install")
    install_parser.add_argument("--app", default="/Applications/Codex.app")
    install_parser.add_argument("--candidate-asar", required=True)
    install_parser.add_argument("--candidate-atlas", required=True)
    install_parser.add_argument("--pet-dir", required=True)
    install_parser.add_argument("--build-report", required=True)
    install_parser.add_argument("--install-report", required=True)
    restore_parser = subparsers.add_parser("restore")
    restore_parser.add_argument("--install-report", required=True)
    args = parser.parse_args()

    if args.command == "build":
        report = build_outputs(Path(args.app), Path(args.output))
    elif args.command == "install":
        build_report = json.loads(Path(args.build_report).read_text())
        report = install_candidate(
            args.app,
            args.candidate_asar,
            args.candidate_atlas,
            args.pet_dir,
            build_report["header_hash"],
            args.install_report,
        )
    else:
        report = restore_install(args.install_report)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

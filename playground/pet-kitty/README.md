# Kitty Codex Pet Core Resources

This folder keeps only the current useful Kitty Codex desktop pet resources.

## Current source of truth

- `runtime/current/kitty-pet-run/`
  - Current Kitty pet project.
  - Runtime patch code: `runtime/current/kitty-pet-run/runtime_patch/`
  - Final spritesheet: `runtime/current/kitty-pet-run/final/spritesheet.webp`
  - Canonical references: `runtime/current/kitty-pet-run/references/`
  - Supplemental actions: `runtime/current/kitty-pet-run/supplemental/`
  - QA previews and contact sheet: `runtime/current/kitty-pet-run/qa/`

## Installed pet snapshot

- `installed-pet-snapshot/kitty/`
  - Snapshot copied from the live `~/.codex/pets/kitty` package.
  - The live installed pet was not moved during cleanup.

## Current runtime install backup

- `install-artifacts/current-runtime-install/install-report.json`
  - Install report for the current runtime patch.
- `install-artifacts/current-runtime-install/backups/`
  - Rollback backup created before installing the current patch.
  - Keep this until the restarted Codex app is confirmed healthy.

## Removed during cleanup

- Legacy duplicate project copies.
- Old install attempts and obsolete backup folders.
- Old `app.asar.candidate` build outputs.
- Extracted `frames/` and `decoded/` intermediates.
- Demo app leftovers: `src/`, `public/`, `docs/`, `dist/`, package files.
- Cache files: `__pycache__`, `.pyc`, `.DS_Store`.

## Current runtime behavior note

The current installed patch makes the Codex working state persistent again:

- internal Codex state `running` = Kitty `reading`
- `running` and `failed` notification lifetimes are patched to persist until the task state changes
- shared `codex-avatar` was not modified by the current patch

#!/usr/bin/env bash
#
# Compress the "What I like" thumbnails for the web.
#
# The images display at ~96x64, so the full-resolution originals (several MB each)
# are wildly oversized. This resizes them to a crisp web size and re-encodes the
# JPEG, using macOS's built-in `sips` (no dependencies).
#
# Originals are copied to <dir>/original-upload/ before anything is touched, and a
# file is skipped if a backup already exists — so re-running only processes newly
# added images and never double-compresses.
#
# Usage:  bash scripts/compress-images.sh
#
set -euo pipefail

DIR="assets/home/what i like"
BACKUP="$DIR/original-upload"
MAX_EDGE=1000   # longest side in px — stays sharp well beyond the 96x64 display size
QUALITY=82      # JPEG quality

mkdir -p "$BACKUP"

shopt -s nullglob nocaseglob
total_before=0
total_after=0

for img in "$DIR"/*.jpg "$DIR"/*.jpeg; do
  name="$(basename "$img")"

  if [ -f "$BACKUP/$name" ]; then
    echo "skip   $name (already compressed)"
    continue
  fi

  cp "$img" "$BACKUP/$name"
  before=$(stat -f%z "$img")
  sips -Z "$MAX_EDGE" -s format jpeg -s formatOptions "$QUALITY" "$img" --out "$img" >/dev/null
  after=$(stat -f%z "$img")

  total_before=$((total_before + before))
  total_after=$((total_after + after))
  printf "ok     %-18s %6d KB -> %5d KB\n" "$name" $((before / 1024)) $((after / 1024))
done

if [ "$total_before" -gt 0 ]; then
  printf "\nTotal: %d KB -> %d KB\n" $((total_before / 1024)) $((total_after / 1024))
fi
echo "Originals backed up in: $BACKUP"

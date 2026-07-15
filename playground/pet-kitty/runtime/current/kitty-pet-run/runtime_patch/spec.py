"""Pinned contract for the supported Codex build and Kitty atlas."""

SUPPORTED_VERSION = "26.623.141536"
SUPPORTED_BUILD = "4753"
SUPPORTED_ASAR_SHA256 = (
    "9169abf7427f8ceb2dab527f489a76f6e419e2602faa9b3b8a1b4e2c526fc537"
)

ATLAS_SIZE = (1536, 1872)
CELL_SIZE = (192, 208)
ROWS = {
    "idle": 0,
    "running-right": 1,
    "running-left": 2,
    "waving": 3,
    "butt-pat-invite": 4,
    "sad": 5,
    "rest-side-sleep": 6,
    "reading": 7,
    "butt-pat-happy": 8,
}

READING_CYCLE_MS = 3_000
INACTIVITY_MS = 180_000
FOREGROUND_COOLDOWN_MS = 10_000
PERIODIC_SAD_MS = 1_500_000

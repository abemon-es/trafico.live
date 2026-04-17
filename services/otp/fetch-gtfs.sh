#!/usr/bin/env bash
# Collect GTFS ZIP feeds from collector task data directories into a
# staging directory before the OTP graph build.
#
# Usage:
#   ./fetch-gtfs.sh [staging_dir]
#
# Default staging_dir: /var/otp/graphs/iberia/gtfs
#
# Sources:
#   services/collector/tasks/transit-gtfs/data/*.zip
#   services/collector/tasks/ferry-gtfs/data/*.zip
#   services/collector/tasks/renfe-gtfs/data/*.zip
#
# Corrupt ZIPs (unzip -t fails) are skipped with a warning.
# The script is idempotent — safe to re-run; existing valid files are
# overwritten with the latest copy.

set -euo pipefail

STAGING="${1:-/var/otp/graphs/iberia/gtfs}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

SOURCES=(
  "$REPO_ROOT/services/collector/tasks/transit-gtfs/data"
  "$REPO_ROOT/services/collector/tasks/ferry-gtfs/data"
  "$REPO_ROOT/services/collector/tasks/renfe-gtfs/data"
)

mkdir -p "$STAGING"

copied=0
skipped=0

for src_dir in "${SOURCES[@]}"; do
  if [[ ! -d "$src_dir" ]]; then
    echo "[fetch-gtfs] WARN: source dir not found, skipping: $src_dir"
    continue
  fi

  shopt -s nullglob
  for zip in "$src_dir"/*.zip; do
    name="$(basename "$zip")"

    # Validate the ZIP before accepting it.
    if ! unzip -t "$zip" > /dev/null 2>&1; then
      echo "[fetch-gtfs] WARN: corrupt ZIP, skipping: $zip"
      (( skipped++ )) || true
      continue
    fi

    dest="$STAGING/$name"

    # Use rsync when available for atomic copy; fall back to cp.
    if command -v rsync &> /dev/null; then
      rsync -a --checksum "$zip" "$dest"
    else
      cp -f "$zip" "$dest"
    fi

    echo "[fetch-gtfs] staged: $name"
    (( copied++ )) || true
  done
  shopt -u nullglob
done

echo "[fetch-gtfs] done: $copied staged, $skipped skipped (corrupt)."
echo "[fetch-gtfs] staging dir: $STAGING"

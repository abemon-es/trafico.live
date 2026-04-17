#!/usr/bin/env bash
# Build the OTP2 Iberia routing graph from OSM PBF + GTFS feeds.
#
# Usage:
#   ./build-graph.sh [pbf_path] [graph_dir]
#
# Defaults:
#   pbf_path  = /opt/trafico/tiles/build/iberia.osm.pbf
#   graph_dir = /var/otp/graphs/iberia
#
# Workflow:
#   1. Validate PBF exists.
#   2. Run fetch-gtfs.sh to stage GTFS feeds into graph_dir/gtfs/.
#   3. Build graph in a temporary directory (graph_dir.tmp).
#   4. Atomic rename: graph_dir.tmp → graph_dir  (hot-swap, zero downtime).
#
# After a successful build you must reload or restart the OTP container:
#   docker restart trafico-otp
#
# Runtime: ~30-45 min, ~12-16 GB RAM peak.
# Log:     /var/log/otp-build.log  (via crontab)
#
# Idempotent: re-running rebuilds from scratch (tmp dir is cleaned first).

set -euo pipefail

PBF="${1:-/opt/trafico/tiles/build/iberia.osm.pbf}"
GRAPH_DIR="${2:-/var/otp/graphs/iberia}"
TMP_DIR="${GRAPH_DIR}.tmp"
OTP_IMAGE="opentripplanner/opentripplanner:latest"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[otp-build] started at $(date -Iseconds)"

# --- 1. Validate inputs ---------------------------------------------------

if [[ ! -f "$PBF" ]]; then
  echo "[otp-build] ERROR: OSM PBF not found at $PBF" >&2
  echo "[otp-build] Hint: the OSRM build-graph.sh downloads iberia.osm.pbf to the same path" >&2
  exit 1
fi

echo "[otp-build] PBF: $PBF ($(du -sh "$PBF" | cut -f1))"

# --- 2. Prepare tmp build directory ---------------------------------------

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR/gtfs"

# Copy router and build configs into the tmp dir so OTP finds them.
cp -f "$SCRIPT_DIR/config/router-config.json" "$TMP_DIR/router-config.json"
cp -f "$SCRIPT_DIR/config/build-config.json"  "$TMP_DIR/build-config.json"

# --- 3. Stage GTFS feeds --------------------------------------------------

echo "[otp-build] staging GTFS feeds..."
bash "$SCRIPT_DIR/fetch-gtfs.sh" "$TMP_DIR/gtfs"

gtfs_count="$(find "$TMP_DIR/gtfs" -name '*.zip' | wc -l | tr -d ' ')"
echo "[otp-build] $gtfs_count GTFS feeds staged"

# --- 4. Build graph -------------------------------------------------------

echo "[otp-build] starting OTP graph build (this takes 30-45 min)..."

docker run --rm \
  -v "$TMP_DIR":/var/otp/graphs/iberia \
  -v "$(dirname "$PBF")":/data/osm:ro \
  --memory="13g" \
  --cpus="4" \
  "$OTP_IMAGE" \
  java -Xmx12G -jar /opt/opentrip-planner.jar \
    --build --save /var/otp/graphs/iberia

if [[ ! -f "$TMP_DIR/graph.obj" ]]; then
  echo "[otp-build] ERROR: graph.obj not found after build — OTP may have crashed" >&2
  exit 1
fi

echo "[otp-build] graph.obj size: $(du -sh "$TMP_DIR/graph.obj" | cut -f1)"

# --- 5. Atomic hot-swap ---------------------------------------------------

# Backup the previous graph directory (one generation kept).
if [[ -d "$GRAPH_DIR" ]]; then
  rm -rf "${GRAPH_DIR}.old"
  mv "$GRAPH_DIR" "${GRAPH_DIR}.old"
fi

mv "$TMP_DIR" "$GRAPH_DIR"

echo "[otp-build] hot-swap complete: $TMP_DIR → $GRAPH_DIR"
echo "[otp-build] finished at $(date -Iseconds)"
echo ""
echo "[otp-build] Reload OTP container to pick up the new graph:"
echo "  docker restart trafico-otp"

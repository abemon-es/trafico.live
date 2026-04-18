#!/usr/bin/env bash
# Build OSRM graphs for car / bike / foot profiles.
#
# Usage:
#   ./build-graph.sh [car|bike|foot|all] [pbf_path]
#
# Defaults:
#   profile  = all
#   pbf_path = /opt/trafico/tiles/build/iberia.osm.pbf
#
# Output:
#   /opt/trafico/osrm/{car,bike,foot}/graph.osrm[.*]
#
# Runtime:
#   car  ~12 min, bike ~8 min, foot ~6 min on Hetzner AX101 (32C/128GB).
#   RAM needed: ~16 GB peak (extract stage).
#
# Dependencies:
#   Docker (uses osrm-backend image), iberia.osm.pbf.
#   This script is idempotent — re-running overwrites existing graphs.

set -euo pipefail

PROFILE="${1:-all}"
PBF="${2:-/opt/trafico/tiles/build/iberia.osm.pbf}"
OUT_BASE="/opt/trafico/osrm"
IMAGE="ghcr.io/project-osrm/osrm-backend:v5.27.1"

if [[ ! -f "$PBF" ]]; then
  echo "ERROR: OSM PBF not found at $PBF" >&2
  echo "Hint: download with 'curl -LO https://download.geofabrik.de/europe/spain-latest.osm.pbf'" >&2
  exit 1
fi

build_one() {
  local profile="$1"
  local out_dir="$OUT_BASE/$profile"
  local osrm_name=$profile; [ "$profile" = "bike" ] && osrm_name=bicycle; [ "$profile" = "foot" ] && osrm_name=foot; local lua_path="/opt/${osrm_name}.lua"

  if [[ -f "/opt/trafico/osrm/profiles/$profile.lua" ]]; then
    lua_path="/profiles/$profile.lua"
  fi

  echo "[osrm-build] profile=$profile out=$out_dir lua=$lua_path"
  mkdir -p "$out_dir"
  cp -f "$PBF" "$out_dir/graph.osm.pbf"

  docker run --rm -t \
    -v "$out_dir":/data \
    -v /opt/trafico/osrm/profiles:/profiles:ro \
    "$IMAGE" \
    osrm-extract -p "$lua_path" /data/graph.osm.pbf

  docker run --rm -t \
    -v "$out_dir":/data \
    "$IMAGE" \
    osrm-partition /data/graph.osrm

  docker run --rm -t \
    -v "$out_dir":/data \
    "$IMAGE" \
    osrm-customize /data/graph.osrm

  rm -f "$out_dir/graph.osm.pbf"
  echo "[osrm-build] profile=$profile done (size: $(du -sh "$out_dir" | cut -f1))"
}

case "$PROFILE" in
  car | bike | foot) build_one "$PROFILE" ;;
  all)
    build_one car
    build_one bike
    build_one foot
    ;;
  *)
    echo "ERROR: unknown profile '$PROFILE' — must be one of car, bike, foot, all" >&2
    exit 1
    ;;
esac

echo "[osrm-build] all done. Restart containers:"
echo "  cd services/osrm && docker compose restart"

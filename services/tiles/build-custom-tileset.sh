#!/bin/bash
# Build custom vector tileset for trafico.live from OpenStreetMap.
#
# Modes:
#   --iberia (default)      Spain + Portugal → trafico-iberia.pmtiles (~2 GB, 15-30 min)
#   --planet                Whole planet    → trafico-planet.pmtiles  (~90-100 GB, 4-8 h)
#
# Sub-commands:
#   --download-only         Only fetch PBFs + Planetiler jar (no build)
#   --build-only            Only build tiles (expects PBFs present)
#   all (default)           Download + build
#
# Requirements:
#   iberia mode: Docker, ~10 GB free disk, ~8 GB RAM, 4+ cores.
#   planet mode: Docker, ~300 GB free disk, 64+ GB RAM, 16+ cores.
#
# Usage:
#   ./build-custom-tileset.sh                 # Iberia build, download+build
#   ./build-custom-tileset.sh --planet        # Planet build (full schema, maxzoom 14)
#   ./build-custom-tileset.sh --planet --build-only
set -euo pipefail

WORK_DIR="${WORK_DIR:-/opt/trafico/tiles/build}"
OUTPUT_DIR="${OUTPUT_DIR:-/opt/trafico/tiles/tiles}"
SCHEMA_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$WORK_DIR" "$OUTPUT_DIR"

# ─── Parse mode + sub-command ────────────────────────────────────────────────

MODE="iberia"
ACTION="all"
for arg in "$@"; do
  case "$arg" in
    --iberia)        MODE="iberia" ;;
    --planet)        MODE="planet" ;;
    --download-only) ACTION="download" ;;
    --build-only)    ACTION="build" ;;
    all)             ACTION="all" ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

# ─── Mode-specific config ────────────────────────────────────────────────────

SPAIN_PBF="$WORK_DIR/spain-latest.osm.pbf"
PORTUGAL_PBF="$WORK_DIR/portugal-latest.osm.pbf"
MERGED_PBF="$WORK_DIR/iberia.osm.pbf"
PLANET_PBF="$WORK_DIR/planet-latest.osm.pbf"
PLANETILER_JAR="$WORK_DIR/planetiler.jar"

if [ "$MODE" = "planet" ]; then
  INPUT_PBF="$PLANET_PBF"
  OUTPUT="$OUTPUT_DIR/trafico-planet.pmtiles"
  # Push compute: 60 of 64 cores. Leaves 4 for web + collectors + ssh.
  DEFAULT_THREADS=$(( $(nproc) - 4 ))
  THREADS="${THREADS:-$DEFAULT_THREADS}"
  # Planet build — stable profile after crash-loop investigation:
  #   --storage=ram is tempting but grew unbounded in Pass 2 and OOM'd three
  #   runs in a row. mmap is the right choice; the OS page cache (we leave
  #   >150 GB free) keeps the hot features in RAM anyway.
  #   Smaller heap (30g) frees RAM for page cache — counter-intuitive but
  #   mmap throughput is very sensitive to cache size.
  JAVA_HEAP="${JAVA_HEAP:-30g}"
  NODEMAP_TYPE="array"
  NODEMAP_STORAGE="mmap"
  FEATURE_STORAGE="mmap"
  PLANETILER_EXTRA_ARGS="${PLANETILER_EXTRA_ARGS:---parallel_tmp_io=true}"
  # No cgroup memory cap in planet mode: mmap'd page-cache usage counts toward
  # the cgroup limit, and the node cache + feature temp + page cache easily push
  # past 180 GB in Pass 2, triggering cgroup-level OOMkill mid-build. Trust the
  # host OOM killer instead — if anything ever has to die under pressure, its
  # oom_score will be highest for Planetiler anyway (biggest RSS).
  DOCKER_MEM_LIMIT=""
else
  INPUT_PBF="$MERGED_PBF"
  OUTPUT="$OUTPUT_DIR/trafico-iberia.pmtiles"
  THREADS="${THREADS:-$(( $(nproc) / 2 ))}"
  JAVA_HEAP="${JAVA_HEAP:-8g}"
  NODEMAP_TYPE="array"
  NODEMAP_STORAGE="ram"
  FEATURE_STORAGE="mmap"
  PLANETILER_EXTRA_ARGS="${PLANETILER_EXTRA_ARGS:-}"
  DOCKER_MEM_LIMIT="${DOCKER_MEM_LIMIT:-16g}"
fi

echo "=============================================="
echo " Custom Tileset Build — trafico.live"
echo "=============================================="
echo "Mode:      $MODE"
echo "Action:    $ACTION"
echo "Work dir:  $WORK_DIR"
echo "Output:    $OUTPUT"
echo "Threads:   $THREADS"
echo "Java heap: $JAVA_HEAP"
echo ""

# ─── Download OSM data ──────────────────────────────────────────────────────

download_planetiler() {
  if [ ! -f "$PLANETILER_JAR" ]; then
    echo "Downloading Planetiler..."
    wget -q --show-progress -O "$PLANETILER_JAR" \
      "https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar"
  fi
}

download_iberia() {
  echo "=== Downloading Iberia PBFs ==="

  if [ ! -f "$SPAIN_PBF" ] || [ "$(find "$SPAIN_PBF" -mtime +7 2>/dev/null)" ]; then
    echo "Downloading Spain PBF (~1.3 GB)..."
    wget -q --show-progress -O "$SPAIN_PBF" \
      "https://download.geofabrik.de/europe/spain-latest.osm.pbf"
  else
    echo "Spain PBF is fresh (< 7 days), skipping download"
  fi

  if [ ! -f "$PORTUGAL_PBF" ] || [ "$(find "$PORTUGAL_PBF" -mtime +7 2>/dev/null)" ]; then
    echo "Downloading Portugal PBF (~387 MB)..."
    wget -q --show-progress -O "$PORTUGAL_PBF" \
      "https://download.geofabrik.de/europe/portugal-latest.osm.pbf"
  else
    echo "Portugal PBF is fresh (< 7 days), skipping download"
  fi

  download_planetiler
  ls -lh "$SPAIN_PBF" "$PORTUGAL_PBF"
}

download_planet() {
  echo "=== Downloading planet PBF (~75 GB) ==="
  # Geofabrik mirror = daily updates, free, no auth. Typically 30-60 min on good bandwidth.
  if [ ! -f "$PLANET_PBF" ] || [ "$(find "$PLANET_PBF" -mtime +7 2>/dev/null)" ]; then
    echo "Downloading planet-latest.osm.pbf (can take 30-90 min)…"
    wget --continue --tries=5 --timeout=600 --show-progress \
      -O "$PLANET_PBF" \
      "https://planet.openstreetmap.org/pbf/planet-latest.osm.pbf"
  else
    echo "Planet PBF is fresh (< 7 days), skipping download"
  fi

  download_planetiler
  ls -lh "$PLANET_PBF"
}

# ─── Merge PBFs (iberia only) ────────────────────────────────────────────────

merge_pbfs() {
  [ "$MODE" = "iberia" ] || return 0
  echo ""
  echo "=== Merging Spain + Portugal PBFs ==="

  if [ ! -f "$MERGED_PBF" ] || [ "$SPAIN_PBF" -nt "$MERGED_PBF" ] || [ "$PORTUGAL_PBF" -nt "$MERGED_PBF" ]; then
    docker run --rm \
      -v "$WORK_DIR:/data" \
      ghcr.io/osmcode/osmium-tool \
      merge /data/spain-latest.osm.pbf /data/portugal-latest.osm.pbf \
      -o /data/iberia.osm.pbf --overwrite

    echo "Merged: $(ls -lh "$MERGED_PBF" | awk '{print $5}')"
  else
    echo "Merged PBF is up to date, skipping"
  fi
}

# ─── Build tiles with Planetiler ─────────────────────────────────────────────

build_tiles() {
  echo ""
  echo "=== Building vector tiles with Planetiler ($MODE) ==="
  if [ "$MODE" = "planet" ]; then
    echo "Planet build — expect 4-8 hours, ~90-100 GB output."
  else
    echo "Iberia build — expect 15-30 minutes, ~2 GB output."
  fi

  START=$(date +%s)
  IMAGE="ghcr.io/onthegomap/planetiler:latest"

  # Planetiler expects the schema YAML as the FIRST positional argument
  # (ConfiguredMapMain). --schema= flag is treated as a sample-name lookup and fails.
  # No CPU/IO throttling in planet mode — we want every free core. If the web or
  # collectors get CPU-starved we'd see it in load avg; even 60 threads keeps 4
  # cores spare on a 64-core box and the Linux scheduler handles the rest.
  # Build the --memory flag only if a cap is set (empty = no cgroup cap).
  MEM_FLAG=""
  [ -n "$DOCKER_MEM_LIMIT" ] && MEM_FLAG="--memory=$DOCKER_MEM_LIMIT"

  docker run --rm \
    $MEM_FLAG \
    --log-driver=json-file --log-opt max-size=10m --log-opt max-file=3 \
    -v "$WORK_DIR:/data" \
    -v "$OUTPUT_DIR:/output" \
    -v "$SCHEMA_DIR/trafico-schema.yml:/schema.yml:ro" \
    -e JAVA_TOOL_OPTIONS="-Xmx$JAVA_HEAP" \
    "$IMAGE" \
    /schema.yml \
    --osm-path="/data/$(basename "$INPUT_PBF")" \
    --output="/output/$(basename "$OUTPUT")" \
    --maxzoom=14 \
    --minzoom=0 \
    --force \
    --nodemap-type="$NODEMAP_TYPE" \
    --nodemap-storage="$NODEMAP_STORAGE" \
    --storage="$FEATURE_STORAGE" \
    --threads="$THREADS" \
    $PLANETILER_EXTRA_ARGS

  END=$(date +%s)
  ELAPSED=$(( END - START ))

  echo ""
  echo "Build complete in $(( ELAPSED / 60 ))m $(( ELAPSED % 60 ))s"
  echo "Output: $(ls -lh "$OUTPUT" | awk '{print $5}') — $OUTPUT"
}

# ─── Main ────────────────────────────────────────────────────────────────────

case "$ACTION" in
  download)
    if [ "$MODE" = "planet" ]; then download_planet; else download_iberia; merge_pbfs; fi
    ;;
  build)
    build_tiles
    ;;
  all|*)
    if [ "$MODE" = "planet" ]; then
      download_planet
      build_tiles
    else
      download_iberia
      merge_pbfs
      build_tiles
    fi
    ;;
esac

echo ""
echo "=============================================="
echo " Done!"
echo "=============================================="
echo ""
echo "Files in $OUTPUT_DIR:"
ls -lhS "$OUTPUT_DIR"/*.pmtiles 2>/dev/null | head -5

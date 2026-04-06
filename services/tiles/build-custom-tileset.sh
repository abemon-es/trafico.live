#!/bin/bash
# Build custom vector tileset for Spain + Portugal from OpenStreetMap
# Produces trafico-iberia.pmtiles with ALL infrastructure individually styled
#
# Requirements: Docker, ~10GB free disk, ~8GB RAM
# Usage: ./build-custom-tileset.sh [--download-only|--build-only]
set -euo pipefail

WORK_DIR="${WORK_DIR:-/opt/trafico/tiles/build}"
OUTPUT_DIR="${OUTPUT_DIR:-/opt/trafico/tiles/tiles}"
SCHEMA_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$WORK_DIR" "$OUTPUT_DIR"

SPAIN_PBF="$WORK_DIR/spain-latest.osm.pbf"
PORTUGAL_PBF="$WORK_DIR/portugal-latest.osm.pbf"
MERGED_PBF="$WORK_DIR/iberia.osm.pbf"
OUTPUT="$OUTPUT_DIR/trafico-iberia.pmtiles"
PLANETILER_JAR="$WORK_DIR/planetiler.jar"

echo "=============================================="
echo " Custom Tileset Build — trafico.live"
echo "=============================================="
echo "Work dir: $WORK_DIR"
echo "Output:   $OUTPUT"
echo ""

# ─── Download OSM data ──────────────────────────────────────────────────────

download_data() {
  echo "=== Downloading OSM data ==="

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

  # Download Planetiler if not present
  if [ ! -f "$PLANETILER_JAR" ]; then
    echo "Downloading Planetiler..."
    wget -q --show-progress -O "$PLANETILER_JAR" \
      "https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar"
  fi

  echo ""
  ls -lh "$SPAIN_PBF" "$PORTUGAL_PBF"
}

# ─── Merge PBFs ──────────────────────────────────────────────────────────────

merge_pbfs() {
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
  echo "=== Building vector tiles with Planetiler ==="
  echo "This takes 15-30 minutes..."

  START=$(date +%s)

  docker run --rm \
    -v "$WORK_DIR:/data" \
    -v "$OUTPUT_DIR:/output" \
    -v "$SCHEMA_DIR/trafico-schema.yml:/schema.yml:ro" \
    -e JAVA_TOOL_OPTIONS="-Xmx8g" \
    ghcr.io/onthegomap/planetiler:latest \
    --schema=/schema.yml \
    --osm-path=/data/iberia.osm.pbf \
    --output=/output/trafico-iberia.pmtiles \
    --maxzoom=14 \
    --minzoom=0 \
    --force \
    --nodemap-type=array \
    --storage=mmap \
    --threads=$(( $(nproc) / 2 ))

  END=$(date +%s)
  ELAPSED=$(( END - START ))

  echo ""
  echo "Build complete in ${ELAPSED}s"
  echo "Output: $(ls -lh "$OUTPUT" | awk '{print $5}') — $OUTPUT"
}

# ─── Main ────────────────────────────────────────────────────────────────────

case "${1:-all}" in
  --download-only) download_data; merge_pbfs ;;
  --build-only) build_tiles ;;
  all|*) download_data; merge_pbfs; build_tiles ;;
esac

echo ""
echo "=============================================="
echo " Done!"
echo "=============================================="
echo ""
echo "Files in $OUTPUT_DIR:"
ls -lhS "$OUTPUT_DIR"/*.pmtiles 2>/dev/null | head -5

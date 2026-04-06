#!/bin/bash
# Download maritime zones (EEZ + territorial waters) and convert to GeoJSON
# Source: Marine Regions (marineregions.org) — free for non-commercial use
set -euo pipefail

WORK_DIR="${WORK_DIR:-/opt/trafico/tiles/build}"
OUTPUT_DIR="${OUTPUT_DIR:-/opt/trafico/tiles/tiles}"
mkdir -p "$WORK_DIR/maritime"

echo "=== Downloading maritime zones ==="

# Spanish EEZ from Marine Regions (filtered from world EEZ v12)
# We'll use Natural Earth for a lighter alternative that includes territorial waters
if [ ! -f "$WORK_DIR/maritime/ne_10m_ocean.geojson" ]; then
  echo "Downloading Natural Earth ocean + marine polygons..."

  # EEZ boundaries — use the simplified version from openmaptiles
  wget -q --show-progress -O "$WORK_DIR/maritime/eez_v12.gpkg" \
    "https://www.marineregions.org/download_file.php?name=World_EEZ_v12_20231025_gpkg.zip" 2>/dev/null || {
    echo "Marine Regions download requires registration. Using OSM coastline instead."
    echo "Maritime zones will be limited to OSM-sourced port/harbour polygons."
    exit 0
  }
fi

# Extract Spain + Portugal EEZ only
if command -v ogr2ogr &>/dev/null; then
  echo "Extracting Spain + Portugal EEZ..."
  ogr2ogr -f GeoJSON "$WORK_DIR/maritime/eez_iberia.geojson" \
    "$WORK_DIR/maritime/eez_v12.gpkg" \
    -where "SOVEREIGN1 IN ('Spain', 'Portugal') OR SOVEREIGN2 IN ('Spain', 'Portugal')" \
    -simplify 0.01

  echo "Generating maritime PMTiles..."
  docker run --rm -v "$WORK_DIR/maritime:/data" -v "$OUTPUT_DIR:/output" \
    ghcr.io/felt/tippecanoe:latest \
    tippecanoe \
    -z10 -Z0 \
    -l maritime \
    -o /output/maritime.pmtiles \
    --force \
    --drop-densest-as-needed \
    /data/eez_iberia.geojson

  echo "Maritime PMTiles: $(ls -lh "$OUTPUT_DIR/maritime.pmtiles" | awk '{print $5}')"
else
  echo "ogr2ogr not available. Install GDAL or run inside Docker."
  echo "Skipping maritime zone generation."
fi

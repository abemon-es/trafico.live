#!/bin/bash
# Weekly rebuild of trafico-planet.pmtiles.
#
# Used by /etc/cron.d/trafico-planet-rebuild (Sunday 03:00 CEST).
#
# Why this exists separate from build-custom-tileset.sh:
# - We run Planetiler as a *native* systemd service (not in Docker). Attempts
#   to run it in Docker died mid-build with mysterious SIGTERMs. Running as
#   `java -jar` via systemd-run has been stable.
# - We keep the currently-served tileset while the new one builds, and
#   atomic-swap only when the new build completes successfully.
# - Requirements already installed on compute:
#     /usr/local/bin/java  → Temurin OpenJDK 21 (/opt/jdk-21)
#     /opt/trafico/tiles/build/planetiler.jar
#     /opt/trafico/services/tiles/trafico-schema.yml

set -euo pipefail

WORK_DIR="/opt/trafico/tiles/build"
OUTPUT_DIR="/opt/trafico/tiles/tiles"
SCHEMA="/opt/trafico/services/tiles/trafico-schema.yml"
PLANETILER_JAR="$WORK_DIR/planetiler.jar"
PBF="$WORK_DIR/planet-latest.osm.pbf"
OUTPUT_CURRENT="$OUTPUT_DIR/trafico-planet.pmtiles"
OUTPUT_NEW="$OUTPUT_DIR/trafico-planet.pmtiles.new"
LOGDIR="/opt/trafico/tiles/logs"
LOG="$LOGDIR/planet-build-$(date +%Y%m%d-%H%M).log"
SERVICE="trafico-planet-build-$(date +%Y%m%d-%H%M)"

mkdir -p "$LOGDIR" "$OUTPUT_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# ─── 1. Refresh the planet PBF ──────────────────────────────────────────────

log "Downloading fresh planet-latest.osm.pbf"
if ! wget --continue --tries=5 --timeout=600 --quiet \
  -O "$PBF" \
  "https://planet.openstreetmap.org/pbf/planet-latest.osm.pbf"; then
  log "ERROR: PBF download failed — aborting rebuild"
  exit 1
fi
PBF_SIZE=$(stat -c %s "$PBF")
if [ "$PBF_SIZE" -lt 70000000000 ]; then
  log "ERROR: PBF too small ($PBF_SIZE bytes) — probably a truncated download"
  exit 1
fi
log "PBF ready: $(du -h "$PBF" | awk '{print $1}')"

# ─── 2. Build new tileset to a temp file ────────────────────────────────────

log "Starting Planetiler via systemd-run (unit: $SERVICE)"

systemd-run \
  --unit="$SERVICE.service" \
  --collect \
  --slice=planet-build.slice \
  --wait \
  /bin/bash -c "
    cd $WORK_DIR && \
    exec java -Xmx30g -jar $PLANETILER_JAR \
      $SCHEMA \
      --osm-path=$PBF \
      --output=$OUTPUT_NEW \
      --maxzoom=14 --minzoom=0 \
      --force \
      --nodemap-type=array \
      --nodemap-storage=mmap \
      --storage=mmap \
      --threads=60 \
      --parallel_tmp_io=true \
      > $LOG 2>&1
  "

if [ ! -s "$OUTPUT_NEW" ]; then
  log "ERROR: Planetiler did not produce $OUTPUT_NEW — aborting swap"
  log "Tail of build log:"
  tail -20 "$LOG" || true
  exit 1
fi

NEW_SIZE=$(stat -c %s "$OUTPUT_NEW")
if [ "$NEW_SIZE" -lt 60000000000 ]; then
  log "ERROR: New pmtiles too small ($NEW_SIZE bytes) — aborting swap"
  exit 1
fi

# ─── 3. Atomic swap ─────────────────────────────────────────────────────────

log "Swap new tileset in: $NEW_SIZE bytes"
if [ -f "$OUTPUT_CURRENT" ]; then
  mv -f "$OUTPUT_CURRENT" "$OUTPUT_CURRENT.prev"
fi
mv -f "$OUTPUT_NEW" "$OUTPUT_CURRENT"

# Purge nginx cache for the PMTiles file so clients see the new tileset.
# Nginx serves /tiles/ directly from disk — no server-side cache, only
# Cloudflare's edge cache matters. Use the Cloudflare API if configured.
if [ -n "${CF_API_TOKEN:-}" ] && [ -n "${CF_ZONE_ID:-}" ]; then
  curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"files":["https://tiles.trafico.live/tiles/trafico-planet.pmtiles"]}' \
    >/dev/null
  log "Purged Cloudflare cache for trafico-planet.pmtiles"
fi

# Remove previous backup after successful swap
rm -f "$OUTPUT_CURRENT.prev"

# Keep last 4 build logs, drop the rest
find "$LOGDIR" -maxdepth 1 -name 'planet-build-*.log' -printf '%T@ %p\n' \
  | sort -nr | tail -n +5 | awk '{print $2}' | xargs -r rm -f

log "Weekly rebuild finished OK — $OUTPUT_CURRENT is $(du -h "$OUTPUT_CURRENT" | awk '{print $1}')"

#!/bin/sh
# Self-healing PMTiles generation wrapper.
# Installed as /opt/trafico/tiles/run-tiles-gen.sh (cron: /etc/cron.d/trafico-tiles).
#
# - 2026-06-12: the trafico-tiles-gen image kept getting pruned (no container
#   references it between cron runs), a 7-week silent outage in Apr-Jun and a
#   repeat 2 days after the rebuild. So: rebuild it if it's missing.
# - 2026-10-21: it was rebuilt *only* if missing, so a change to
#   generate-pmtiles.sh or Dockerfile.generate never reached the image. The
#   image now carries a hash of those two files as a label; a different hash
#   (or none) rebuilds it before the run.
#
# TILES_GEN_DRY_RUN=1 prints the decision and exits without building or running.
set -e
SRC=/opt/trafico/services/tiles
IMAGE=trafico-tiles-gen
LABEL=trafico.tiles.src-hash

HASH=$(cat "$SRC/Dockerfile.generate" "$SRC/generate-pmtiles.sh" | sha256sum | cut -c1-16)
CURRENT=$(docker image inspect "$IMAGE" -f "{{index .Config.Labels \"$LABEL\"}}" 2>/dev/null || true)

if [ "$CURRENT" != "$HASH" ]; then
  echo "[run-tiles-gen] $(date -Is) image hash '${CURRENT:-none}' != source $HASH - rebuilding from $SRC"
  [ -n "$TILES_GEN_DRY_RUN" ] && exit 0
  docker build -q --label "$LABEL=$HASH" -f "$SRC/Dockerfile.generate" -t "$IMAGE" "$SRC"
else
  [ -n "$TILES_GEN_DRY_RUN" ] && { echo "[run-tiles-gen] image up to date ($HASH)"; exit 0; }
fi
exec docker run --rm --env-file /opt/trafico/tiles/.env -v /opt/trafico/tiles/tiles:/data/tiles "$IMAGE" "$@"

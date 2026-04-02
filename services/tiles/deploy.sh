#!/bin/bash
# Deploy trafico.live tile server on hetzner-prod
#
# Prerequisites:
# - SSH access to hetzner-prod
# - spain-iberia.pmtiles extracted locally
# - Docker running on hetzner-prod
#
# Usage:
#   ./services/tiles/deploy.sh
#
# This script:
# 1. Uploads the PMTiles file to hetzner-prod
# 2. Builds and deploys the nginx tile server
# 3. Sets up tiles.trafico.live domain

set -euo pipefail

REMOTE="hetzner-prod"
REMOTE_DIR="/opt/trafico/tiles"
PMTILES_FILE="/tmp/spain-iberia.pmtiles"

echo "=== trafico.live tile server deployment ==="

# Check PMTiles file exists
if [ ! -f "$PMTILES_FILE" ]; then
  echo "ERROR: $PMTILES_FILE not found"
  echo "Run: pmtiles extract https://build.protomaps.com/YYYYMMDD.pmtiles $PMTILES_FILE --bbox='-18.2,27.5,4.5,43.9' --maxzoom=14"
  exit 1
fi

FILE_SIZE=$(du -h "$PMTILES_FILE" | cut -f1)
echo "PMTiles file: $PMTILES_FILE ($FILE_SIZE)"

# Create remote directory
echo "Creating remote directory..."
ssh "$REMOTE" "sudo mkdir -p $REMOTE_DIR/tiles $REMOTE_DIR/fonts $REMOTE_DIR/sprites"

# Upload PMTiles file
echo "Uploading PMTiles file ($FILE_SIZE)..."
rsync -avP "$PMTILES_FILE" "$REMOTE:$REMOTE_DIR/tiles/spain.pmtiles"

# Upload nginx config and Dockerfile
echo "Uploading service files..."
scp services/tiles/Dockerfile services/tiles/nginx.conf "$REMOTE:$REMOTE_DIR/"

# Build and run on remote
echo "Building and starting tile server..."
ssh "$REMOTE" "
  cd $REMOTE_DIR
  docker build -t trafico-tiles .
  docker stop trafico-tiles 2>/dev/null || true
  docker rm trafico-tiles 2>/dev/null || true
  docker run -d \
    --name trafico-tiles \
    --restart unless-stopped \
    -p 8088:80 \
    -v $REMOTE_DIR/tiles:/data/tiles:ro \
    trafico-tiles
  echo 'Tile server running on port 8088'
"

echo ""
echo "=== Done ==="
echo ""
echo "Next steps:"
echo "1. Add tiles.trafico.live DNS record pointing to hetzner-prod (168.119.34.248)"
echo "2. Configure Coolify/Traefik reverse proxy for tiles.trafico.live → localhost:8088"
echo "3. Verify: curl -I https://tiles.trafico.live/spain.pmtiles"
echo "4. Update src/lib/map-style.ts TILES_URL if domain is different"
